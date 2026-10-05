// Coin Balance (spec §5, §16, §17, §36): balance card, then three tabs: Available, Expired, History.
import { load } from '../shared/app.js';
import { mountNav } from '../shared/nav.js';
import { createDateFilter } from '../shared/date-filter.js';
import { appHeader, badge, balanceBlock, coin, notice } from '../shared/components.js';

const { common, page, ui } = await load('point-balance');
// Preview states can empty one tab (`page.empty.available|expired|history`) without touching the others.
const empty = page.empty || {};
// Pending lots only exist while there are pending coins (`has-pending` state) and fully used lots only with the
// `has-used` state; both join the other lots here.
const items = [...page.pendingItems, ...page.usedItems, ...page.items];
// A lot is past its expiry once its expiry day has started (expiry is at 01:00 WIB).
const isPastExpiry = (item) => Boolean(item.expiresAt) && ui.daysUntil(item.expiresAt) <= 0;
// Available: pending, earning, active, plus fully used lots that have not expired yet.
const inAvailable = (item) => ['pending', 'earning', 'active'].includes(item.status) || (item.status === 'used' && !isPastExpiry(item));
// Expired: lots past their expiry, whether coins were left (`expired`) or everything was used first (`used`, shows 0).
const inExpired = (item) => item.status === 'expired' || (item.status === 'used' && isPastExpiry(item));
const availableLots = empty.available ? [] : items.filter(inAvailable);
const history = empty.history ? [] : page.history;
const app = document.getElementById('app');

// Preview aid: ?tab=available|expired|history opens a tab directly.
const TABS = ['available', 'expired', 'history'];
let tab = TABS.includes(new URLSearchParams(location.search).get('tab')) ? new URLSearchParams(location.search).get('tab') : 'available';

const source = (item) => ui.t(`pb.source.${item.source}`);

const expiredLots = empty.expired ? [] : items.filter(inExpired);
// Expired and History each keep their own time filter: last 7 days by default, like the Trading Task history.
const filters = { expired: createDateFilter(ui, common.now, 'expired'), history: createDateFilter(ui, common.now, 'history') };
if (new URLSearchParams(location.search).get('cal') === '1' && filters[tab]) filters[tab].openCalendar(); // preview aid

const amount = (label, points, strong) =>
  `<p class="amount t-label num ${strong ? '' : 'amount-label c-3'}"><span class="amount-label c-3">${label}</span> ${strong ? coin('coin--xs') : ''}${ui.num(points)}</p>`;

// One lot. Right side: "Earned 2,000" (lighter) over the figure that matters for this row, with the coin.
function itemRow(item) {
  // Fully used lots are never highlighted as expiring soon.
  const soon = item.status === 'active' && ui.daysUntil(item.expiresAt) <= common.program.expiryWarningDays;
  const used = item.status === 'used';
  const view = used ? usedView(item) : {
    earning: () => ({ meta: ui.t('pb.item.earning.meta'), badge: badge('blue', ui.t('badge.earning')) }),
    pending: () => ({ meta: ui.t('pb.item.pending.meta', { date: ui.date(item.creditAt) }), badge: badge('yellow', ui.t('badge.pending')) }),
    active: () => ({ meta: ui.t('pb.item.active.meta', { date: ui.date(item.expiresAt) }), second: ui.t('pb.item.remain') }),
    expired: () => ({ meta: ui.t('pb.item.expired', { date: ui.date(item.expiresAt) }), second: ui.t('pb.item.expiredAmount') }),
  }[item.status]();
  // A fully used lot still in Available is muted; once past expiry it shows like any expired lot, with 0 expired.
  const muted = used && !isPastExpiry(item);
  return `
    <div class="list__row ${muted ? 'list__row--muted' : ''}">
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

// A fully used lot: like an active lot (expiry, Earned over Remain 0) while it lasts, like an expired lot after.
const usedView = (item) => (isPastExpiry(item)
  ? { meta: ui.t('pb.item.expired', { date: ui.date(item.expiresAt) }), second: ui.t('pb.item.expiredAmount') }
  : { meta: ui.t('pb.item.active.meta', { date: ui.date(item.expiresAt) }), second: ui.t('pb.item.remain') });

function availableTab() {
  // Earning and pending first, then active lots by soonest expiry. Everything is shown: no filter, no paging.
  // Order: pending, earning, active (soonest expiry first), then the "Fully used" section (soonest expiry first).
  const bySoonest = (a, b) => a.expiresAt.localeCompare(b.expiresAt);
  const of = (status) => availableLots.filter((item) => item.status === status);
  const current = [...of('pending'), ...of('earning'), ...of('active').sort(bySoonest)];
  const usedUp = of('used').sort(bySoonest);
  const usedSection = usedUp.length ? `
    <p class="group-title">${ui.t('pb.fullyUsed')}</p>
    <section class="card"><div class="list">${usedUp.map(itemRow).join('')}</div></section>` : '';
  if (!current.length && !usedUp.length) {
    // Nothing available: a plain line, no call to action (spec §27).
    return `<section class="card"><p class="t-body c-3 list-none">${ui.t('pb.noActive')}</p></section>`;
  }
  return `
    ${notice(ui, { icon: 'info', tone: 'neutral', text: ui.t('pb.note') })}
    ${current.length ? `<section class="card"><div class="list">${current.map(itemRow).join('')}</div></section>` : `<section class="card"><p class="t-body c-3 list-none">${ui.t('pb.noActive')}</p></section>`}
    ${usedSection}`;
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
