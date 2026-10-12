// Trading Task (spec §4, §15): header, today's progress, account + rates + trade button, then rules and history as tabs.
import { load } from '../shared/app.js';
import { mountNav } from '../shared/nav.js';
import { createLiveFeed } from '../shared/live-feed.js';
import { createDateFilter } from '../shared/date-filter.js';
import { initTracking, trackView } from '../shared/tracking.js';
import { appHeader, badge, coin, joinPanel, notice, rateRangeLine, rulesList, showStatus } from '../shared/components.js';

const { common, page, ui } = await load('trading-task');
const { program, accounts } = common;
const { today, history } = page;

initTracking('earn', common);

const ended = program.ended;
const app = document.getElementById('app');

// Decorative sky behind the top of the page: diagonal light streaks. Positions come from a fixed seed, so the sky is
// the same on every load. Most streaks are faint; about 1 in 5 is a bright key streak with a glow.
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function streakField(count = 90) {
  const widths = ['s', 's', 's', 'm', 'm', 'l'];
  const streaks = Array.from({ length: count }, (_, index) => {
    const key = index % 5 === 0;
    const width = key ? 'm' : widths[Math.floor(rand() * widths.length)];
    const style = `left:${(rand() * 100).toFixed(1)}%;top:${(rand() * 55).toFixed(1)}%;height:${(25 + rand() * 45).toFixed(1)}%;opacity:${(key ? 0.75 + rand() * 0.25 : 0.12 + rand() * 0.23).toFixed(2)}`;
    return `<i class="streak streak--${width}" style="${style}"></i>`;
  });
  return `<div class="hero-bg" data-theme="dark" aria-hidden="true"><div class="streaks-fade"><div class="streaks">${streaks.join('')}</div></div></div>`;
}
const heroBg = streakField();

// The only piece of state that changes without a reload: which account is selected.
// API: `selectedAccountId` is the account the app currently trades with; changing it here is local to this page.
let selectedId = page.selectedAccountId;
let sheetOpen = false;
let termsOpen = false; // Terms & Conditions sheet
let nudged = false; // the join button's nudge plays on the first render only
// Rules and history share one card, switched by tabs; rules show first (spec §15).

// History filter (spec §15): last 7 days by default, last 30 days, or a custom range picked on a calendar.
const historyFilter = createDateFilter(ui, common.now, 'history');
if (new URLSearchParams(location.search).get('cal') === '1') historyFilter.openCalendar(); // preview aid

let tab = new URLSearchParams(location.search).get('tab') === 'history' ? 'history' : 'rules';

const account = (id) => accounts.find((item) => item.id === id) || accounts[0];
const accountName = (item) => ui.esc(item.id);
const eligibleBadge = (item) =>
  item.eligible ? badge('green', ui.t('badge.eligible')) : badge('neutral', ui.t('badge.notEligible'));

// The hero always keeps the sky and the cup; the Today card under the cup changes with the page state (spec §23).
// Ended: the programme is over, so the card carries that message instead of today's progress (no HOT badge).
const endedCard = () => `
  <section class="card card--blend blend-pale-theme hero-card hero-message">
    <span class="hero-card__sky" data-theme="dark" aria-hidden="true"></span>
    <span class="hero-message__icon">${ui.icon('info')}</span>
    <div class="stack stack--tight">
      <h2 class="t-body-strong">${ui.t('tt.ended.title')}</h2>
      <p class="t-body c-2">${ui.t('tt.ended.body')}</p>
    </div>
  </section>`;

const feed = createLiveFeed(ui, common);

// Not yet allowed to take part (KYC or first deposit missing): "How to start" in place of today's progress (spec §39).
const joinCard = () => `
  <section class="card card--blend blend-pale-theme hero-card">
    <span class="hero-card__sky" data-theme="dark" aria-hidden="true"></span>
    ${joinPanel(ui, common, { flat: true, nudged })}
  </section>`;

function progressCard() {
  if (program.joinRequirement) return joinCard();
  const hasTrades = today.lots > 0;
  // Same Today panel as the Dashboard's task card, laid flat on the blend card (spec §15).
  const foot = (icon, text) => `<div class="today__foot today__foot--icon num">${ui.icon(icon, 'icon--sm')}<span>${text}</span></div>`;
  // API: `today.status` decides the line. Lots and coins only rise once coins have arrived, so right after the first
  // trade of the day the card can read 0 lots and 0 coins while the status is already "earning".
  let footer;
  if (today.capped) { footer = foot('trophy', ui.t('task.capped')); trackView('loyalty_daily_cap_view'); }
  else if (today.status === 'earning') footer = foot('clock', ui.t('tt.status.earning'));
  else if (!hasTrades) footer = foot('chart', ui.t('tt.empty.body'));
  else if (today.status === 'credited') footer = foot('check', ui.t('tt.status.credited'));
  else footer = ''; // `pending` (delayed programmes): coins that are not credited yet are never shown (spec §41)
  return `
    <section class="card card--blend blend-pale-theme hero-card">
      <span class="hero-card__sky" data-theme="dark" aria-hidden="true"></span>
      <div class="today today--flat">
        <div class="today__label">
          <h2 class="t-body-strong grow">${ui.t('task.todayLabel')}</h2>
          <p class="t-caption blend-faint num">${ui.t('task.updateEvery', { minutes: program.creditWithinMinutes })}</p>
        </div>
        <div class="today__stats">
          <div><p class="t-caption c-3">${ui.t('task.traded')}</p><p class="today__value num">${ui.lots(today.lots)}<small>${ui.lotUnit(today.lots)}</small></p></div>
          <div><p class="t-caption c-3">${ui.t('task.earned')}</p><p class="today__value num">${coin('coin--sm')}${ui.num(today.points)}</p></div>
        </div>
        ${footer}
      </div>
      ${feed.html()}
    </section>`;
}

// Earning rates belong to a trading account (spec §42): the table shows the rates of the selected account.
// API: `accounts[].rates[]` = { type, value, ptsPerLot }, highest rate first, the catch-all row last, no zero rows.
//   type "symbol_group": value is one of RATE_GROUPS (label from copy key rate.<value>)
//   type "symbol": value is a symbol such as XAUUSD, shown as is
//   type "any": everything else; value is "other" or null, shown as "Others"
const RATE_GROUPS = ['forex', 'metal', 'energy', 'index', 'stocks', 'other'];
const rateLabel = (rate) => {
  if (rate.type === 'any' || rate.value == null) return ui.t('rate.other');
  if (rate.type === 'symbol_group' && RATE_GROUPS.includes(rate.value)) return ui.t(`rate.${rate.value}`);
  return ui.esc(rate.value); // a symbol, or a group this version does not know yet
};
const rateRow = (rate) => `
  <div class="list__row">
    <span class="grow t-label">${rateLabel(rate)}</span>
    <span class="rate num c-2">${ui.tHtml('rate.value', { pts: ui.num(rate.ptsPerLot), coin: coin('coin--xs') })}</span>
  </div>`;

const ratesList = (item) => `<div class="list">${item.rates.map(rateRow).join('')}</div>`;

function accountsCard() {
  const rates = (item) => `
      <div class="stack stack--tight"><h3 class="t-label">${ui.t('tt.rates')}</h3><p class="t-body c-3">${ui.t('tt.rates.intro')}</p></div>
      <div class="rates-frame">${ratesList(item)}</div>
      <p class="t-caption c-3">${ui.t('tt.rates.note')}</p>`;
  // Users who still need KYC or a first deposit have no trading account, and so no rates table: the Today card
  // carries their rate range and their button (spec §39, §42).
  if (program.joinRequirement) return '';
  // Allowed to trade but no live account (only demo accounts, or the live one was removed): nothing to pick and no
  // rates table; a message, the programme's rate range and a button back to the app to open an account (spec §42).
  // API: `accounts` is empty and `selectedAccountId` is missing in this case.
  if (!accounts.length) {
    return `
    <section class="card">
      <div class="stack stack--tight">
        <h2 class="t-title-s">${ui.t('tt.accounts.label')}</h2>
        <p class="t-body c-3">${ui.t('tt.noAccount.body')}</p>
      </div>
      ${rateRangeLine(ui, common)}
      ${ended ? '' : `<button class="btn btn--primary btn--lg btn--block" type="button" data-intent="open-account" data-track="loyalty_open_account_click">${ui.t('tt.noAccount.cta')}</button>`}
    </section>`;
  }
  const selected = account(selectedId);
  const single = accounts.length === 1;
  const eligibleCount = accounts.filter((item) => item.eligible).length;

  const selector = single
    ? `<div class="select select--static"><span class="grow">${accountName(selected)}</span>${eligibleBadge(selected)}</div>`
    : `<button class="select" type="button" data-action="open-sheet" aria-haspopup="dialog"><span class="grow">${accountName(selected)}</span>${eligibleBadge(selected)}${ui.icon('down')}</button>`;
  return `
    <section class="card">
      <div class="stack stack--tight">
        <h2 class="t-title-s">${ui.t('tt.accounts.label')}</h2>
        ${single ? '' : `<p class="t-body c-3 num">${ui.t('tt.accounts.summary', { eligible: eligibleCount, total: accounts.length })}</p>`}
      </div>
      ${selector}
      ${selected.eligible
        ? rates(selected)
        : notice(ui, { icon: 'info', tone: 'warning', text: ui.t('tt.accounts.ineligible') })}
      ${tradeButton()}
    </section>`;
}

function tradeButton() {
  if (ended) return '';
  const selected = account(selectedId);
  if (!selected.eligible) {
    return `<button class="btn btn--primary btn--lg btn--block" type="button" data-action="open-sheet">${ui.t('tt.trade.switch')}</button>`;
  }
  // Capped: plain wording, nothing about earning points (spec §4 states).
  const label = today.capped ? ui.t('task.trade') : ui.t('tt.trade.account', { account: ui.esc(selected.id) });
  return `<button class="btn btn--primary btn--lg btn--block" type="button" data-intent="trade-account" data-account="${ui.esc(selected.id)}" data-track="loyalty_trade_click" data-track-capped="${today.capped}">${label}</button>`;
}


function historyList() {
  // API: `tradingTask/getHistory` days, newest first; today is one of them once it has coins arriving.
  // A day shows here only once coins have arrived for it: days still `pending` are left out (spec §41).
  const days = history.filter((day) => day.status !== 'pending');
  const statusBadge = { credited: badge('green', ui.t('badge.credited')), earning: badge('blue', ui.t('badge.earning')) };
  // One row per day, no per-deal breakdown. Lots and points sit in fixed columns so they line up down the list (spec §15).
  const row = (day) => `
    <div class="list__row">
      <div class="grow stack stack--tight">
        <div class="day__head">
          <p class="t-label num grow">${ui.isToday(day.date) ? ui.t('tt.history.today') : ui.dateYear(day.date)}</p>
          ${statusBadge[day.status]}
        </div>
        <div class="day__figures t-caption c-3 num">
          <span>${ui.lots(day.lots)} ${ui.lotUnit(day.lots)}</span>
          <span class="day__points">${coin('coin--xs')}${ui.num(day.points)}${day.capped ? `<span class="day__capped">${ui.t('badge.capped')}</span>` : ''}</span>
        </div>
      </div>
    </div>`;
  const shown = days.filter((day) => historyFilter.includes(day.date));
  return `
    ${historyFilter.chips()}
    ${shown.length
      ? `<div class="list">${shown.map(row).join('')}</div>`
      : `<p class="t-body c-3 list-none">${ui.t('tt.history.none')}</p>`}`;
}

function infoCard() {
  const tabButton = (id, key) =>
    `<button class="tab" type="button" role="tab" aria-selected="${tab === id}" data-action="tab" data-tab="${id}" data-track="loyalty_tab_click" data-track-tab="${id}">${ui.t(key)}</button>`;
  return `
    <section class="card">
      <div class="tabs" role="tablist">${tabButton('rules', 'tt.rules')}${tabButton('history', 'tt.history')}</div>
      ${tab === 'rules' ? rulesList(ui, common) + termsButton() : historyList()}
    </section>`;
}

// Terms & Conditions (spec §40): a text button after the rules opens the document in a bottom sheet.
// API: `program.termsUrl` (new field) is the document's address, served by the backend; null or missing hides the
// button. The document is a PDF (decided, spec §40). Check it in the real app: an in-app webview may not display a PDF
// inside an iframe (Android shows nothing). If so, draw it with a PDF viewer library inside `.doc`, or have the app
// open the PDF in its own viewer when the button is tapped.
const termsButton = () =>
  program.termsUrl
    ? `<button class="text-btn" type="button" data-action="open-terms" aria-haspopup="dialog" data-track="loyalty_terms_open">${ui.t('tt.terms')}${ui.icon('right', 'icon--sm')}</button>`
    : '';

function termsSheet() {
  return `
    <div class="scrim" data-action="close-sheet">
      <div class="sheet sheet--doc" role="dialog" aria-modal="true" aria-label="${ui.t('tt.terms')}">
        <span class="sheet__grab"></span>
        <div class="sheet__head">
          <h2 class="t-title-s grow">${ui.t('tt.terms')}</h2>
          <button class="header-action" type="button" data-action="close-terms" aria-label="${ui.t('common.close')}">${ui.icon('close')}</button>
        </div>
        <div class="doc" data-theme="light">
          <p class="doc__loading t-body c-3">${ui.t('tt.terms.loading')}</p>
          <iframe class="doc__frame" src="${ui.esc(program.termsUrl)}" title="${ui.t('tt.terms')}"></iframe>
        </div>
      </div>
    </div>`;
}

function sheet() {
  // Eligible accounts first (spec §4.3).
  const sorted = [...accounts].sort((a, b) => Number(b.eligible) - Number(a.eligible));
  return `
    <div class="scrim" data-action="close-sheet">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${ui.t('tt.accounts.sheet')}">
        <span class="sheet__grab"></span>
        <h2 class="t-title-s">${ui.t('tt.accounts.sheet')}</h2>
        <div>
          ${sorted.map((item) => `
            <button class="option ${item.eligible ? '' : 'option--muted'}" type="button" data-action="select-account" data-id="${ui.esc(item.id)}" data-track="loyalty_account_select" data-track-eligible="${item.eligible}">
              <span class="grow">${accountName(item)}</span>
              ${eligibleBadge(item)}
              <span class="radio ${item.id === selectedId ? 'radio--on' : ''}"></span>
            </button>`).join('')}
        </div>
      </div>
    </div>`;
}

function render() {
  app.innerHTML = `
    <div class="hero">
      ${heroBg}
      ${appHeader(ui, { title: ui.t('task.title') })}
      <div class="today-cup-wrap">
        <img class="today-cup" src="../assets/images/cups/purple-chart.webp" alt="">
        ${ended ? '' : '<img class="hero-hot" src="../assets/images/hot-badge.png" alt="">'}
      </div>
    </div>
    ${ended ? endedCard() : progressCard()}
    ${accountsCard()}
    ${infoCard()}
    ${sheetOpen ? sheet() : ''}
    ${termsOpen ? termsSheet() : ''}
    ${historyFilter.sheet()}`;
  feed.start(app);
  nudged = true;
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (historyFilter.handle(target, event)) { render(); return; }
  if (action === 'open-sheet') sheetOpen = true;
  else if (action === 'open-terms') termsOpen = true;
  else if (action === 'close-terms') termsOpen = false;
  else if (action === 'tab') tab = target.dataset.tab;
  else if (action === 'select-account') { selectedId = target.dataset.id; sheetOpen = false; }
  else if (action === 'close-sheet') {
    if (event.target !== target) return; // taps inside the sheet do not close it
    sheetOpen = false;
    termsOpen = false;
  } else return;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (sheetOpen || termsOpen || historyFilter.isOpen())) { sheetOpen = false; termsOpen = false; historyFilter.close(); render(); }
});

// Loading or failed to load: the header on its sky and a placeholder, nothing else (spec §44).
if (!showStatus(ui, common, app, `<div class="hero">${heroBg}${appHeader(ui, { title: ui.t('task.title') })}</div>`)) render();
mountNav(ui, common, 'earn');
