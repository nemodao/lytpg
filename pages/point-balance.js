// Coin Balance (spec §5, §16, §17, §36): balance card, then three tabs: Available, Expired, History.
import { load } from '../shared/app.js';
import { mountNav } from '../shared/nav.js';
import { createDateFilter } from '../shared/date-filter.js';
import { mountTour } from '../shared/tour.js';
import { initTracking, trackView } from '../shared/tracking.js';
import { appHeader, badge, balanceBlock, coin, loadMoreRow, mountJoinSheet, mountStoreLinks, notice, showStatus } from '../shared/components.js';

const { common, page, ui } = await load('point-balance');
// Preview states can empty one tab (`page.empty.available|expired|history`) without touching the others.
const empty = page.empty || {};
initTracking('coins', common);
// Fully used lots only exist with the `has-used` state; they join the other lots here. Coins that are not credited
// yet have no lot and are never shown (spec §41).
// API: one list of lots is enough. `usedItems` and `empty` exist only so preview states can add or remove groups of
// lots; with a real API send every lot in `items` and leave the other two empty/absent.
const items = [...(page.usedItems || []), ...page.items];
// API: each lot says which tab it belongs to (`list`): lots from `coin/listAvailable` are "available", lots from
// `coin/listExpired` are "expired". A fully used lot (`status: "used"`) can be in either.
const inAvailable = (item) => item.list === 'available';
const inExpired = (item) => item.list === 'expired';
const isPastExpiry = inExpired;
const availableLots = empty.available ? [] : items.filter(inAvailable);
const history = empty.history ? [] : page.history;
const app = document.getElementById('app');

// Preview aid: ?tab=available|expired|history opens a tab directly.
const TABS = ['available', 'expired', 'history'];
let tab = TABS.includes(new URLSearchParams(location.search).get('tab')) ? new URLSearchParams(location.search).get('tab') : 'available';

// `earnedOn` is the day the coins reached the balance (spec §43).
// Paging (spec §44): each tab shows PAGE_SIZE rows, and loads the next page when the user reaches the end of the list.
// API: `coin/listAvailable`, `coin/listExpired` and `coin/ledger` take pageNo / pageSize and return `total`. Ask for
// the next page when the end row comes into view, until the rows shown reach `total`. In this demo the full list is
// already in memory, so "loading" a page is a short wait (DEMO delay) and then more rows.
const PAGE_SIZE = 15;
const LOAD_DELAY_MS = 700; // DEMO: stands in for the request
const shown = { available: PAGE_SIZE, expired: PAGE_SIZE, history: PAGE_SIZE };
let loadFailed = Boolean(page.loadMoreError); // PREVIEW ONLY: the `more-error` state shows the failed-to-load row
// API: send this when a request for the next page fails (error_scope 'more'), as the preview does here.
if (loadFailed) trackView('loyalty_error_view', { error_scope: 'more' }, 'more');
const moreRow = (total) => (total > shown[tab] ? loadMoreRow(ui, loadFailed) : '');

const source = (item) => (['trading', 'daily_checkin', 'adjust'].includes(item.source) ? ui.t(`pb.source.${item.source}`) : ui.esc(item.source));

const expiredLots = empty.expired ? [] : items.filter(inExpired);
// Expired and History each keep their own time filter: last 7 days by default, like the Trading Task history.
const filters = { expired: createDateFilter(ui, common.now, 'expired'), history: createDateFilter(ui, common.now, 'history') };
if (new URLSearchParams(location.search).get('cal') === '1' && filters[tab]) filters[tab].openCalendar(); // preview aid

const amount = (label, points, strong) =>
  `<p class="amount t-label num ${strong ? '' : 'amount-label c-3'}"><span class="amount-label c-3">${label}</span> ${strong ? coin('coin--xs') : ''}${ui.num(points)}</p>`;

// One lot. Right side: "Earned 2,000" (lighter) over the figure that matters for this row, with the coin.
function itemRow(item) {
  // Fully used lots are never highlighted as expiring soon.
  const soon = item.status === 'active' && item.expiringSoon; // API: `expiringSoon` (expires within 10 days)
  const used = item.status === 'used';
  const view = used ? usedView(item) : {
    earning: () => ({ meta: ui.t('pb.item.earning.meta'), badge: badge('blue', ui.t('badge.earning')) }),
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
  // Order: earning, active (soonest expiry first), then the "Fully used" section (soonest expiry first).
  const bySoonest = (a, b) => a.expiresAt.localeCompare(b.expiresAt);
  const of = (status) => availableLots.filter((item) => item.status === status);
  const ordered = [...of('earning'), ...of('active').sort(bySoonest), ...of('used').sort(bySoonest)];
  const visible = ordered.slice(0, shown.available);
  const current = visible.filter((item) => item.status !== 'used');
  const usedUp = visible.filter((item) => item.status === 'used');
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
    ${usedSection}
    ${moreRow(ordered.length)}`;
}

function expiredTab() {
  const lots = expiredLots.filter((item) => filters.expired.includes(item.expiresAt)).sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
  return `
    ${filters.expired.chips()}
    <section class="card">
      ${lots.length ? `<div class="list">${lots.slice(0, shown.expired).map(itemRow).join('')}</div>` : `<p class="t-body c-3 list-none">${ui.t('pb.expired.none')}</p>`}
    </section>
    ${moreRow(lots.length)}`;
}

// One movement of the balance (spec §43). Every credit is its own row with its time: coins from trading arrive several
// times a day and are not merged.
// API: `coin/ledger` items = { happenedAt, date, type, source, points }. type: earn | consume | refund | expire |
// adjust_positive | adjust_negative. For `earn` the label is the source (trading, daily_checkin, adjust).
const SOURCES = ['trading', 'daily_checkin', 'adjust'];
function historyLabel(entry) {
  if (entry.type === 'earn') return SOURCES.includes(entry.source) ? ui.t(`pb.source.${entry.source}`) : ui.esc(entry.source);
  if (entry.type.startsWith('adjust')) return ui.t('hist.adjust');
  return ui.t(`hist.${entry.type}`); // consume, refund, expire
}
function historyRow(entry) {
  return `
    <div class="list__row">
      <p class="t-label grow">${historyLabel(entry)}<span class="hist-time num">${ui.time(entry.happenedAt)}</span></p>
      <p class="t-label num ${entry.points > 0 ? 'points--plus' : ''}">${ui.signed(entry.points)}</p>
    </div>`;
}

function historyTab() {
  // Grouped by day (`date` is the local day of `happenedAt`), newest first, rows inside a day newest first.
  const groups = new Map();
  const entries = history.filter((entry) => filters.history.includes(entry.date)).sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
  entries.slice(0, shown.history).forEach((entry) => {
    if (!groups.has(entry.date)) groups.set(entry.date, []);
    groups.get(entry.date).push(entry);
  });
  return `
    ${filters.history.chips()}
    ${groups.size ? [...groups].map(([date, entries]) => `
      <p class="group-title">${ui.isToday(date) ? ui.t('hist.today') : ui.date(date)}</p>
      <section class="card"><div class="list list--compact">${entries.map(historyRow).join('')}</div></section>`).join('')
      : `<section class="card"><p class="t-body c-3 list-none">${ui.t('pb.history.none')}</p></section>`}
    ${moreRow(entries.length)}`;
}

function body() {
  const tabButton = (id, key) =>
    `<button class="tab" type="button" role="tab" aria-selected="${tab === id}" data-action="tab" data-tab="${id}" data-track="loyalty_tab_click" data-track-tab="${id}">${ui.t(key)}</button>`;
  return `
    <div class="tabs" role="tablist" data-tour="tabs">${tabButton('available', 'pb.tab.available')}${tabButton('expired', 'pb.tab.expired')}${tabButton('history', 'pb.tab.history')}</div>
    ${{ available: availableTab, expired: expiredTab, history: historyTab }[tab]()}`;
}

// Guests (spec §53): balance 0 and an invitation to sign up or log in, in place of the tabs.
const guestCard = () => `
  <section class="card guest-card" data-tour="tabs">
    <span class="guest-card__art"><img src="../assets/images/home/coin-cup.webp" alt=""></span>
    <div class="stack stack--tight">
      <h2 class="t-title-s">${ui.t('guest.coins.title')}</h2>
      <p class="t-body c-3">${ui.t('guest.coins.body')}</p>
    </div>
    <button class="btn btn--primary btn--lg btn--block" type="button" data-intent="signup" data-track="loyalty_signup_click" data-track-source="card">${ui.t('join.signup')}</button>
    <button class="text-btn guest-card__login" type="button" data-intent="login" data-track="loyalty_login_click" data-track-source="card">${ui.md('join.login')}</button>
  </section>`;

function render() {
  if (common.guest) trackView('loyalty_join_card_view', { source: 'card' }, 'card'); // the sign-up card was seen
  app.innerHTML = `
    ${appHeader(ui, { title: ui.t('pb.title') })}
    ${balanceBlock(ui, common, { card: true, history: ui.href('redemptions.html') })}
    ${common.guest ? guestCard() : `${body()}${filters.expired.sheet()}${filters.history.sheet()}`}`;
  watchEnd();
}

// Load the next page when the end-of-list row scrolls into view.
let loading = false;
function loadMore() {
  if (loading) return;
  loading = true;
  loadFailed = false;
  setTimeout(() => { shown[tab] += PAGE_SIZE; loading = false; render(); }, LOAD_DELAY_MS);
}
function watchEnd() {
  const end = app.querySelector('[data-load-more]');
  if (!end) return;
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); loadMore(); }
  }).observe(end);
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  // A new range starts again from the first page.
  if (filters.expired.handle(target, event) || filters.history.handle(target, event)) { shown[tab] = PAGE_SIZE; render(); return; }
  if (target.dataset.action === 'load-more') { render(); loadMore(); return; }
  if (target.dataset.action === 'tab') tab = target.dataset.tab;
  else return;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  Object.values(filters).forEach((filter) => filter.close());
  render();
});

// Loading or failed to load: the header and a placeholder, nothing else (spec §44).
if (showStatus(ui, common, app, appHeader(ui, { title: ui.t('pb.title') }))) {
  mountNav(ui, common, 'points');
} else {
  render();
  mountNav(ui, common, 'points');
  mountJoinSheet(ui, common, app);
  mountStoreLinks(ui, app);
  mountTour(ui, common, 'point-balance');
}
