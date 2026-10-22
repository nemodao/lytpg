// Reward Store (spec §59): a browse-only redemption store, opened from Loyalty's Redeem buttons. Two tabs on one page,
// switched by the store's own bottom bar: Home Store (banner and three picked sections) and Categories (`tab=rewards`: every reward, by
// category). A reward opens reward.html. The bar's Back returns to the Loyalty page the user came from (?back=).
// Events (spec §62, TRACKING.md): page view with `view` and `entry`; section views; category views; reward clicks;
// the bottom bar.
import { load } from '../shared/app.js';
import { coin } from '../shared/components.js';
import { STORE_CATEGORIES } from '../shared/api-adapter.js';
import { initTracking, priceRange, setPageParams, track, trackView } from '../shared/tracking.js';
import { backParam, categoryName, readEntry, rewardBadge, rewardHref, storeHead, withParams } from '../shared/store.js';

const { common, page, ui } = await load('store');
const entry = readEntry(); // before anything rewrites the address
const app = document.getElementById('app');
const query = new URLSearchParams(location.search);

// The only state that changes without a reload: the tab and, on Categories (`tab=rewards`), the category ('all', a
// category key or 'more') and the order of the list (`sort`, spec §63: 'default' = the catalog's order, or by coin
// price, 'price_asc' / 'price_desc'). All are kept in the address (history.replaceState), so a reward's Back returns to
// the same view. Only `tab`, `cat`, `sort` and `back` are rewritten; every other parameter of the address is kept.
let tab = query.get('tab') === 'rewards' ? 'rewards' : 'home';
let category = ['all', 'more', ...STORE_CATEGORIES].includes(query.get('cat')) ? query.get('cat') : 'all';
const SORTS = ['price_asc', 'price_desc'];
let sort = SORTS.includes(query.get('sort')) ? query.get('sort') : 'default';
const back = backParam() || ui.href('dashboard.html');
const selfHref = () => {
  const keep = new URLSearchParams(location.search);
  ['tab', 'cat', 'sort', 'back', 'via'].forEach((name) => keep.delete(name));
  const rest = keep.toString().replace(/%2C/g, ',');
  const onList = tab === 'rewards';
  return withParams(`store.html${rest ? `?${rest}` : ''}`, { tab: onList ? 'rewards' : '', cat: onList && category !== 'all' ? category : '', sort: onList && sort !== 'default' ? sort : '', back });
};
const rewards = page.rewards;
const viewName = () => (!rewards.length ? 'empty' : tab === 'home' ? 'home' : 'categories');
initTracking('store', common, { view: viewName(), entry });

// Reward taps (loyalty_reward_click): the reward, its place (`section`; on Categories `filter` = the chip), `position` in
// that place (from 1), `badge` = the label the user saw on that card, `affordable` for signed-in users only.
const trackAttrs = (item, position, section, filter) => [
  ['', 'loyalty_reward_click'], ['-section', section], ['-filter', filter], ['-position', position],
  ['-reward_id', item.id], ['-reward_name', item.name], ['-category', item.category || 'none'],
  ['-badge', section === 'popular' || section === 'list' ? item.badge || 'none' : 'none'],
  ['-price_range', priceRange(item.points)],
  ['-affordable', common.guest ? undefined : String(common.balance.available >= item.points)],
].filter(([, value]) => value !== undefined).map(([name, value]) => `data-track${name}="${ui.esc(value)}"`).join(' ');

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

// Reward pictures load lazily (loading="lazy"): Categories lists every reward, so only the ones near the screen are
// fetched (about 8 at first instead of all ~50); a row that scrolls sideways fetches the rest as it scrolls.
const price = (item) => `<span class="store-price num">${coin('coin--xs')}${ui.num(item.points)}</span>`;
const href = (item) => rewardHref(ui, item.id, selfHref());

// Square card: two per row on Categories, one scrolling row in Popular. The only card with the Hot / New label.
const card = (item, position, section, filter) => `
  <a class="card store-card" href="${href(item)}" ${trackAttrs(item, position, section, filter)}>
    <span class="store-card__art">${item.image ? `<img src="${ui.esc(item.image)}" alt="" loading="lazy" decoding="async">` : ''}${rewardBadge(ui, item)}</span>
    <span class="store-card__name">${ui.esc(item.name)}</span>
    ${price(item)}
  </a>`;

// Voucher: a ticket, one per row: the voucher's art on the left, a perforated edge, the price on the right.
const voucher = (item, index) => `
  <a class="voucher" href="${href(item)}" ${trackAttrs(item, index + 1, 'fnb')}>
    <span class="voucher__art">${item.image ? `<img src="${ui.esc(item.image)}" alt="" loading="lazy" decoding="async">` : ''}</span>
    <span class="voucher__body">
      <span class="voucher__kind">${ui.t('store.voucher')}</span>
      <span class="voucher__name">${ui.esc(item.name)}</span>
    </span>
    <span class="voucher__stub">${price(item)}</span>
  </a>`;

// Tour & Travel: its own promo panel (the tokens' purple blend with soft gold rays, a big outlined title and a frosted
// ribbon) holding a row of cards that scrolls sideways, about 1.7 on screen. Each card is a white card drawn slightly tilted (its top-left corner
// raised) over a purple layer showing at the bottom right; a diagonal "Special" sash crosses its picture's top-left
// corner (fixed in the front end, not from the API); the price is under the name. `See all` sits on the panel's
// bottom edge. The panel keeps its light colours in both themes (data-theme="light").
const trip = (item, index) => `
  <a class="trip-card" href="${href(item)}" ${trackAttrs(item, index + 1, 'travel')}>
    <span class="trip-card__art">${item.image ? `<img src="${ui.esc(item.image)}" alt="" loading="lazy" decoding="async">` : ''}<span class="trip-sash">${ui.t('store.special')}</span></span>
    <span class="trip-card__name">${ui.esc(item.name)}</span>
    ${price(item)}
  </a>`;
const tripPanel = (items) => `
  <section class="trip-promo blend-pink" data-theme="light" data-section="travel" data-count="${items.length}">
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
    ${popular.length ? `<section class="store-section" data-section="popular" data-count="${popular.length}">${sectionHead(ui.t('store.popular'), 'all')}<div class="store-row">${popular.map((item, index) => card(item, index + 1, 'popular')).join('')}</div></section>` : ''}
    ${fnb.length ? `<section class="store-section" data-section="fnb" data-count="${fnb.length}">${sectionHead(ui.t('store.fnb'), 'fnb_voucher')}<div class="voucher-list">${fnb.map(voucher).join('')}</div></section>` : ''}
    ${travel.length ? tripPanel(travel) : ''}`;
}

// ---- Rewards: category chips and the rewards of the chosen one ----

const chip = (key, label) =>
  `<button class="chip${key === 'more' ? ' chip--more' : ''}" type="button" data-action="category" data-cat="${key}" aria-pressed="${key === category}">${label}</button>`;

// Sort (spec §63): a round button at the right end of the chips row (it stays put while the chips scroll) opens a sheet
// with the two orders by price; tapping one applies it and closes the sheet, tapping the one already chosen takes it
// off (back to the catalog's order). The button is solid once the list is sorted by
// price, and off on "More categories" (no list there). Same coin price: the catalog's order.
const sortButton = () =>
  `<button class="store-sort${sort !== 'default' ? ' is-on' : ''}" type="button" data-action="open-sort" aria-label="${ui.t('store.sort.title')}"${category === 'more' ? ' disabled' : ''}>${ui.icon('sort')}</button>`;
const sorted = (list) => (sort === 'default' ? list : [...list].sort((a, b) => (sort === 'price_asc' ? a.points - b.points : b.points - a.points)));
const sortSheet = () => `
  <div class="scrim" data-sort-sheet data-action="close-sort">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${ui.t('store.sort.title')}">
      <span class="sheet__grab"></span>
      <h2 class="t-title-s">${ui.t('store.sort.title')}</h2>
      <div>
        ${SORTS.map((key) => `
          <button class="option" type="button" data-action="sort" data-sort="${key}" aria-pressed="${key === sort}">
            <span class="grow">${ui.t(`store.sort.${key}`)}</span>
            <span class="radio${key === sort ? ' radio--on' : ''}"></span>
          </button>`).join('')}
      </div>
    </div>
  </div>`;

// `icon`: a line icon's name, or 'clock' for the 3D clock picture (assets/images/store/clock.webp).
const noteCard = (title, body, icon) => `
  <div class="card store-note">
    ${icon === 'clock' ? '<img class="store-note__clock" src="../assets/images/store/clock.webp" alt="">' : `<span class="store-note__icon">${ui.icon(icon)}</span>`}
    <span class="stack stack--tight"><span class="t-body-strong">${title}</span><span class="t-caption c-2">${body}</span></span>
  </div>`;

function rewardsTab() {
  const chips = `<div class="store-filters"><div class="store-chips" role="group" aria-label="${ui.t('store.categories')}">${chip('all', ui.t('store.cat.all'))}${STORE_CATEGORIES.map((key) => chip(key, categoryName(ui, key))).join('')}${chip('more', ui.t('store.cat.more'))}</div>${sortButton()}</div>`;
  // "More categories": a centred card with the pile of rewards from the banner on top.
  if (category === 'more') {
    return `${chips}
      <div class="card store-note store-note--stacked">
        <img class="store-note__art" src="../assets/images/store/more-rewards.webp" alt="">
        <span class="stack stack--tight"><span class="t-body-strong">${ui.t('store.more.title')}</span><span class="t-caption c-2">${ui.t('store.more.body')}</span></span>
      </div>`;
  }
  const shown = sorted(category === 'all' ? rewards : rewards.filter((item) => item.category === category));
  return `${chips}
    ${shown.length ? `<div class="store-grid">${shown.map((item, index) => card(item, index + 1, 'list', category)).join('')}</div>` : ''}
    ${noteCard(ui.t('store.soon.title'), ui.t('store.soon.body'), 'clock')}`;
}

// ---- Page ----

// Section views (loyalty_store_section_view): once per section per page load, when the section's first card (Travel:
// its title) is half on screen. Watched again after each render, since a tab switch rebuilds the page.
let sectionObserver = null;
function watchSections() {
  sectionObserver?.disconnect();
  sectionObserver = new IntersectionObserver((entries) => entries.forEach((item) => {
    if (!item.isIntersecting) return;
    const section = item.target.closest('[data-section]');
    trackView('loyalty_store_section_view', { section: section.dataset.section, reward_count: section.dataset.count }, section.dataset.section);
    sectionObserver.unobserve(item.target);
  }), { threshold: 0.5 });
  app.querySelectorAll('[data-section]').forEach((section) => {
    const first = section.querySelector('.trip-promo__head, .store-row > *, .voucher-list > *');
    if (first) sectionObserver.observe(first);
  });
}

// Category views (loyalty_category_view): each time a list is shown. `from` says how: a chip or See all (sent on every
// change: a choice), or the Categories tab / the page opening on it (sent once per category per page load: the list
// was only shown).
let categoryFrom = 'page_load';
function trackCategory() {
  const params = { category, from: categoryFrom, reward_count: category === 'more' ? 0 : (category === 'all' ? rewards : rewards.filter((item) => item.category === category)).length };
  if (categoryFrom === 'chip' || categoryFrom === 'see_all') track('loyalty_category_view', params);
  else trackView('loyalty_category_view', params, `${categoryFrom}:${category}`);
}

function render({ quiet = false } = {}) {
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
  // The store's look (store.css): its background scrolls on Home Store and stays put on Categories.
  document.body.classList.add('store-look');
  document.body.classList.toggle('store-tab--home', tab === 'home' && !empty);
  document.body.classList.toggle('store-look--fixed', tab !== 'home' || empty);
  // Categories: the top bar scrolls away and the category chips stick to the top instead.
  document.body.classList.toggle('store-tab--rewards', tab === 'rewards' && !empty);
  if (tab === 'rewards') app.querySelector('.store-head')?.setAttribute('data-no-stick', '');
  nav.querySelectorAll('[data-tab]').forEach((button) => {
    const current = button.dataset.tab === tab;
    button.toggleAttribute('aria-current', current);
    if (current) button.setAttribute('aria-current', 'page');
    // Only a change of tab is tracked: the open tab has no data-track.
    if (current) button.removeAttribute('data-track');
    else button.setAttribute('data-track', 'loyalty_nav_click');
  });
  setPageParams({ view: viewName() });
  if (!empty && tab === 'rewards' && !quiet) trackCategory(); // quiet: only the order changed, the same list
  if (!empty && tab === 'home') watchSections();
  try { history.replaceState(null, '', selfHref()); } catch { /* some file:// viewers refuse it: the view still changes */ }
}

// The store's bottom bar: Back (to Loyalty) where Loyalty has its Close, then the two tabs. Tab artwork as on Loyalty's
// bar (shared/nav.js): assets/images/nav/<id>-light|dark|on.png; the tabs switch without a reload, so each tab holds all
// three and CSS shows the right one (store.css).
const navArt = (art, version, extraClass) => `<img class="nav__image ${extraClass}" src="../assets/images/nav/${art}-${version}.png" alt="">`;
const navTab = (tabId, art, label) => `
    <button class="nav__tab" type="button" data-tab="${tabId}" data-track-target="${tabId === 'home' ? 'store_home' : 'categories'}">
      <span class="nav__art">${navArt(art, 'light', 'nav__image--on-light store-nav__off')}${navArt(art, 'dark', 'nav__image--on-dark store-nav__off')}${navArt(art, 'on', 'store-nav__on')}</span>
      <span>${label}</span>
    </button>`;
const nav = document.createElement('nav');
nav.className = 'nav';
nav.setAttribute('aria-label', ui.t('store.tabs'));
nav.innerHTML = `
  <a class="nav__exit nav__back" href="${ui.esc(back)}" aria-label="${ui.t('store.back')}" data-track="loyalty_nav_click" data-track-target="back">${ui.icon('back')}</a>
  <div class="nav__tabs">
    ${navTab('home', 'store', ui.t('store.tab.home'))}
    ${navTab('rewards', 'rewards', ui.t('store.tab.rewards'))}
  </div>`;
document.body.appendChild(nav);
document.body.classList.add('has-nav');
nav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tab]');
  if (!button || button.dataset.tab === tab) return;
  tab = button.dataset.tab;
  categoryFrom = 'tab';
  render();
  window.scrollTo(0, 0);
});

// Categories: the chips row (with the sort button) is .is-stuck once it has reached the top (its band shows then;
// store.css).
let chipsFrame = 0;
const watchChips = () => {
  const bar = app.querySelector('.store-filters');
  if (bar) bar.classList.toggle('is-stuck', window.scrollY > 0 && bar.getBoundingClientRect().top <= 0);
};
addEventListener('scroll', () => { if (!chipsFrame) chipsFrame = requestAnimationFrame(() => { chipsFrame = 0; watchChips(); }); }, { passive: true });

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'see-all') { tab = 'rewards'; category = button.dataset.cat; categoryFrom = 'see_all'; app.querySelector('.store-chips')?.remove(); render(); window.scrollTo(0, 0); }
  if (button.dataset.action === 'category' && button.dataset.cat !== category) { category = button.dataset.cat; categoryFrom = 'chip'; render(); }
  if (button.dataset.action === 'open-sort') { closeSort(); app.insertAdjacentHTML('beforeend', sortSheet()); }
  if (button.dataset.action === 'close-sort' && event.target === button) closeSort(); // taps inside the sheet do not close it
  if (button.dataset.action === 'sort') {
    closeSort();
    // Scrolled down (the row stuck at the top): the new order is shown from its first reward, under the row.
    const stuck = app.querySelector('.store-filters')?.classList.contains('is-stuck');
    sort = button.dataset.sort === sort ? 'default' : button.dataset.sort;
    render({ quiet: true });
    const grid = app.querySelector('.store-grid');
    const bar = app.querySelector('.store-filters');
    if (stuck && grid && bar) window.scrollTo(0, grid.getBoundingClientRect().top + window.scrollY - bar.offsetHeight);
    watchChips();
  }
});
const closeSort = () => app.querySelector('[data-sort-sheet]')?.remove();
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSort(); });

render();
