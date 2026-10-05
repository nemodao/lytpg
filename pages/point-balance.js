// Point Balance (spec §5, §16, §17): balance card, then three tabs: Available, Expired, History.
import { load } from '../shared/app.js';
import { mountNav } from '../shared/nav.js';
import { createDateFilter } from '../shared/date-filter.js';
import { appHeader, badge, balanceBlock, coin, notice } from '../shared/components.js';

const { common, page, ui } = await load('point-balance');
// Preview states can empty one tab (`page.empty.available|expired|history`) without touching the others.
const empty = page.empty || {};
// Pending lots only exist while there are pending points (`has-pending` state); they join the other lots here.
const items = [...page.pendingItems, ...page.items].filter((item) => {
  if (empty.available && ['earning', 'pending', 'active'].includes(item.status)) return false;
  if (empty.expired && item.status === 'expired') return false;
  return true;
});
const history = empty.history ? [] : page.history;
const app = document.getElementById('app');

// Preview aid: ?tab=available|expired|history opens a tab directly.
const TABS = ['available', 'expired', 'history'];
let tab = TABS.includes(new URLSearchParams(location.search).get('tab')) ? new URLSearchParams(location.search).get('tab') : 'available';

const source = (item) => ui.t(`pb.source.${item.source}`);

// Lots that expired with points still unspent. Fully used lots appear in neither list; only History records them (spec §17).
const expiredLots = items.filter((item) => item.status === 'expired' && item.remaining > 0);
// Expired and History each keep their own time filter: last 7 days by default, like the Trading Task history.
const filters = { expired: createDateFilter(ui, common.now, 'expired'), history: createDateFilter(ui, common.now, 'history') };
if (new URLSearchParams(location.search).get('cal') === '1' && filters[tab]) filters[tab].openCalendar(); // preview aid

const amount = (label, points, strong) =>
  `<p class="amount t-label num ${strong ? '' : 'amount-label c-3'}"><span class="amount-label c-3">${label}</span> ${strong ? coin('coin--xs') : ''}${ui.num(points)}</p>`;

// One lot. Right side: "Earned 2,000" (lighter) over the figure that matters for this row, with the coin.
function itemRow(item) {
  const soon = item.status === 'active' && ui.daysUntil(item.expiresAt) <= common.program.expiryWarningDays;
  const view = {
    earning: () => ({ meta: ui.t('pb.item.earning.meta'), badge: badge('blue', ui.t('badge.earning')) }),
    pending: () => ({ meta: ui.t('pb.item.pending.meta', { date: ui.date(item.creditAt) }), badge: badge('yellow', ui.t('badge.pending')) }),
    active: () => ({ meta: ui.t('pb.item.active.meta', { date: ui.date(item.expiresAt) }), second: ui.t('pb.item.remain') }),
    expired: () => ({ meta: ui.t('pb.item.expired', { date: ui.date(item.expiresAt) }), second: ui.t('pb.item.expiredAmount') }),
  }[item.status]();
  return `
    <div class="list__row">
      <div class="grow stack stack--tight">
        <p class="t-label num">${source(item)} · ${ui.date(item.earnedOn)}</p>
        <p class="t-caption num ${soon ? 'expiring-soon' : 'c-3'}">${soon ? ui.icon('clock', 'icon--sm') : ''}${view.meta}</p>
      </div>
      <div class="list__end">
        ${view.second
          ? amount(ui.t('pb.item.earned'), item.total, false) + amount(view.second, item.remaining, true)
          : `<p class="amount t-label num">${coin('coin--xs')}${ui.num(item.total)}</p>${view.badge}`}
      </div>
    </div>`;
}

function availableTab() {
  // Earning and pending first, then active lots by soonest expiry. Everything is shown: no filter, no paging.
  const waiting = items.filter((item) => item.status === 'earning' || item.status === 'pending');
  const active = items.filter((item) => item.status === 'active').sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const current = [...waiting, ...active];
  if (!current.length) {
    // Nothing available: a plain line, no call to action (spec §27).
    return `<section class="card"><p class="t-body c-3 list-none">${ui.t('pb.noActive')}</p></section>`;
  }
  return `
    ${notice(ui, { icon: 'info', tone: 'neutral', text: ui.t('pb.note') })}
    <section class="card"><div class="list">${current.map(itemRow).join('')}</div></section>`;
}

function expiredTab() {
  const lots = expiredLots.filter((item) => filters.expired.includes(item.expiresAt)).sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
  return `
    ${filters.expired.chips()}
    <section class="card">
      ${lots.length ? `<div class="list">${lots.map(itemRow).join('')}</div>` : `<p class="t-body c-3 list-none">${ui.t('pb.expired.none')}</p>`}
    </section>`;
}

function historyRow(entry) {
  const label = {
    earned: () => ui.t('hist.earned', { date: ui.date(entry.date) }),
    earning: () => ui.t('hist.earning'),
    redeemed: () => ui.t('hist.redeemed'), // reward name: TODO in spec §8
    refunded: () => ui.t('hist.refunded'),
    expired: () => ui.t('hist.expired'),
    adjusted: () => ui.t('hist.adjusted'), // reason: TODO in spec §8
  }[entry.type]();
  return `
    <div class="list__row">
      <p class="t-label grow">${label}</p>
      <div class="list__end">
        <p class="t-label num ${entry.points > 0 ? 'points--plus' : ''}">${ui.signed(entry.points)}</p>
        ${entry.type === 'earning' ? badge('blue', ui.t('badge.earning')) : ''}
      </div>
    </div>`;
}

function historyTab() {
  // Group by date, newest first.
  const groups = new Map();
  history.filter((entry) => filters.history.includes(entry.date)).sort((a, b) => b.date.localeCompare(a.date)).forEach((entry) => {
    if (!groups.has(entry.date)) groups.set(entry.date, []);
    groups.get(entry.date).push(entry);
  });
  return `
    ${filters.history.chips()}
    ${groups.size ? [...groups].map(([date, entries]) => `
      <p class="group-title">${ui.isToday(date) ? ui.t('hist.today') : ui.date(date)}</p>
      <section class="card"><div class="list">${entries.map(historyRow).join('')}</div></section>`).join('')
      : `<section class="card"><p class="t-body c-3 list-none">${ui.t('pb.history.none')}</p></section>`}`;
}

function body() {
  const tabButton = (id, key) =>
    `<button class="tab" type="button" role="tab" aria-selected="${tab === id}" data-action="tab" data-tab="${id}">${ui.t(key)}</button>`;
  return `
    <div class="tabs" role="tablist">${tabButton('available', 'pb.tab.available')}${tabButton('expired', 'pb.tab.expired')}${tabButton('history', 'pb.tab.history')}</div>
    ${{ available: availableTab, expired: expiredTab, history: historyTab }[tab]()}`;
}

function render() {
  app.innerHTML = `
    ${appHeader(ui, { title: ui.t('pb.title') })}
    ${balanceBlock(ui, common, { card: true })}
    ${body()}
    ${filters.expired.sheet()}${filters.history.sheet()}`;
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  if (filters.expired.handle(target, event) || filters.history.handle(target, event)) { render(); return; }
  if (target.dataset.action === 'tab') tab = target.dataset.tab;
  else return;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  Object.values(filters).forEach((filter) => filter.close());
  render();
});

render();
mountNav(ui, common, 'points');
