// DEMO ONLY — never ship to production. Front-end developers wire each button to a deeplink instead.
// To remove it, delete the demo/ folder and the DEMO ONLY block at the end of each page's HTML.
//
// Buttons that leave these pages carry data-intent="<name>" (plus data-account for a trading account). In the demo
// a tap shows an "Internal Explanation" message in the middle of the screen saying where the button would go and
// what would happen; it hides itself after 3 seconds, or earlier on a tap outside or Escape (spec §30).
// The text lives in demo/intents.en.json (intent.<name>.title / .body).

const HIDE_AFTER_MS = 3000;
const copy = await fetch('../demo/intents.en.json').then((res) => res.json());
const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const text = (key, vars = {}) => esc(copy[key] || '').replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');

const style = document.createElement('style');
style.textContent = `
.intent-scrim { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: var(--spacing-gutter); background: var(--ui-overlay-scrim); }
.intent {
  width: 100%; max-width: calc(var(--size-frame) - var(--spacing-gutter) * 2);
  display: flex; flex-direction: column; align-items: center; gap: var(--spacing-8); text-align: center;
  padding: var(--spacing-20) var(--spacing-card);
  border-radius: var(--radius-card); background: var(--card-surface); border: var(--size-stroke) solid var(--card-stroke); box-shadow: var(--shadow);
}
.intent__label { padding: var(--spacing-2) var(--spacing-10); border-radius: var(--radius-pill); background: var(--ui-badge-blue); color: var(--ui-text-brand); font: var(--font-x-small-semibold); }
`;
document.head.appendChild(style);

let open = null;
let timer = null;

function close() {
  clearTimeout(timer);
  if (!open) return;
  open.remove();
  open = null;
}

function show(name, vars) {
  close();
  open = document.createElement('div');
  open.className = 'intent-scrim';
  open.innerHTML = `
    <div class="intent" role="status" aria-live="polite">
      <span class="intent__label">${text('intent.label')}</span>
      <h2 class="t-title-s">${text(`intent.${name}.title`)}</h2>
      <p class="t-body c-2 num">${text(`intent.${name}.body`, vars)}</p>
    </div>`;
  document.body.appendChild(open);
  timer = setTimeout(close, HIDE_AFTER_MS);
}

document.addEventListener('click', (event) => {
  if (open) {
    // A tap on the backdrop closes it early; taps inside the message do nothing.
    if (event.target === open) close();
    return;
  }
  const target = event.target.closest('[data-intent]');
  if (!target || target.disabled) return;
  event.preventDefault();
  show(target.dataset.intent, { account: esc(target.dataset.account || '') });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') close();
});
