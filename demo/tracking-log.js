// DEMO ONLY — never ship to production. Shows the analytics events as they are sent, so the tracking can be checked
// without Google Tag Manager. A floating "Events" button opens the list; it keeps the events of the previous pages
// of this visit too (sessionStorage), because many events are sent by buttons that leave the page.
// To remove it, delete the demo/ folder and the DEMO ONLY block at the end of each page's HTML.

const KEY = 'hsb-loyalty-demo-events';
const MAX = 40;
const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (e) { return []; } };
const save = (list) => { try { sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) { /* storage unavailable */ } };

const style = document.createElement('style');
style.textContent = `
.tracklog { position: fixed; left: var(--spacing-12); bottom: calc(env(safe-area-inset-bottom, 0px) + var(--nav-gap, 0px) + var(--nav-height, 0px) + var(--spacing-12)); z-index: 100; display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-8); font: var(--font-x-small-regular); }
.tracklog__toggle { height: var(--size-control-sm); padding: 0 var(--spacing-14); border-radius: var(--radius-pill); background: var(--ui-text-primary); color: var(--ui-text-dark); font: var(--font-x-small-semibold); }
.tracklog__panel { width: calc(var(--size-reward-width) + var(--spacing-40)); max-height: 60vh; overflow: auto; display: flex; flex-direction: column; gap: var(--spacing-8); padding: var(--spacing-12); border-radius: var(--radius-card-inner); background: var(--card-surface); border: var(--size-stroke) solid var(--card-stroke); color: var(--ui-text-secondary); }
.tracklog__panel[hidden] { display: none; }
.tracklog__item { padding-bottom: var(--spacing-8); border-bottom: var(--size-stroke) solid var(--ui-line-soft); overflow-wrap: anywhere; }
.tracklog__item b { display: block; font: var(--font-x-small-semibold); color: var(--ui-text-primary); }
.tracklog__clear { align-self: flex-start; color: var(--ui-text-brand); min-height: var(--size-control-sm); }
`;
document.head.appendChild(style);

const root = document.createElement('div');
root.className = 'tracklog';
root.innerHTML = '<div class="tracklog__panel" hidden></div><button class="tracklog__toggle" type="button"></button>';
document.body.appendChild(root);
const panel = root.querySelector('.tracklog__panel');
const toggle = root.querySelector('.tracklog__toggle');

let events = load();
function render() {
  toggle.textContent = `Events (${events.length})`;
  panel.innerHTML = `<p><b>Analytics events, newest first</b> (demo only)</p>`
    + (events.length ? [...events].reverse().map((entry) => {
      const { event, ...params } = entry;
      return `<div class="tracklog__item"><b>${esc(event)}</b>${Object.entries(params).map(([key, value]) => `${esc(key)}: ${esc(value)}`).join(' · ')}</div>`;
    }).join('') : '<p>No event yet.</p>')
    + '<button class="tracklog__clear" type="button">Clear</button>';
}
function add(entry) {
  if (!entry || typeof entry !== 'object' || !entry.event) return;
  events.push(entry);
  events = events.slice(-MAX);
  save(events);
  render();
}

// Everything pushed to the data layer, before and after this script loaded.
window.dataLayer = window.dataLayer || [];
window.dataLayer.forEach(add);
const push = window.dataLayer.push.bind(window.dataLayer);
window.dataLayer.push = (...entries) => { entries.forEach(add); return push(...entries); };

toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });
panel.addEventListener('click', (event) => {
  if (!event.target.closest('.tracklog__clear')) return;
  events = [];
  save(events);
  render();
});
render();
