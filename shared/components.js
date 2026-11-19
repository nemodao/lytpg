import { track, trackView } from './tracking.js';
import { TIERS, chosenAccountId, tierIndex } from './tiers.js';
import './bubble.js';
import './sheet.js';
import './rim.js';
import { refit } from './fit.js';

// Markup for components used on more than one page. Styles live in components.css.

// Point coin artwork. Decorative: the text around it carries the meaning.
export const coin = (sizeClass) => `<img class="coin ${sizeClass}" src="../assets/images/coin.png" alt="">`;

// "1.200 points expire within 10 days"
export const expiringText = (ui, common) =>
  ui.t('balance.expiring', { points: ui.num(common.balance.expiring.points), days: common.program.expiryWarningDays });

export const badge = (tone, label) => `<span class="badge badge--${tone}">${label}</span>`;

export const notice = (ui, { icon = 'info', tone = 'neutral', text }) =>
  `<div class="notice notice--${tone}">${ui.icon(icon)}<p>${text}</p></div>`;

// Header used on every page: the title is centred, the back button left and the page's button right (Loyalty's own,
// specs/loyalty.md). The tab pages have no back button: leaving the webview is the bottom bar's
// X (spec §29). `back` (a link) adds one on the left, for pages opened from a tab (Redemption history, spec §52).
// `action` is optional markup for the right edge (Home: the help button that reopens the tour).
export const appHeader = (ui, { title, action = '', back = '' }) => (requestAnimationFrame(watchHeader), `
  <header class="app-header">
    ${back ? `<a class="header-action" href="${back}" aria-label="${ui.t('orders.back')}" data-back>${ui.icon('back')}</a>` : ''}
    <h1><i class="app-header__pill"></i><span class="app-header__title">${title}</span></h1>
    ${action}
  </header>`);

// Sticky header (CSS .app-header; the Reward Store's .store-head, spec §59). One-line header on scroll (TOKENS 7.26b,
// centred): --p runs 0 to 1 over the first 40 of scroll (the title goes into its pill), --f over the first 12 (the fade
// under the status bar). .is-stuck stays for the store's header (a little hysteresis so it does not flicker at the
// threshold).
const HEADER_PILL_AT = 40; const HEADER_FADE_AT = 12;
// The title starts a third bigger, as long as that stays clear of the side buttons: --font-role-page (20) against the
// pill's --font-role-row (15). Change it, and the CSS default of --title-grow, with either token. A title already cut
// short at 15 does not grow.
const TITLE_GROW = 1 / 3;
function fitHeaderTitle(header) {
  const title = header.querySelector('.app-header__title');
  if (!title) return;
  const style = getComputedStyle(header);
  const room = header.clientWidth - 2 * (parseFloat(style.getPropertyValue('--size-header-button')) + parseFloat(style.columnGap));
  const grow = title.scrollWidth > title.clientWidth ? 0 : Math.max(0, Math.min(TITLE_GROW, room / title.scrollWidth - 1));
  header.style.setProperty('--title-grow', grow.toFixed(4));
}
// Measured again whenever a font finishes loading (Stolzl can land after the first fit) and when the screen turns.
const refitHeader = () => { const header = document.querySelector('.app-header'); if (header) fitHeaderTitle(header); };
document.fonts?.addEventListener('loadingdone', refitHeader);
addEventListener('resize', refitHeader);
const HEADER_STICK_AT = 8;
export function watchHeader() {
  const header = document.querySelector('.app-header, .store-head');
  if (!header) return;
  if ('noStick' in header.dataset) { header.classList.remove('is-stuck'); return; } // scrolls away (store Categories)
  if (header.matches('.app-header') && !header.style.getPropertyValue('--title-grow')) fitHeaderTitle(header);
  header.style.setProperty('--p', Math.min(1, window.scrollY / HEADER_PILL_AT).toFixed(3));
  header.style.setProperty('--f', Math.min(1, window.scrollY / HEADER_FADE_AT).toFixed(3));
  const stuck = header.classList.contains('is-stuck') ? window.scrollY > HEADER_STICK_AT / 2 : window.scrollY > HEADER_STICK_AT;
  header.classList.toggle('is-stuck', stuck);
}
let headerFrame = 0;
addEventListener('scroll', () => {
  if (!headerFrame) headerFrame = requestAnimationFrame(() => { headerFrame = 0; watchHeader(); });
}, { passive: true });

// Capsule tabs (Earn, Coins; TOKENS 8.3): a plain pill under the selected tab, no lens (the user, 19 Nov 2026: glass only
// on the bottom bar). The pages redraw on a tab change, so the pill is drawn first where the last selected tab was and
// then slides to the new one ("% / Price" switch motion, TOKENS 9.1 Menus; the curve is in components.css). A page that
// keeps its bar mounted only needs to move the pill. Measured on render and on resize only, never per frame.
const tabsLastAt = new Map(); // the bar's tabs (by data-tab) -> the index last selected
export function mountTabs(box) {
  const bar = box?.querySelector('.tabs');
  const pill = bar?.querySelector('.nav__sel');
  if (!pill) return;
  const tabs = [...bar.querySelectorAll('.tab')];
  const key = tabs.map((tab) => tab.dataset.tab).join();
  const at = Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
  const place = (index) => { pill.style.width = `${tabs[index].offsetWidth}px`; pill.style.transform = `translateX(${tabs[index].offsetLeft}px)`; };
  const from = tabsLastAt.get(key) ?? at;
  pill.style.transition = 'none';
  place(from);
  if (from !== at) { pill.getBoundingClientRect(); pill.style.transition = ''; place(at); } else pill.style.transition = '';
  tabsLastAt.set(key, at);
}
addEventListener('resize', () => document.querySelectorAll('.tabs-box').forEach((box) => mountTabs(box)));
document.fonts?.ready.then(() => document.querySelectorAll('.tabs-box').forEach((box) => mountTabs(box)));

// The logo loader in its chip (TOKENS 9.4): an action the user started and must wait for.
// API: the app is switching the trading account (`switchAccount`, the `trade-account` intent). Replaces the spinner in
// components/atoms/Button for that wait; presses are blocked by the dim.
export const waitChip = (ui) => `
  <div class="wait" role="status" aria-label="${ui.t('common.loading')}"><div class="wait__chip"><svg class="logo-loader" viewBox="-10 -10 196 214" aria-hidden="true">
    <defs><linearGradient id="logo-loader" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="176" y2="194"><stop offset="0" stop-color="var(--logo-stop-1)"/><stop offset=".5" stop-color="var(--logo-stop-2)"/><stop offset="1" stop-color="var(--logo-stop-3)"/></linearGradient></defs>
    <path fill="url(#logo-loader)" d="M45.2227 59.508C47.0181 51.4842 52.9337 44.98 60.8058 42.3586L81.2535 35.5658L71.5553 80.1374H109.297L123.2 16.0609L102.054 3.97201C92.7932 -1.324 81.3839 -1.324 72.1153 3.97201L14.954 36.6523C5.70079 41.9407 0 51.7197 0 62.2966V127.672C0 138.249 5.70079 148.021 14.954 153.317L23.8543 158.4L45.2227 59.508Z"/><path fill="url(#logo-loader)" d="M161.027 31.6607L152.291 26.396L130.995 130.727C129.197 139.202 123.274 146.071 115.391 148.84L94.9169 156.015L104.597 108.954H66.7828L52.8003 176.728L73.8125 189.401C83.0855 194.994 94.5097 194.994 103.79 189.401L161.027 154.891C170.292 149.306 176 138.977 176 127.805V58.7465C176 47.5751 170.292 37.2544 161.027 31.6607Z"/>
  </svg></div></div>`;

// Round help button for the header: reopens the guided tour.
export const tourButton = (ui) =>
  `<button class="header-action" type="button" data-tour-start aria-label="${ui.t('tour.open')}">${ui.icon('help')}</button>`;

// Users who must still pass KYC or make a first deposit (FTD) cannot earn yet. The Today card shows "How to start"
// instead of today's progress (joinPanel below), and the main button names the step they need.
// Returns null when the user can already take part.
// Guests (not signed in, spec §53) have one more step first: `signup` (button "Sign up", app screen /sign-up).
export const joinLabel = (ui, common) =>
  ({ signup: ui.t('join.signup'), kyc: ui.t('join.kyc'), deposit: ui.t('join.deposit') })[common.program.joinRequirement] || null;

// Which step the user must take before joining (`signup` | `kyc` | `deposit`), or null. Used as the button's
// data-intent.
export const joinIntent = (common) => common.program.joinRequirement || null;

// "How to start" (spec §39, §42): what the Today card shows on Home and Earn while the user still needs KYC or a first
// deposit. Three steps (the one to do now is bold, finished ones get a green check), a one-line summary of the earning
// rates, and the button for the current step. `flat` lays the steps straight on the card.
// Nudge: JOIN_NUDGE_AFTER seconds after the card appears, a finger (the tour's hand) comes in under the button and
// keeps tapping it; the button answers each tap as if pressed. `nudged` = the finger already came in (the page
// re-rendered): it is simply there and goes on tapping.
// API: `program.joinRequirement` ("kyc" | "deposit" | null) is not sent by the loyalty API. Derive it from the app's
// sign-in data: kycApproveTime = 0 -> "kyc"; kycApproveTime > 0 and firstDepositTime = 0 -> "deposit"; else null.
// The button carries data-intent "kyc" or "deposit": the host app attaches the KYC / Deposit deeplink.
// `source` says where the panel is shown: "card" (the Today card on Earn) or "redeem" (the sheet that Redeem opens,
// mountJoinSheet below); `from` (sheet only) names the button that opened the sheet. Both go with
// loyalty_join_card_view and with the panel's buttons (kyc / deposit / signup / login clicks), so a funnel can be
// followed from the button tapped to the step taken. The card's view is sent once per page load; the sheet's on every
// opening.
const JOIN_NUDGE_AFTER = 3;
// Guests see four steps, "Create your free account" first, and under the button "Already have an account? Log in"
// (intent `login`, app screen /login).
export function joinPanel(ui, common, { flat = false, nudged = false, source = 'card', from } = {}) {
  const { program } = common;
  const guest = program.joinRequirement === 'signup';
  const ids = guest ? ['signup', 'kyc', 'deposit', 'trade'] : ['kyc', 'deposit', 'trade'];
  const current = ids.indexOf(program.joinRequirement);
  if (source === 'redeem') track('loyalty_join_card_view', { source, from });
  else trackView('loyalty_join_card_view', { source }, source);
  const where = `data-track-source="${source}"${from ? ` data-track-from="${from}"` : ''}`;
  const steps = ids.map((id, index) => {
    const state = index < current ? 'done' : index === current ? 'current' : 'later';
    const mark = state === 'done' ? ui.icon('check', 'icon--sm') : index + 1;
    return `<li class="join__step join__step--${state}"${state === 'current' ? ' aria-current="step"' : ''}><span class="join__mark num">${mark}</span><span>${ui.t(`join.step.${id}${state === 'done' ? '.done' : ''}`)}</span></li>`;
  });
  return `
    <div class="today join${flat ? ' today--flat' : ''}">
      <h3 class="join__title">${ui.t('join.title')}</h3>
      <ol class="join__steps">${steps.join('')}</ol>
    </div>
    ${rateRangeLine(ui, common)}
    ${guest ? `<p class="t-caption c-2">${ui.t('join.ratesByAccount')}</p>` : ''}
    <div class="join__cta above${nudged ? ' join__cta--nudged' : ''}" style="--nudge-after:${JOIN_NUDGE_AFTER}s">
      <button class="btn btn--primary btn--lg btn--block" type="button" data-intent="${joinIntent(common)}" data-track="loyalty_${joinIntent(common)}_click" ${where}>${joinLabel(ui, common)}</button>
      <img class="join__finger" src="../assets/tour/finger.webp" alt="">
    </div>
    ${guest ? `<button class="text-btn join__login" type="button" data-intent="login" data-track="loyalty_login_click" ${where}>${ui.md('join.login')}</button>` : ''}`;
}

// Redeem buttons: the balance block's Redeem, every reward card, `Explore all rewards`, the empty Redemption history.
// `from` names the button (redeem | balance | reward | explore | history), sent with the "How to start" sheet's
// loyalty_join_card_view (and loyalty_login_prompt_view for guests) and with the buttons inside it.
// Two modes, by `common.rewardStore` (spec §61):
// - Off (default, spec §49): a user who still needs KYC or a first deposit gets the "How to start" sheet
//   (mountJoinSheet); everyone else the Tada intent (`redeem` = the store, `reward` = one reward).
// - On (Plan B, spec §59): Redeem and `Explore all rewards` open the in-webview Reward Store (store.html) and a reward
//   card that reward's page (reward.html), for everyone; mountStoreLinks does the navigation. Only a guest's balance
//   and `Redemption history` still open the sheet.
export const redeemAttrs = (common, intent, from = intent) => {
  const sheet = `data-action="join-sheet" data-from="${from}" aria-haspopup="dialog"`;
  if (!common.rewardStore) return joinIntent(common) ? sheet : `data-intent="${intent}"`;
  return ['balance', 'history'].includes(from) && joinIntent(common) ? sheet : `data-action="store" data-store="${intent}" data-from="${from}"`;
};

// Opens the store, or a reward's page, from a Loyalty page. `back` is this page with its query, so the store's Back
// returns here. `via` names the way in for the store's tracking (`entry`, spec §62): this page and the button,
// e.g. home_redeem, home_explore, home_reward, coins_redeem, orders_redeem; the store reads it once and removes it.
// A click whose default was prevented (e.g. by a test) does not navigate.
const PAGE_KEY = { 'dashboard.html': 'home', 'point-balance.html': 'coins', 'redemptions.html': 'orders' };
export function mountStoreLinks(ui, app) {
  app.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="store"]');
    if (!target || event.defaultPrevented) return;
    const back = location.pathname.split('/').pop() + location.search;
    const reward = target.dataset.store === 'reward' ? target.dataset.reward : null;
    const via = `${PAGE_KEY[location.pathname.split('/').pop()] ?? 'other'}_${target.dataset.from || target.dataset.store}`;
    const query = `${reward ? `id=${encodeURIComponent(reward)}&` : ''}back=${encodeURIComponent(back)}&via=${via}`;
    const href = ui.href(reward ? 'reward.html' : 'store.html');
    location.href = `${href}${href.includes('?') ? '&' : '?'}${query}`;
  });
}

// The sheet Redeem opens for those users: a title, one line on why, then "How to start" as on Earn (steps, rate line,
// the button for the current step with its tapping finger). The scrim, the close button and Esc close it.
// Call once per page, after the page's markup is in place; it does nothing for users who can already redeem.
// Guests (spec §53) get the same sheet as their sign-up prompt: own title and line, and loyalty_login_prompt_view with
// `from` (the button that opened it) each time it opens.
export function mountJoinSheet(ui, common, app) {
  if (!joinIntent(common)) return;
  const guest = common.program.joinRequirement === 'signup';
  const title = ui.t(guest ? 'redeemGate.guestTitle' : 'redeemGate.title');
  const close = () => app.querySelector('[data-join-sheet]')?.remove();
  const open = (from) => {
    close();
    if (guest) track('loyalty_login_prompt_view', { from });
    app.insertAdjacentHTML('beforeend', `
      <div class="scrim" data-join-sheet data-action="close-join-sheet">
        <div class="sheet sheet--join blend-pale-theme" role="dialog" aria-modal="true" aria-label="${title}">
          <span class="sheet__grab"></span>
          <div class="sheet__head">
            <h2 class="t-title-s grow">${title}</h2>
            <button class="header-action" type="button" data-action="close-join-sheet" aria-label="${ui.t('common.close')}">${ui.icon('close')}</button>
          </div>
          <p class="t-body c-2">${ui.t(guest ? 'redeemGate.guestBody' : 'redeemGate.body')}</p>
          ${joinPanel(ui, common, { flat: true, source: 'redeem', from })}
        </div>
      </div>`);
  };
  app.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="join-sheet"], [data-action="close-join-sheet"]');
    if (!target) return;
    // Opened after this click has been tracked, so loyalty_redeem_click / loyalty_reward_click comes before the view.
    if (target.dataset.action === 'join-sheet') { event.preventDefault(); setTimeout(() => open(target.dataset.from || 'redeem')); return; }
    if (target.classList.contains('scrim') && event.target !== target) return; // taps inside the sheet do not close it
    close();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

// "70–100 coins per lot · up to 2,000 a day": the programme's lowest and highest rate and its daily maximum. Shown to
// users who have no trading account, and so no rates table (spec §42).
// API: `program.rateRange` ({ min, max } or null) and `program.dailyMaxPoints` (number or null). Each half is left out
// when its value is missing; with neither, nothing is rendered.
export function rateRangeLine(ui, common) {
  const { rateRange, dailyMaxPoints } = common.program;
  const range = !rateRange ? ''
    : rateRange.min === rateRange.max ? ui.t('join.rates.single', { max: ui.num(rateRange.max) })
      : ui.t('join.rates', { min: ui.num(rateRange.min), max: ui.num(rateRange.max) });
  const cap = dailyMaxPoints ? ui.t('join.rates.cap', { max: ui.num(dailyMaxPoints) }) : '';
  if (!range && !cap) return '';
  return `<div class="join__rates num"><p class="grow">${range ? `<strong>${range}</strong>` : ''}${range && cap ? ' · ' : ''}${cap}</p></div>`;
}

// Page status (spec §44): what a page shows instead of its content while its data is on the way, or when it could not
// be loaded. `header` is the page's own header markup. Returns true when it took over the page.
// API: drive this from the real requests: "loading" from the moment a page opens until all of its requests have
// answered; "error" when any of them fails (no network, HTTP error, or a response without success = true). In this
// demo `common.view` is set by the `loading` and `error` preview states, and "Try again" simply reloads the page;
// with the API it repeats the page's requests.
// `scope` goes with loyalty_error_view as error_scope: 'page' (the page's data), or 'order' (one order, Redemption history).
// `skeleton` is the page's own shimmer, the same shapes as its content (TOKENS 9.4b).
// API: while `isWebviewSettled()` is false nothing is known about the user, Premium included: keep .is-unsettled on
// <html> so no brand colour shows, then the brand colour comes in.
export function showStatus(ui, common, app, header, scope = 'page', skeleton = '') {
  if (!common.view) return false;
  document.documentElement.classList.toggle('is-unsettled', common.view === 'loading');
  const bar = (size) => `<span class="skeleton__bar skeleton__bar--${size}"></span>`;
  const loading = `
    <div class="skeleton" role="status" aria-label="${ui.t('common.loading')}">
      <section class="card skeleton__card skeleton__card--row"><span class="skeleton__dot"></span><div class="grow stack stack--tight">${bar('s')}${bar('l')}</div></section>
      <section class="card skeleton__card">${bar('m')}${bar('full')}${bar('full')}${bar('l')}</section>
      <section class="card skeleton__card">${bar('m')}${bar('full')}${bar('l')}</section>
    </div>`;
  const error = `
    <section class="card page-error" role="alert">
      <span class="page-error__icon">${ui.icon('info')}</span>
      <div class="stack stack--tight">
        <h2 class="t-card">${ui.t('error.title')}</h2>
        <p class="t-note c-2">${ui.t('error.body')}</p>
      </div>
      <button class="btn btn--primary btn--lg btn--block" type="button" data-action="retry" data-track="loyalty_retry_click">${ui.t('common.retry')}</button>
    </section>`;
  app.innerHTML = header + (common.view === 'loading' ? (skeleton || loading) : error);
  if (common.view === 'error') trackView('loyalty_error_view', { error_scope: scope });
  app.addEventListener('click', (event) => { if (event.target.closest('[data-action="retry"]')) location.reload(); });
  return true;
}

// End of a paged list (spec §44): a spinner while the next page loads, or a retry line when it failed.
export const loadMoreRow = (ui, failed) => (failed
  ? `<p class="load-more t-caption c-3">${ui.t('common.loadMoreError')} <button class="text-btn" type="button" data-action="load-more">${ui.t('common.retry')}</button></p>`
  : `<p class="load-more t-caption c-3" data-load-more><span class="spinner" aria-hidden="true"></span>${ui.t('common.loadingMore')}</p>`);

// "How it works" rules. One list, shown in the Trading Task's How it works tab and in the guided tour (step 2):
// change it here and both change.
// API: the holding-time rule is left out when `program.minHoldSeconds` is 0 (no minimum), the daily-maximum rule when
// `program.dailyMaxPoints` is null, the expiry rule when `program.expiryDays` is null, and the crediting rule when
// `program.creditMode` is missing (no trading task: guests for now, spec §72).
export function rulesList(ui, common) {
  const { program } = common;
  const credit = program.creditMode === 'in-day' ? ui.md('rule.credit.inDay', { minutes: program.creditWithinMinutes })
    : program.creditMode === 'delayed' ? ui.md(program.creditDelayDays === 1 ? 'rule.credit.delayed.one' : 'rule.credit.delayed', { days: program.creditDelayDays })
      : '';
  return `
    <ul class="rules">
      ${program.minHoldSeconds > 0 ? `<li><span>${program.minHoldSeconds % 60 ? ui.md('rule.hold.seconds', { seconds: program.minHoldSeconds }) : ui.md(program.minHoldMinutes === 1 ? 'rule.hold.one' : 'rule.hold', { minutes: program.minHoldMinutes })}</span></li>` : ''}
      ${credit ? `<li><span>${credit}</span></li>` : ''}
      ${program.expiryDays != null ? `<li><span>${ui.md(program.expiryDays === 1 ? 'rule.expire.one' : 'rule.expire', { days: program.expiryDays })}</span></li>` : ''}
      <li><span>${ui.md('rule.reset', { time: program.resetTime, tz: ui.t('tz') })}</span></li>
      ${program.dailyMaxPoints ? `<li><span class="num">${ui.md('rule.max', { points: ui.num(program.dailyMaxPoints) })}</span></li>` : ''}
    </ul>`;
}

// Tier label next to "Coin Balance" on Home and Coins (spec §55): the tier of the account chosen for the session
// (shared/tiers.js: the one picked on Earn, else the eligible account on the highest tier). Shown only when Earn would
// show a tier for it: the user has a trading task, the programme runs, nothing is left to do before earning (no KYC or
// first deposit pending: Earn then shows no account at all), and that account is eligible and on one of the four
// tiers. Tapping it opens Earn on the account field (?focus=account).
// `edge` (Coins, where the balance sits in a card): the badge hangs on the card's top edge instead, its middle on the
// border, on the left above the coin; the line next to the label is too short there on a 375px screen.
function balanceTier(ui, common, edge = false) {
  const { accounts = [], program } = common;
  if (common.guest || program.tradingTask === false || program.ended || program.joinRequirement) return '';
  const id = chosenAccountId(accounts, common.selectedAccountId);
  const at = tierIndex(accounts.find((item) => item.id === id));
  if (at < 0) return '';
  const { key } = TIERS[at];
  const href = ui.href('trading-task.html');
  return `<a class="badge tier tier--${key} balance-tier ${edge ? 'balance-tier--edge' : 'above'}" href="${href}${href.includes('?') ? '&' : '?'}focus=account" aria-label="${ui.t('balance.tierLink', { tier: ui.t(`tier.${key}`) })}" data-track="loyalty_tier_badge_click" data-track-tier="${key}">${ui.t(`tier.${key}`)}</a>`;
}

// Fitting (the balance figure and its tier tag, the account field's number and tags, and the other §3.4 families) lives
// in fit.js (TOKENS §3.4): one ratio per element down to fit.floorRatio, then the element's alternate layout.
// Kept for the pages that call it: fit.js watches the page by itself, so this only fits again at once.
export function watchAccountTags(root) {
  root.querySelectorAll('.account-lines').forEach((lines) => refit(lines));
}

// Balance block: coin, label, number, Redeem button and the expiry warning. Coins that are not credited yet are never
// shown (spec §41), so the API's `pending` total is not used.
// Dashboard: bare on the page background, the whole block links to Point Balance (href).
// Point Balance: the same content inside a pale theme card (card: true).
// `history`: link of the "Redemption history" row at the foot of the card (Coins, spec §52).
export function balanceBlock(ui, common, { href = '', card = false, history = '' } = {}) {
  const { available, expiring } = common.balance;
  if (expiring) trackView('loyalty_expiring_notice_view');
  const tier = balanceTier(ui, common, card);
  return `
  <section class="balance card ${card ? 'card--soft' : ''}" data-tour="balance">
    ${card ? tier : ''}
    ${href ? (common.program.joinRequirement === 'signup'
      ? `<button class="card-link" type="button" ${redeemAttrs(common, 'redeem', 'balance')} aria-label="${ui.t('balance.title')}" data-track="loyalty_card_click" data-track-target="coins"></button>`
      : `<a class="card-link" href="${href}" aria-label="${ui.t('balance.title')}" data-track="loyalty_card_click" data-track-target="coins"></a>`) : ''}
    <div class="balance-row">
      ${coin('coin--lg')}
      <div class="grow">
        <p class="balance-label"><span>${ui.t('balance.title')}</span>${card ? '' : tier}</p>
        <p class="balance-number num">${ui.num(available)}</p>
      </div>
      <div class="balance-side">
        <button class="btn btn--sm btn--primary above" type="button" ${redeemAttrs(common, 'redeem')} data-tour="redeem" data-track="loyalty_redeem_click">${ui.t('balance.redeem')}</button>
      </div>
    </div>
    ${expiring ? `<div class="notice notice--warning">${ui.icon('alert')}<p class="num">${expiringText(ui, common)}</p></div>` : ''}
    ${history ? (common.program.joinRequirement === 'signup'
      ? `<button class="text-btn balance-history above" type="button" ${redeemAttrs(common, 'redeem', 'history')} data-track="loyalty_orders_open"><span>${ui.t('orders.button')}</span>${ui.icon('right', 'icon--sm')}</button>`
      : `<a class="text-btn balance-history above" href="${history}" data-track="loyalty_orders_open"><span>${ui.t('orders.button')}</span>${ui.icon('right', 'icon--sm')}</a>`) : ''}
  </section>`;
}

// "3,5 lots · 2.100 points"
export const lotsAndPoints = (ui, key, lots, points) =>
  ui.t(key, { lots: ui.lots(lots), lotUnit: ui.lotUnit(lots), points: ui.num(points) });
