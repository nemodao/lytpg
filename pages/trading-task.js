// Trading Task (spec §4, §15): header, today's progress, account + rates + trade button, then rules and history as tabs.
import { load } from '../shared/app.js';
import { mountNav } from '../shared/nav.js';
import { createLiveFeed } from '../shared/live-feed.js';
import { createDateFilter } from '../shared/date-filter.js';
import { appHeader, badge, coin, joinIntent, joinLabel, notice, rulesList } from '../shared/components.js';

const { common, page, ui } = await load('trading-task');
const { program, accounts } = common;
const { today, history } = page;
const { rates } = common; // earning rates are shared data: the guided tour on Home reads them too

const ended = program.ended;
const inDay = program.creditMode === 'in-day';
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

function progressCard() {
  const hasTrades = today.lots > 0;
  // Same Today panel as the Dashboard's task card, laid flat on the blend card (spec §15).
  const foot = (icon, text) => `<div class="today__foot today__foot--icon num">${ui.icon(icon, 'icon--sm')}<span>${text}</span></div>`;
  let footer;
  if (today.capped) footer = foot('trophy', ui.t('task.capped'));
  else if (!hasTrades) footer = foot('chart', ui.t('tt.empty.body'));
  else if (today.status === 'credited') footer = foot('check', ui.t('tt.status.credited'));
  else footer = foot('clock', ui.t('tt.status.pending', { date: ui.date(today.creditAt), time: ui.time(today.creditAt), tz: ui.t('tz') }));
  return `
    <section class="card card--blend blend-pale-theme hero-card">
      <span class="hero-card__sky" data-theme="dark" aria-hidden="true"></span>
      <div class="today today--flat">
        <div class="today__label">
          <h2 class="t-body-strong grow">${ui.t('task.todayLabel')}</h2>
          <p class="t-caption blend-faint num">${ui.t('task.updateEvery', { minutes: program.refreshMinutes })}</p>
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

// Rates are set per symbol group only at this stage (spec §15).
const rateRow = (label, pts) => `
  <div class="list__row">
    <span class="grow t-label">${label}</span>
    <span class="rate num c-2">${ui.tHtml('rate.value', { pts, coin: coin('coin--xs') })}</span>
  </div>`;

const ratesList = () => `
  <div class="list">
    ${rates
      .filter((rate) => rate.ptsPerLot > 0)
      .map((rate) => rateRow(ui.t(`rate.${rate.group}`), rate.ptsPerLot))
      .join('')}
  </div>`;

function accountsCard() {
  const rates = (intro) => `
      <div class="stack stack--tight"><h3 class="t-label">${ui.t('tt.rates')}</h3><p class="t-body c-3">${intro}</p></div>
      <div class="rates-frame">${ratesList()}</div>
      <p class="t-caption c-3">${ui.t('tt.rates.note')}</p>`;
  // Users who still need KYC or a first deposit have no trading account yet: rates and the join button only (spec §26).
  if (joinLabel(ui, common)) {
    return `<section class="card">${rates(ui.t('tt.rates.introNoAccount'))}${tradeButton()}</section>`;
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
        ? rates(ui.t('tt.rates.intro'))
        : notice(ui, { icon: 'info', tone: 'warning', text: ui.t('tt.accounts.ineligible') })}
      ${tradeButton()}
    </section>`;
}

function tradeButton() {
  if (ended) return '';
  // Not yet allowed to take part: the button names the missing step instead (spec §25).
  const join = joinLabel(ui, common);
  if (join) return `<button class="btn btn--primary btn--lg btn--block" type="button" data-intent="${joinIntent(common)}">${join}</button>`;
  const selected = account(selectedId);
  if (!selected.eligible) {
    return `<button class="btn btn--primary btn--lg btn--block" type="button" data-action="open-sheet">${ui.t('tt.trade.switch')}</button>`;
  }
  // Capped: plain wording, nothing about earning points (spec §4 states).
  const label = today.capped ? ui.t('task.trade') : ui.t('tt.trade.account', { account: ui.esc(selected.id) });
  return `<button class="btn btn--primary btn--lg btn--block" type="button" data-intent="trade-account" data-account="${ui.esc(selected.id)}">${label}</button>`;
}


function historyList() {
  // In-day mode: today appears in the history as "Earning"; past days are all credited (spec §9).
  const days = history.map((day) => ({ ...day, status: inDay ? 'credited' : day.status }));
  if (inDay && today.lots > 0 && !ended) {
    days.unshift({ date: common.now, lots: today.lots, points: today.points, status: 'earning', capped: today.capped });
  }
  const statusBadge = { pending: badge('yellow', ui.t('badge.pending')), credited: badge('green', ui.t('badge.credited')), earning: badge('blue', ui.t('badge.earning')) };
  // One row per day, no per-deal breakdown. Lots and points sit in fixed columns so they line up down the list (spec §15).
  const row = (day) => `
    <div class="list__row">
      <div class="grow stack stack--tight">
        <div class="day__head">
          <p class="t-label num grow">${day.status === 'earning' ? ui.t('tt.history.today') : ui.dateYear(day.date)}</p>
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
    `<button class="tab" type="button" role="tab" aria-selected="${tab === id}" data-action="tab" data-tab="${id}">${ui.t(key)}</button>`;
  return `
    <section class="card">
      <div class="tabs" role="tablist">${tabButton('rules', 'tt.rules')}${tabButton('history', 'tt.history')}</div>
      ${tab === 'rules' ? rulesList(ui, common) : historyList()}
    </section>`;
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
            <button class="option ${item.eligible ? '' : 'option--muted'}" type="button" data-action="select-account" data-id="${ui.esc(item.id)}">
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
    ${historyFilter.sheet()}`;
  feed.start(app);
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (historyFilter.handle(target, event)) { render(); return; }
  if (action === 'open-sheet') sheetOpen = true;
  else if (action === 'tab') tab = target.dataset.tab;
  else if (action === 'select-account') { selectedId = target.dataset.id; sheetOpen = false; }
  else if (action === 'close-sheet') {
    if (event.target !== target) return; // taps inside the sheet do not close it
    sheetOpen = false;
  } else return;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (sheetOpen || historyFilter.isOpen())) { sheetOpen = false; historyFilter.close(); render(); }
});

render();
mountNav(ui, common, 'earn');
