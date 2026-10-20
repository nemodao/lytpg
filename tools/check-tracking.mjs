// Checks the event tracking against TRACKING.md by using the pages for real (Playwright) and reading window.dataLayer.
// Run it after any change to an event, a parameter or a page that sends events.
//
//   python3 -m http.server 8000                (in another terminal, from the project or package folder;
//                                               serve.py in the project does the same without caching)
//   npm install --no-save playwright@1.64.0     (once; node_modules/ is ignored by git)
//   node tools/check-tracking.mjs
//
// Options: BASE (default http://localhost:8000/pages/), PLAYWRIGHT_MODULE (path to an installed playwright module, when
// it is not in this folder's node_modules), CHROME_CHANNEL (default "chrome"; empty = Playwright's own Chromium).
//
// It fails when: an event is not in TRACKING.md; a value is not a string; an event parameter is not cleared on a push
// (GTM would carry it into later events); a view event repeats within one page load (except the sheet's
// loyalty_join_card_view, sent on every opening); personal data appears (8-digit account numbers); or one of the
// scenarios below does not send what it expects.
import { readFileSync } from 'node:fs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8000/pages/';
const CHANNEL = process.env.CHROME_CHANNEL ?? 'chrome';

const tracking = readFileSync(new URL('../TRACKING.md', import.meta.url), 'utf8');
const eventsPart = tracking.slice(tracking.indexOf('## Events'), tracking.indexOf('## Questions'));
const EVENTS = new Set([...eventsPart.matchAll(/^\| `(loyalty_[a-z_]+)` \|/gm)].map((match) => match[1]));
const source = readFileSync(new URL('../shared/tracking.js', import.meta.url), 'utf8');
const PARAMS = [...source.match(/const PARAMS = \[([\s\S]*?)\];/)[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
const REPEATABLE_VIEWS = new Set(['loyalty_join_card_view']); // the sheet's view is sent on every opening

const problems = [];
const fail = (where, text) => problems.push(`${where}: ${text}`);

// Rules every push must follow.
function checkPushes(where, pushes) {
  const views = new Map();
  for (const push of pushes) {
    const { event } = push;
    if (!EVENTS.has(event)) fail(where, `${event} is not in TRACKING.md`);
    for (const name of PARAMS) if (!(name in push)) fail(where, `${event}: parameter ${name} not cleared`);
    for (const [key, value] of Object.entries(push)) {
      if (value === undefined) continue;
      if (typeof value !== 'string') fail(where, `${event}.${key} is ${typeof value}, not a string`);
      else if (/^\d{8}$/.test(value)) fail(where, `${event}.${key} looks like an account number (${value})`);
    }
    if (event.endsWith('_view') && !REPEATABLE_VIEWS.has(event)) {
      const id = JSON.stringify(Object.entries(push).filter(([, value]) => value !== undefined));
      if (views.has(id)) fail(where, `${event} sent twice in one page load`);
      views.set(id, true);
    }
  }
}

// `expect`: events that must appear, in this order, each with at least these parameters (undefined = must be absent).
function expectEvents(where, pushes, expect) {
  let from = 0;
  for (const [event, params = {}] of expect) {
    const at = pushes.findIndex((push, index) => index >= from && push.event === event
      && Object.entries(params).every(([key, value]) => push[key] === value));
    if (at < 0) {
      const seen = pushes.filter((push) => push.event === event).map((push) => JSON.stringify(Object.fromEntries(Object.entries(push).filter(([key, value]) => value !== undefined && key !== 'event'))));
      fail(where, `expected ${event} ${JSON.stringify(params)}${seen.length ? `; got ${seen.join(' | ')}` : '; not sent'}`);
    } else from = at + 1;
  }
}

const browser = await chromium.launch(CHANNEL ? { channel: CHANNEL } : {});
async function run(name, path, steps = [], expect = [], { tour = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.on('pageerror', (error) => fail(name, `page error: ${error.message}`));
  await page.goto(BASE + path + (tour ? '' : `${path.includes('?') ? '&' : '?'}tour=off`));
  await page.waitForTimeout(900);
  for (const step of steps) {
    if (step === 'scroll') await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    else if (step === 'close') await page.evaluate(() => document.querySelector('[data-action^="close"]')?.click());
    else if (step === 'stay') await page.evaluate(() => document.addEventListener('click', (event) => event.preventDefault(), true)); // links do not navigate away
    else await page.evaluate((selector) => { const element = document.querySelector(selector); if (!element) throw new Error(`no ${selector}`); element.click(); }, step)
      .catch((error) => fail(name, error.message));
    await page.waitForTimeout(450);
  }
  const pushes = await page.evaluate(() => (window.dataLayer || []).filter((push) => typeof push.event === 'string' && push.event.startsWith('loyalty_')));
  checkPushes(name, pushes);
  expectEvents(name, pushes, expect);
  await page.close();
  return pushes;
}

// ---- Scenarios (mock data; see STATES.md)
const signedIn = { loyalty_tier: 'platinum' }; // the mock user's best eligible account is on Direct\MIVIP

await run('home', 'dashboard.html', ['scroll'], [
  ['loyalty_page_view', { page: 'home', has_task: 'true', ...signedIn }],
  ['loyalty_rewards_view', { reward_count: '9', has_earn_card: 'true' }],
]);
await run('home: positions count rewards only', 'dashboard.html', ['.reward-card:not(.reward-card--earn) ~ .reward-card:not(.reward-card--earn)'], [
  ['loyalty_reward_click', { position: '2', reward_id: '102', affordable: 'false' }], // costs more than the balance
]);
await run('home: no rewards', 'dashboard.html?state=rewards-empty', [], [['loyalty_rewards_view', { reward_count: '0', has_earn_card: 'false' }]]);
await run('home: gate sheet (needs KYC)', 'dashboard.html?state=needs-kyc', [
  '.reward-card[data-reward="101"]', '.sheet [data-intent="kyc"]', 'close', '[data-tour="redeem"]', '.sheet [data-intent="kyc"]',
], [
  ['loyalty_reward_click', { position: '1', reward_id: '101' }],
  ['loyalty_join_card_view', { source: 'redeem', from: 'reward', step: undefined }],
  ['loyalty_kyc_click', { source: 'redeem', from: 'reward' }],
  ['loyalty_redeem_click', { source: undefined, from: undefined }],
  ['loyalty_join_card_view', { source: 'redeem', from: 'redeem' }],
  ['loyalty_kyc_click', { source: 'redeem', from: 'redeem' }],
]);
await run('home: guest', 'dashboard.html?state=guest', ['.balance .card-link'], [
  ['loyalty_page_view', { join_step: 'signup', loyalty_tier: undefined }],
  ['loyalty_card_click', { target: 'coins' }],
  ['loyalty_login_prompt_view', { from: 'balance' }],
  ['loyalty_join_card_view', { source: 'redeem', from: 'balance' }],
]);
await run('home: tier label (highest tier by default)', 'dashboard.html', ['stay', '.balance-tier'], [
  ['loyalty_tier_badge_click', { tier: 'platinum', target: undefined }],
]);
await run('home: page error', 'dashboard.html?state=error', [], [['loyalty_error_view', { error_scope: 'page' }]]);
await run('home: tour', 'dashboard.html', [], [
  ['loyalty_tour_start', { trigger: 'auto', step_count: '5' }],
  ['loyalty_tour_step_view', { tour_step: '1', step_count: '5', step: undefined }],
], { tour: true });

await run('earn: opens on the highest tier', 'trading-task.html', [], [['loyalty_upgrade_row_view', { tier: 'platinum', next_tier: 'none' }]]);
await run('earn: tier sheet, then trade on Earn', 'trading-task.html', [
  '[data-action="open-sheet"]', '[data-action="select-account"][data-id="50000234"]', '[data-track="loyalty_upgrade_open"]', '.sheet [data-intent="deposit"]', 'close', '[data-track="loyalty_trade_click"]',
], [
  ['loyalty_upgrade_row_view', { tier: 'vip', next_tier: 'platinum' }],
  ['loyalty_upgrade_open', { tier: 'vip', next_tier: 'platinum' }],
  ['loyalty_deposit_click', { source: 'upgrade', tier: 'vip', next_tier: 'platinum' }],
  ['loyalty_trade_click', { source: undefined, tier: undefined }], // nothing carried over from the sheet
]);
await run('earn: Platinum sheet', 'trading-task.html?state=tier-top', ['[data-track="loyalty_upgrade_open"]', '.sheet [data-track="loyalty_trade_click"]'], [
  ['loyalty_upgrade_row_view', { tier: 'platinum', next_tier: 'none' }],
  ['loyalty_trade_click', { source: 'upgrade', tier: 'platinum', next_tier: 'none' }],
]);
await run('earn: How to start card', 'trading-task.html?state=needs-kyc', ['[data-intent="kyc"]'], [
  ['loyalty_join_card_view', { source: 'card', from: undefined }],
  ['loyalty_kyc_click', { source: 'card', from: undefined }],
]);

await run('coins: guest', 'point-balance.html?state=guest', ['.balance-history'], [
  ['loyalty_join_card_view', { source: 'card' }],
  ['loyalty_orders_open'],
  ['loyalty_login_prompt_view', { from: 'history' }],
]);
await run('coins: load more failed', 'point-balance.html?state=more-error', [], [['loyalty_error_view', { error_scope: 'more' }]]);

await run('orders: list', 'redemptions.html', [], [['loyalty_page_view', { page: 'orders', view: 'list' }]]);
await run('orders: empty', 'redemptions.html?state=orders-empty', [], [['loyalty_page_view', { page: 'orders', view: 'empty' }]]);
await run('orders: detail', 'redemptions.html?order=ord_7f3a91', ['[data-action="reveal"]', '[data-action="copy"][data-track-kind="code"]', '[data-intent="voucher"]'], [
  ['loyalty_page_view', { page: 'orders', view: 'detail' }],
  ['loyalty_code_reveal', { kind: 'code', item_type: 'egift', status: 'completed' }],
  ['loyalty_code_copy', { kind: 'code', item_type: 'egift', status: 'completed' }],
  ['loyalty_voucher_open', { item_type: 'egift', status: 'completed' }],
]);
await run('orders: unknown order', 'redemptions.html?order=nope', [], [['loyalty_error_view', { error_scope: 'order', view: 'detail' }]]);

await browser.close();
if (problems.length) {
  console.error(`Tracking check FAILED (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Tracking check passed: ${EVENTS.size} events in TRACKING.md, every scenario sent what it should.`);
