// Reward Store (spec §59): a browse-only redemption store, opened from Loyalty's Redeem buttons. Two tabs on one page,
// switched by the store's own bottom bar: Home Store (banner and three picked sections) and Rewards (every reward, by
// category). A reward opens reward.html. The bar's Back returns to the Loyalty page the user came from (?back=).
// No events yet (spec §59: a later round).
import { load } from '../shared/app.js';
import { coin } from '../shared/components.js';
import { STORE_CATEGORIES } from '../shared/api-adapter.js';
import { backParam, categoryName, rewardBadge, rewardHref, storeHead, withParams } from '../shared/store.js';

const { common, page, ui } = await load('store');
const app = document.getElementById('app');
const query = new URLSearchParams(location.search);

// The only state that changes without a reload: the tab and, on Rewards, the category ('all', a category key or
// 'more'). Both are kept in the address (history.replaceState), so a reward's Back returns to the same view.
let tab = query.get('tab') === 'rewards' ? 'rewards' : 'home';
let category = ['all', 'more', ...STORE_CATEGORIES].includes(query.get('cat')) ? query.get('cat') : 'all';
const back = backParam() || ui.href('dashboard.html');
const selfHref = () => withParams(ui.href('store.html'), { tab: tab === 'rewards' ? 'rewards' : '', cat: tab === 'rewards' && category !== 'all' ? category : '', back });
const rewards = page.rewards;

// ---- Home Store: three sections from the one list, no reward twice (spec §59) ----
// F&B first (its first 4 in the catalog's order), then Travel (its first 4), then Popular from the rest: rewards marked
// `hot` first, then one from each category in turn (rewards without a known category last), up to 8.
const SECTION_SIZE = { fnb_voucher: 4, tour_travel: 4, popular: 8 };
function arrange(list) {
  const used = new Set();
  const pick = (items) => { items.forEach((item) => used.add(item.id)); return items; };
  const fnb = pick(list.filter((item) => item.category === 'fnb_voucher').slice(0, SECTION_SIZE.fnb_voucher));
  const travel = pick(list.filter((item) => item.category === 'tour_travel').slice(0, SECTION_SIZE.tour_travel));
  const rest = list.filter((item) => !used.has(item.id));
  const popular = rest.filter((item) => item.badge === 'hot').slice(0, SECTION_SIZE.popular);
  const queues = [...STORE_CATEGORIES, null].map((key) => rest.filter((item) => (key ? item.category === key : !STORE_CATEGORIES.includes(item.category)) && !popular.includes(item)));
  while (popular.length < SECTION_SIZE.popular && queues.some((queue) => queue.length)) {
    for (const queue of queues) if (queue.length && popular.length < SECTION_SIZE.popular) popular.push(queue.shift());
  }
  return { popular, fnb, travel };
}

const price = (item) => `<span class="store-price num">${coin('coin--xs')}${ui.num(item.points)}</span>`;
const href = (item) => rewardHref(ui, item.id, selfHref());

// Square card: two per row on the Rewards tab, one scrolling row in Popular.
const card = (item) => `
  <a class="card store-card" href="${href(item)}">
    <span class="store-card__art">${item.image ? `<img src="${ui.esc(item.image)}" alt="">` : ''}${rewardBadge(ui, item)}</span>
    <span class="store-card__name">${ui.esc(item.name)}</span>
    ${price(item)}
  </a>`;

// Voucher: a ticket, one per row: the voucher's art on the left, a perforated edge, the price on the right.
const voucher = (item) => `
  <a class="voucher" href="${href(item)}">
    <span class="voucher__art">${item.image ? `<img src="${ui.esc(item.image)}" alt="">` : ''}</span>
    <span class="voucher__body">
      <span class="voucher__kind">${ui.t('store.voucher')}</span>
      <span class="voucher__name">${ui.esc(item.name)}</span>
    </span>
    <span class="voucher__stub">${price(item)}</span>
  </a>`;

// Tour & Travel: its own promo panel (lilac with light rays, a big outlined title and a dark ribbon) holding a row of
// cards that scrolls sideways, about 1.7 on screen. Each card is a white card drawn slightly tilted (its top-left corner
// raised) over a purple layer showing at the bottom right; a diagonal "Special" sash crosses its picture's top-left
// corner (fixed in the front end, not from the API); the price is under the name. `See all` sits on the panel's
// bottom edge. The panel keeps its light colours in both themes (data-theme="light").
const trip = (item) => `
  <a class="trip-card" href="${href(item)}">
    <span class="trip-card__art">${item.image ? `<img src="${ui.esc(item.image)}" alt="">` : ''}<span class="trip-sash">${ui.t('store.special')}</span></span>
    <span class="trip-card__name">${ui.esc(item.name)}</span>
    ${price(item)}
  </a>`;
const tripPanel = (items) => `
  <section class="trip-promo blend-pink" data-theme="light">
    <div class="trip-promo__head">
      <p class="trip-promo__title">${ui.t('store.travel')}</p>
      <p class="trip-promo__ribbon">${ui.t('store.travel.ribbon')}</p>
    </div>
    <div class="trip-promo__row">${items.map(trip).join('')}</div>
    <button class="trip-promo__more" type="button" data-action="see-all" data-cat="tour_travel">${ui.t('store.seeAll')}${ui.icon('right', 'icon--sm')}</button>
  </section>`;

const sectionHead = (title, cat) => `
  <div class="store-section__head">
    <h2 class="t-title-s">${title}</h2>
    <button class="text-btn" type="button" data-action="see-all" data-cat="${cat}">${ui.t('store.seeAll')}${ui.icon('right', 'icon--sm')}</button>
  </div>`;

function homeTab() {
  const { popular, fnb, travel } = arrange(rewards);
  return `
    <div class="store-banner">
      <img class="store-banner__img" src="../assets/images/store/banner.webp" alt="">
      <div class="store-banner__text"><p class="store-banner__title">${ui.t('store.banner.title')}</p><p class="store-banner__body">${ui.t('store.banner.body')}</p></div>
    </div>
    ${popular.length ? `<section class="store-section">${sectionHead(ui.t('store.popular'), 'all')}<div class="store-row">${popular.map(card).join('')}</div></section>` : ''}
    ${fnb.length ? `<section class="store-section">${sectionHead(ui.t('store.fnb'), 'fnb_voucher')}<div class="voucher-list">${fnb.map(voucher).join('')}</div></section>` : ''}
    ${travel.length ? tripPanel(travel) : ''}`;
}

// ---- Rewards: category chips and the rewards of the chosen one ----

const chip = (key, label) =>
  `<button class="chip${key === 'more' ? ' chip--more' : ''}" type="button" data-action="category" data-cat="${key}" aria-pressed="${key === category}">${label}</button>`;

const noteCard = (title, body, icon) => `
  <div class="card store-note">
    <span class="store-note__icon">${ui.icon(icon)}</span>
    <span class="stack stack--tight"><span class="t-body-strong">${title}</span><span class="t-caption c-2">${body}</span></span>
  </div>`;

function rewardsTab() {
  const chips = `<div class="store-chips" role="group" aria-label="${ui.t('store.categories')}">${chip('all', ui.t('store.cat.all'))}${STORE_CATEGORIES.map((key) => chip(key, categoryName(ui, key))).join('')}${chip('more', ui.t('store.cat.more'))}</div>`;
  if (category === 'more') return `${chips}${noteCard(ui.t('store.more.title'), ui.t('store.more.body'), 'star')}`;
  const shown = category === 'all' ? rewards : rewards.filter((item) => item.category === category);
  return `${chips}
    ${shown.length ? `<div class="store-grid">${shown.map(card).join('')}</div>` : ''}
    ${noteCard(ui.t('store.soon.title'), ui.t('store.soon.body'), 'clock')}`;
}

// ---- Page ----

function render() {
  const chipsScroll = app.querySelector('.store-chips')?.scrollLeft ?? null;
  const empty = !rewards.length;
  app.innerHTML = `
    ${storeHead(ui, common)}
    ${empty ? noteCard(ui.t('store.empty.title'), ui.t('store.empty.body'), 'gift') : tab === 'home' ? homeTab() : rewardsTab()}`;
  const chips = app.querySelector('.store-chips');
  if (chips) {
    if (chipsScroll != null) chips.scrollLeft = chipsScroll;
    else chips.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  document.body.classList.toggle('store-tab--home', tab === 'home' && !empty); // the Home Store look (store.css)
  nav.querySelectorAll('[data-tab]').forEach((button) => (button.dataset.tab === tab ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current')));
  try { history.replaceState(null, '', selfHref()); } catch { /* some file:// viewers refuse it: the view still changes */ }
}

// The store's bottom bar: Back (to Loyalty) where Loyalty has its Close, then the two tabs.
const nav = document.createElement('nav');
nav.className = 'nav';
nav.setAttribute('aria-label', ui.t('store.tabs'));
nav.innerHTML = `
  <a class="nav__exit nav__back" href="${ui.esc(back)}" aria-label="${ui.t('store.back')}">${ui.icon('back')}</a>
  <div class="nav__tabs">
    <button class="nav__tab" type="button" data-tab="home">${ui.icon('home', 'icon--lg')}<span>${ui.t('store.tab.home')}</span></button>
    <button class="nav__tab" type="button" data-tab="rewards">${ui.icon('gift', 'icon--lg')}<span>${ui.t('store.tab.rewards')}</span></button>
  </div>`;
document.body.appendChild(nav);
document.body.classList.add('has-nav');
nav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tab]');
  if (!button || button.dataset.tab === tab) return;
  tab = button.dataset.tab;
  render();
  window.scrollTo(0, 0);
});

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'see-all') { tab = 'rewards'; category = button.dataset.cat; app.querySelector('.store-chips')?.remove(); render(); window.scrollTo(0, 0); }
  if (button.dataset.action === 'category') { category = button.dataset.cat; render(); }
});

render();
