// Floating bottom navigation, shared by every page: [ Exit ]  [ Home | Earn | Points ].
// To add, remove or reorder tabs, edit TABS: one entry per tab (id, label copy key, page file, artwork).
// Artwork comes in three versions (assets/images/nav/<id>-<version>.png):
//   light — not selected, light mode (silver glass)
//   dark  — not selected, dark mode (dark glass)
//   on    — selected, both modes (lime glass)
//   on-gold — selected on Premium, both modes
//   hot   — optional; with `flash: true`, the unselected icon turns into this version every few seconds
// `hot: true` adds the floating "HOT" badge on the icon's top-right corner, to draw attention to that tab
// (only while the tab is not selected).
// The selected pill and the glass lens are drawn by shared/nav-lens.js.
// API: the Exit button and other buttons that leave these pages carry data-intent; the host app attaches the real
// deeplinks (table in spec.md §30 and HANDOFF.md). No handler is wired here.
import { mountLens, pointerClick } from './nav-lens.js';
import { tok } from './tokens.js';

const TABS = [
  { id: 'home', label: 'nav.home', file: 'dashboard.html' },
  { id: 'earn', label: 'nav.earn', file: 'trading-task.html', hot: true, flash: true, needsTask: true },
  { id: 'points', label: 'nav.points', file: 'point-balance.html' },
];
// "HOT" badge; it floats gently up and down (CSS animation, off when the device asks for reduced motion).
const hot = `<img class="nav__hot" src="../assets/images/nav/hot.png" alt="">`;
const art = (id, version, extraClass = '') => `<img class="nav__image ${extraClass}" src="../assets/images/nav/${id}-${version}.png" alt="">`;

// The selected artwork in both brands; CSS shows the gold one on Premium ([data-premium] on <html>).
const selected = (id) => art(id, 'on', 'nav__image--brand') + art(id, 'on-gold', 'nav__image--gold');

// `active` is the id of the current page's tab. Tabs marked `needsTask` are left out when the programme runs no
// trading task (`program.tradingTask: false`, the `no-task-trading` state).
// Close's dark sheen (7.32): the glow at the centre fading out through loyalty-kit-close-sheen-falloff at
// -close-sheen-at, in -close-sheen-shape, over the bar's fill. Light: the glow is transparent.
function closeSheen() {
  const at = tok('loyalty-kit-close-sheen-at').split(/\s+/);
  const stops = tok('loyalty-kit-close-sheen-falloff').split(/\s+/)
    .map((share, i) => `color-mix(in srgb, var(--ui-nav-exit-glow) ${share}, transparent) ${at[i]}`);
  return `radial-gradient(${tok('loyalty-kit-close-sheen-shape')}, var(--ui-nav-exit-glow), ${stops.join(', ')}, transparent), var(--ui-nav-surface)`;
}

export function mountNav(ui, common, active) {
  const tabs = TABS.filter((item) => !(item.needsTask && common.program.tradingTask === false));
  const tab = (item) => `
    <a class="nav__tab" href="${ui.href(item.file)}" ${item.id === active ? 'aria-current="page"' : ''} data-track="loyalty_nav_click" data-track-target="${item.id === 'points' ? 'coins' : item.id}">
      <span class="nav__art ${item.flash && item.id !== active ? 'nav__art--flash' : ''}">
        ${item.id === active ? selected(item.id) : art(item.id, 'light', 'nav__image--on-light') + art(item.id, 'dark', 'nav__image--on-dark') + (item.flash ? art(item.id, 'hot', 'nav__image--flash') : '')}
        ${item.hot && item.id !== active ? hot : ''}
      </span>
      <span>${ui.t(item.label)}</span>
    </a>`;
  // The lens's copy of a tab, always in the brand colour: the selected artwork, no link, no tracking.
  const lensCopy = (item) => `<span class="nav__tab"><span class="nav__art">${selected(item.id)}${item.hot && item.id !== active ? hot : ''}</span><span>${ui.t(item.label)}</span></span>`;
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('aria-label', ui.t('nav.label'));
  nav.innerHTML = `
    <button class="nav__exit" type="button" aria-label="${ui.t('nav.exit')}" data-intent="exit" data-track="loyalty_nav_click" data-track-target="exit">${ui.icon('close')}</button>
    <div class="nav__box">
      <div class="nav__tabs"><i class="nav__sel"></i>${tabs.map(tab).join('')}</div>
      <div class="nav__lens" aria-hidden="true"><i class="nav__mag"><span class="nav__lrow" style="--tabs:${tabs.length}">${tabs.map(lensCopy).join('')}</span></i><i class="nav__hole"></i></div>
    </div>`;
  document.body.appendChild(nav);
  document.body.classList.add('has-nav');
  nav.querySelector('.nav__exit').style.setProperty('--nav-exit-surface', closeSheen());

  // A tap or a drag picks the tab through the lens, so a tab's own click is replaced: the pointer's click is dropped
  // and the chosen tab is clicked once (tracked as before) when the finger lifts; the page changes once the lens has
  // dropped in. Keyboard clicks (detail 0) go straight through.
  const row = nav.querySelector('.nav__tabs');
  let leaving = null;
  addEventListener('click', (event) => {
    if (pointerClick(event) && event.target.closest?.('.nav__tabs') === row) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  row.addEventListener('click', (event) => {
    if (event.isTrusted) return;
    leaving = event.defaultPrevented ? null : event.target.closest('.nav__tab')?.href;
    event.preventDefault();
  });
  const lens = mountLens(nav.querySelector('.nav__box'), (item, moment) => {
    if (moment === 'chosen') {
      row.querySelectorAll('.nav__tab').forEach((tab) => tab.toggleAttribute('aria-current', false));
      item.setAttribute('aria-current', 'page');
      item.click();
    } else if (leaving) location.href = leaving;
  });
  // Back to this page from the browser's memory: the tab it left for is still marked. Mark this page's tab again.
  addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    row.querySelectorAll('.nav__tab').forEach((tab, index) => tab.toggleAttribute('aria-current', tabs[index].id === active));
    row.querySelector('.nav__tab[aria-current]')?.setAttribute('aria-current', 'page');
    lens.rest();
  });

  // Bottom sheets open above the bar: while one is on screen, the page is lifted over the bar so the sheet's
  // backdrop covers it too.
  const app = document.getElementById('app');
  const sync = () => document.body.classList.toggle('sheet-open', Boolean(app.querySelector('.scrim')));
  new MutationObserver(sync).observe(app, { childList: true });
  sync();
}
