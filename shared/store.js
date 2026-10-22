// Pieces shared by the Reward Store (pages/store.js) and its reward page (pages/reward.js), spec §59.
// The store is browse-only for now: its rewards come from the same catalog API as Home's grid (toRewards), and
// Checkout only says that checkout is coming soon.
import { STORE_CATEGORIES } from './api-adapter.js';
import { coin, watchHeader } from './components.js';

// Where "back" goes. Every link into the store carries `back` (the page the user came from, with its query); the
// store passes its own address on to the reward page, so Back always returns one step.
export const backParam = () => new URLSearchParams(location.search).get('back');
export const withParams = (href, params) => {
  const query = Object.entries(params).filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return query ? `${href}${href.includes('?') ? '&' : '?'}${query}` : href;
};
export const rewardHref = (ui, id, back) => withParams(ui.href('reward.html'), { id, back });

// Top of both tabs (and of the reward page): the store's icon, "Reward Redemption" and the user's balance, small.
// The icon is a 3D gift box (assets/images/store/store-icon.webp). It sticks to the top like Loyalty's header: once the page
// scrolls (.is-stuck, watchHeader in components.js) the icon and the title become one pill and shrink together with
// the balance. The balance pill has a thin line between the coin and the number.
export const storeHead = (ui, common, { back = '' } = {}) => (requestAnimationFrame(watchHeader), `
  <header class="store-head">
    ${back ? `<a class="header-action store-head__back" href="${ui.esc(back)}" aria-label="${ui.t('orders.back')}" data-back>${ui.icon('back')}</a>` : ''}
    <span class="store-head__brand${back ? ' store-head__brand--plain' : ''}">
      ${back ? '' : '<span class="store-head__icon"><img src="../assets/images/store/store-icon.webp" alt=""></span>'}
      <h1 class="store-head__title">${ui.t('store.title')}</h1>
    </span>
    <span class="store-head__balance" aria-label="${ui.t('store.balance', { points: ui.num(common.balance.available) })}">
      <span class="store-head__coin">${coin('coin--xs')}</span><span class="num">${ui.num(common.balance.available)}</span>
    </span>
  </header>`);


// "Hot" / "New": on a reward's picture in the store; `inline` puts it in a line of text (before the name on the
// reward's page).
export const rewardBadge = (ui, item, { inline = false } = {}) =>
  (item.badge ? `<span class="store-badge store-badge--${item.badge}${inline ? ' store-badge--inline' : ''}">${ui.t(`store.badge.${item.badge}`)}</span>` : '');

// The phone's status bar (time, signal, notch) in the store's blue rather than plain white or black: a mobile browser
// colours it from <meta name="theme-color"> (older iOS, Android) or from the page's own background behind it (newer
// iOS); the bounce area above the page takes the same blue (store.css, html.store-chrome). In the app's webview the
// page already draws under the status bar (viewport-fit=cover), so the blue reaches it there anyway.
export function storeChrome() {
  const root = document.documentElement;
  root.classList.add('store-chrome');
  const meta = document.querySelector('meta[name="theme-color"]') ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
  const paint = () => { meta.content = getComputedStyle(root).getPropertyValue('--accent-surface-brand').trim(); };
  paint();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => requestAnimationFrame(paint));
}

export const categoryName = (ui, key) => (STORE_CATEGORIES.includes(key) ? ui.t(`store.cat.${key}`) : '');
