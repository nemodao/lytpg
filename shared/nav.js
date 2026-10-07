// Floating bottom navigation, shared by every page: [ Exit ]  [ Home | Earn | Points ].
// To add, remove or reorder tabs, edit TABS: one entry per tab (id, label copy key, page file, artwork).
// Artwork comes in three versions (assets/images/nav/<id>-<version>.png):
//   light — not selected, light mode (silver glass)
//   dark  — not selected, dark mode (dark glass)
//   on    — selected, both modes (blue glass)
//   hot   — optional; with `flash: true`, the unselected icon turns into this version every few seconds
// `hot: true` adds the floating "HOT" badge on the icon's top-right corner, to draw attention to that tab
// (only while the tab is not selected).
// API: the Exit button and other buttons that leave these pages carry data-intent; the host app attaches the real
// deeplinks (table in spec.md §30 and HANDOFF.md). No handler is wired here.
const TABS = [
  { id: 'home', label: 'nav.home', file: 'dashboard.html' },
  { id: 'earn', label: 'nav.earn', file: 'trading-task.html', hot: true, flash: true, needsTask: true },
  { id: 'points', label: 'nav.points', file: 'point-balance.html' },
];
// "HOT" badge; it floats gently up and down (CSS animation, off when the device asks for reduced motion).
const hot = `<img class="nav__hot" src="../assets/images/nav/hot.png" alt="">`;
const art = (id, version, extraClass = '') => `<img class="nav__image ${extraClass}" src="../assets/images/nav/${id}-${version}.png" alt="">`;

// `active` is the id of the current page's tab. Tabs marked `needsTask` are left out when the programme runs no
// trading task (`program.tradingTask: false`, the `no-task-trading` state).
export function mountNav(ui, common, active) {
  const tabs = TABS.filter((item) => !(item.needsTask && common.program.tradingTask === false));
  const tab = (item) => `
    <a class="nav__tab" href="${ui.href(item.file)}" ${item.id === active ? 'aria-current="page"' : ''}>
      <span class="nav__art ${item.flash && item.id !== active ? 'nav__art--flash' : ''}">
        ${item.id === active ? art(item.id, 'on') : art(item.id, 'light', 'nav__image--on-light') + art(item.id, 'dark', 'nav__image--on-dark') + (item.flash ? art(item.id, 'hot', 'nav__image--flash') : '')}
        ${item.hot && item.id !== active ? hot : ''}
      </span>
      <span>${ui.t(item.label)}</span>
    </a>`;
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('aria-label', ui.t('nav.label'));
  nav.innerHTML = `
    <button class="nav__exit" type="button" aria-label="${ui.t('nav.exit')}" data-intent="exit">${ui.icon('close')}</button>
    <div class="nav__tabs">${tabs.map(tab).join('')}</div>`;
  document.body.appendChild(nav);
  document.body.classList.add('has-nav');

  // Bottom sheets open above the bar: while one is on screen, the page is lifted over the bar so the sheet's
  // backdrop covers it too.
  const app = document.getElementById('app');
  const sync = () => document.body.classList.toggle('sheet-open', Boolean(app.querySelector('.scrim')));
  new MutationObserver(sync).observe(app, { childList: true });
  sync();
}
