// Redemption history (spec §52): the user's reward orders, opened from Coins. Two views on one page: the list, and one
// order's details (?order=<orderReference>). No bottom bar; the header's back button goes to Coins from the list and to
// the list from an order.
import { load } from '../shared/app.js';
import { fetchMoreOrders, fetchOrder } from '../shared/data-source.js';
import { initTracking, trackView } from '../shared/tracking.js';
import { appHeader, badge, coin, loadMoreRow, mountJoinSheet, mountStoreLinks, notice, redeemAttrs, showStatus } from '../shared/components.js';

const { common, page, ui } = await load('redemptions');
// `view` goes with every event of this page: 'list' (orders to show), 'empty' (none yet) or 'detail' (one order).
initTracking('orders', common, { view: new URLSearchParams(location.search).get('order') ? 'detail' : page.orders.length ? 'list' : 'empty' });
const app = document.getElementById('app');
const ref = new URLSearchParams(location.search).get('order');

// Links within the page keep the theme and shared states (ui.href) and add the order.
const listHref = ui.href('redemptions.html');
const orderHref = (orderReference) => `${listHref}${listHref.includes('?') ? '&' : '?'}order=${encodeURIComponent(orderReference)}`;

// Status badge (spec §52). The backend sends one of ORDER_STATUSES; anything else shows as a grey badge with its text.
const STATUS_TONE = { new: 'blue', 'on process': 'yellow', completed: 'green', canceled: 'neutral', failed: 'red' };
const statusBadge = (status) => badge(STATUS_TONE[status] ?? 'neutral', STATUS_TONE[status] ? ui.t(`orders.status.${status}`) : ui.esc(status));
// No coin transaction yet (coinSpent null, spec §69): no amount.
const coins = (points) => (points == null ? '' : `<span class="order-coins num">${coin('coin--xs')}${ui.num(points)}</span>`);

// ---- List ----

const orderRow = (order) => `
  <a class="list__row order-row" href="${orderHref(order.orderReference)}" data-track="loyalty_order_open" data-track-status="${ui.esc(order.status)}">
    <span class="grow stack stack--tight">
      <span class="t-body-strong order-row__name">${ui.esc(order.firstItemName || ui.t('orders.type.other'))}</span>
      <span class="t-caption c-2 num">${ui.date(order.orderDate)}</span>
      <span class="t-caption c-3 num order-row__number">${ui.esc(order.orderNumber)}</span>
    </span>
    <span class="order-row__side">${statusBadge(order.status)}${coins(order.coinSpent)}</span>
  </a>`;

function listView() {
  const header = appHeader(ui, { title: ui.t('orders.title'), back: ui.href('point-balance.html') });
  if (!page.orders.length) {
    return `${header}
      <section class="card orders-empty">
        <span class="orders-empty__icon">${ui.icon('gift')}</span>
        <div class="stack stack--tight">
          <h2 class="t-title-s">${ui.t('orders.empty.title')}</h2>
          <p class="t-body c-3">${ui.t('orders.empty.body')}</p>
        </div>
        <button class="btn btn--primary btn--lg btn--block" type="button" ${redeemAttrs(common, 'redeem')} data-track="loyalty_redeem_click">${ui.t('orders.empty.cta')}</button>
      </section>`;
  }
  const more = page.orders.length < page.total ? loadMoreRow(ui, moreFailed) : '';
  return `${header}<section class="card"><div class="list">${page.orders.map(orderRow).join('')}</div></section>${more}`;
}

// Paging (spec §44, §52): the list asks for the next page when its end scrolls into view, until it holds `total`
// orders. A failed page shows "Couldn't load more. Try again".
let nextPage = 2;
let moreFailed = false;
let loadingMore = false;
async function loadMore() {
  if (loadingMore) return;
  loadingMore = true;
  moreFailed = false;
  try {
    const orders = await fetchMoreOrders(nextPage);
    nextPage += 1;
    page.orders.push(...orders);
    if (!orders.length) page.total = page.orders.length; // nothing more after all
  } catch { moreFailed = true; trackView('loyalty_error_view', { error_scope: 'more' }, 'more'); } // once per page load, as on Coins
  loadingMore = false;
  render();
}
function watchEnd() {
  const end = app.querySelector('[data-load-more]');
  if (!end) return;
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); setTimeout(loadMore, 600); }
  }).observe(end);
}

// ---- One order ----

// Codes, PINs and serial numbers arrive in clear but stay hidden until the user taps Show (spec §52); then they can be
// copied. `revealed` holds the keys shown so far ("<item>:code", "<item>:pin", "<item>:serial").
const revealed = new Set();
const values = new Map(); // key -> text, for Copy
// `about`: data-track attributes naming the item's kind and the order's status (item_type, status), for the Show, Copy
// and Open voucher events.
const ITEM_TYPES = ['egift', 'physical', 'pln', 'pulsa', 'ewallet'];
const about = (order, item) => `${item ? ` data-track-item_type="${ITEM_TYPES.includes(item.type) ? item.type : 'other'}"` : ''} data-track-status="${ui.esc(order.status)}"`;
function secret(key, kind, label, value, extra = '') {
  values.set(key, value);
  const shown = revealed.has(key);
  return `
    <div class="fact">
      <span class="t-caption c-3">${label}</span>
      <div class="fact__value">
        <span class="t-body-strong num secret${shown ? '' : ' secret--hidden'}">${shown ? ui.esc(value) : '••••••••'}</span>
        ${shown
          ? `<button class="text-btn" type="button" data-action="copy" data-key="${key}" data-track="loyalty_code_copy" data-track-kind="${kind}"${extra}>${ui.t('orders.copy')}</button>`
          : `<button class="text-btn" type="button" data-action="reveal" data-key="${key}" data-track="loyalty_code_reveal" data-track-kind="${kind}"${extra}>${ui.t('orders.show')}</button>`}
      </div>
    </div>`;
}
// A plain value that can be copied (order number, AWB number).
function copyable(key, kind, label, value, extra = '') {
  values.set(key, value);
  return `
    <div class="fact">
      <span class="t-caption c-3">${label}</span>
      <div class="fact__value">
        <span class="t-body-strong num">${ui.esc(value)}</span>
        <button class="text-btn" type="button" data-action="copy" data-key="${key}" data-track="loyalty_code_copy" data-track-kind="${kind}"${extra}>${ui.t('orders.copy')}</button>
      </div>
    </div>`;
}
const fact = (label, value) => `<div class="fact"><span class="t-caption c-3">${label}</span><span class="t-body-strong num">${value}</span></div>`;
const typeLabel = (type) => ui.t(ITEM_TYPES.includes(type) ? `orders.type.${type}` : 'orders.type.other');

// One item: name, kind, quantity, then the one block its kind carries (spec §52).
function itemCard(item, index, order) {
  const extra = about(order, item);
  let block = '';
  if (item.evoucher) {
    const { code, pin, link, expiredDate } = item.evoucher;
    block = `
      ${code ? secret(`${index}:code`, 'code', ui.t('orders.code'), code, extra) : ''}
      ${pin ? secret(`${index}:pin`, 'pin', ui.t('orders.pin'), pin, extra) : ''}
      ${expiredDate ? `<p class="t-caption c-3 num">${ui.t('orders.validUntil', { date: ui.date(expiredDate) })}</p>` : ''}
      ${link ? `<button class="btn btn--stroke btn--sm btn--block" type="button" data-intent="voucher" data-url="${ui.esc(link)}" data-track="loyalty_voucher_open"${extra}>${ui.t('orders.openVoucher')}${ui.icon('right', 'icon--sm')}</button>` : ''}`;
  } else if (item.token) {
    block = `
      ${item.token.serialNumber ? secret(`${index}:serial`, 'serial', ui.t('orders.serial'), item.token.serialNumber, extra) : ''}
      ${item.token.message ? `<p class="t-body c-2 num">${ui.esc(item.token.message)}</p>` : ''}`;
  } else if (item.tracking) {
    const { shippingCompany, awbNumber, trackingNumber } = item.tracking;
    block = `
      ${shippingCompany ? fact(ui.t('orders.courier'), ui.esc(shippingCompany)) : ''}
      ${awbNumber ? copyable(`${index}:awb`, 'awb', ui.t('orders.awb'), awbNumber, extra) : ''}
      ${trackingNumber ? fact(ui.t('orders.trackingNumber'), ui.esc(trackingNumber)) : ''}`;
  } else if (item.type === 'physical' && ['new', 'on process'].includes(order.status)) {
    block = `<p class="t-body c-3">${ui.t('orders.noTracking')}</p>`;
  }
  // The item's own status shows only when it differs from the order's.
  const own = item.status && item.status !== order.status ? statusBadge(item.status) : '';
  return `
    <section class="card order-item">
      <div class="order-item__head">
        <div class="grow stack stack--tight">
          <h3 class="t-body-strong">${ui.esc(item.name)}</h3>
          <p class="t-caption c-3 num">${typeLabel(item.type)} · ${ui.t('orders.qty', { n: ui.num(item.quantity) })}</p>
        </div>
        ${own}
      </div>
      ${block}
    </section>`;
}

function orderView(order) {
  const header = appHeader(ui, { title: ui.t('orders.detailTitle'), back: listHref });
  const title = order.items.length > 1 ? ui.t('orders.itemsCount', { n: order.items.length }) : ui.esc(order.items[0]?.name ?? '');
  return `${header}
    <section class="card order-head">
      <div class="order-head__status">${statusBadge(order.status)}${order.lastStatusAt ? `<span class="t-caption c-3 num">${ui.t('orders.updated', { date: ui.date(order.lastStatusAt), time: ui.time(order.lastStatusAt) })}</span>` : ''}</div>
      <h2 class="t-title-s">${title}</h2>
      ${order.refunded && order.coinSpent != null ? notice(ui, { icon: 'check', tone: 'success', text: ui.t('orders.refunded', { points: ui.num(order.coinSpent) }) }) : ''}
      <div class="facts">
        ${copyable('order', 'order', ui.t('orders.number'), order.orderNumber, about(order))}
        ${fact(ui.t('orders.date'), `${ui.date(order.orderDate)}, ${ui.time(order.orderDate)}`)}
        ${order.coinSpent == null ? '' : fact(ui.t('orders.coins'), coins(order.coinSpent))}
      </div>
    </section>
    <h2 class="group-title">${ui.t('orders.items')}</h2>
    ${order.items.map((item, index) => itemCard(item, index, order)).join('')}
    ${order.recipient ? `
      <section class="card">
        <h3 class="t-label">${ui.t('orders.recipient')}</h3>
        <p class="t-body num">${ui.esc(order.recipient.name)}<br>${ui.esc(order.recipient.address)}<br>${ui.esc(order.recipient.postalCode)}</p>
      </section>` : ''}
`;
}

// ---- Render ----

let order = null;
async function render() {
  app.innerHTML = ref ? orderView(order) : listView();
  if (!ref) watchEnd();
}

// Copy to the clipboard; the button reads "Copied" for a moment.
async function copy(button) {
  const text = values.get(button.dataset.key) ?? '';
  try { await navigator.clipboard.writeText(text); } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
  }
  button.textContent = ui.t('orders.copied');
  setTimeout(() => { button.textContent = ui.t('orders.copy'); }, 1500);
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'reveal') { revealed.add(target.dataset.key); render(); }
  else if (target.dataset.action === 'copy') copy(target);
  else if (target.dataset.action === 'load-more') loadMore();
});

// Loading or failed to load (spec §44); an unknown order (or one that is not the user's: 403) shows the error view.
const header = appHeader(ui, { title: ui.t(ref ? 'orders.detailTitle' : 'orders.title'), back: ref ? listHref : ui.href('point-balance.html') });
if (!showStatus(ui, common, app, header)) {
  if (ref) {
    order = await fetchOrder(ref).catch(() => null);
    if (!order) showStatus(ui, { ...common, view: 'error' }, app, header, 'order');
    else render();
  } else render();
  mountJoinSheet(ui, common, app);
  mountStoreLinks(ui, app);
}
