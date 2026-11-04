// The 4.0b sweep rim (TOKENS 4.0b, R3): one conic sweep around every neutral surface, painted on ::before as a ring
// that takes no room. Anchors, ramp and spreads come from tokens/hsb-rim.g.json (a byte-equal copy of hsb_app's
// generated file); the width from --hsb-rim-shared-width. Each surface gets its own sweep for its size and mode, set
// as --rim on the element; components.css draws the ring.
//
// What takes the rim: the neutral surfaces in RIM_SELECTOR. Not: selected, focused, error and disabled states, tags,
// images, the tab bar and lens (their own rim, EX-4.0-04), the brand card and the Earn cell (EX-4.4-01), primary and
// tinted buttons, shimmer.
import { tok } from './tokens.js';

const RIM_SELECTOR = [
  '.card:not(.card--brand):not(.card--blend):not(.reward-card--earn):not([data-mode="dark"] .reward-sheet)', '.sheet', '.tour__card',
  '.header-action', '.app-header__pill', '.btn--glass:not(:disabled)', '.btn--stroke:not(:disabled)',
  '.option', '.select', '.upgrade-row--top', '.rates-frame', '.activity:not(.activity--gift)',
  '.tabs', '.checkin__day--later', '.reward-card:not(.reward-card--earn) .reward-card__art:not(.skeleton__bar)', '.page-error__icon', '.hero-message__icon',
  '.list-none__orb', '.join__mark',
  // The store header's balance: a solid box fill in light; in dark it is glass over the gradient, not a neutral surface.
  '[data-mode="light"] .store-head__balance',
].join(', ');

let data = null;
const DATA_URL = new URL('../tokens/hsb-rim.g.json', import.meta.url);
// The offline review bundle inlines the file as window.__HSB_RIM__ (tools/build-offline.py).
const loadData = async () => {
  if (window.__HSB_RIM__) return window.__HSB_RIM__;
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`hsb-rim.g.json: ${response.status}`);
  return response.json();
};

// Ramp colour for a value 0..100: DK + (255 - DK) * value / 100 per sRGB channel, not rounded.
const ramp = (dk, value) => dk.map((c) => c + ((255 - c) * value) / 100);

// The sweep for a w x h box in a mode, as a conic-gradient (4.0b, "How the sweep is built").
function sweep(w, h, mode) {
  const spec = data.shared[mode];
  const dk = data.rampDK[mode];
  const P = 2 * (w + h);
  const at = { N: 0, NE: w / 2, E: w / 2 + h / 2, SE: w / 2 + h, S: w + h, SW: 1.5 * w + h, W: 1.5 * w + 1.5 * h, NW: 1.5 * w + 2 * h };
  const unit = { w, h };
  const anchors = data.anchorOrder.map((name) => [name, spec.anchors[name]]).filter(([, a]) => a);
  const base = ramp(dk, spec.base);
  const n = data.stops - 1;
  const stops = [];
  for (let i = 0; i <= n; i += 1) {
    const t = (i * P) / n;
    let maxV = 0; let sumV = 0; const sum = [0, 0, 0];
    for (const [name, a] of anchors) {
      let d = t - at[name];
      d = ((((d + P / 2) % P) + P) % P) - P / 2; // wrap to +-P/2
      const [pct, u] = d >= 0 ? a.cw : a.ccw;
      const spread = (pct / 100) * unit[u];
      if (!spread) continue;
      const k = Math.max(0, 1 - Math.abs(d) / spread);
      const v = k * k * (3 - 2 * k);
      if (!v) continue;
      const c = ramp(dk, a.value);
      maxV = Math.max(maxV, v); sumV += v;
      c.forEach((x, j) => { sum[j] += v * x; });
    }
    const rest = 1 - maxV;
    const rgb = base.map((b, j) => Math.round((b * rest + sum[j]) / (rest + sumV)));
    // The point at distance t clockwise from the top centre, on the sharp-cornered outer rectangle, from the centre.
    let x; let y;
    if (t <= w / 2) { x = t; y = -h / 2; } else if (t <= w / 2 + h) { x = w / 2; y = -h / 2 + (t - w / 2); }
    else if (t <= 1.5 * w + h) { x = w / 2 - (t - w / 2 - h); y = h / 2; } else if (t <= 1.5 * w + 2 * h) { x = -w / 2; y = h / 2 - (t - 1.5 * w - h); }
    else { x = -w / 2 + (t - 1.5 * w - 2 * h); y = -h / 2; }
    let angle = (Math.atan2(x, -y) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    if (i === n) angle = 360;
    stops.push(`rgb(${rgb.join(' ')}) ${angle.toFixed(2)}deg`);
  }
  return `conic-gradient(from 0deg at 50% 50%, ${stops.join(', ')})`;
}

const modeOf = (el) => (el.closest('[data-mode]')?.getAttribute('data-mode') === 'dark' ? 'dark' : 'light');
const painted = new WeakMap(); // element -> "w x h mode" last painted

function paint(el) {
  const w = Math.round(el.offsetWidth); const h = Math.round(el.offsetHeight);
  // Too small (or hidden), or a selected option: no rim. Touch the class only when it changes, or the mutation
  // observer below would see a change every frame.
  if (w < data.neutralSurface.minW || h < data.neutralSurface.minH || (el.matches('.option') && el.querySelector('.radio--on'))) {
    if (el.classList.contains('rim')) { el.classList.remove('rim'); painted.delete(el); }
    return;
  }
  const mode = modeOf(el);
  const key = `${w}x${h}${mode}`;
  if (painted.get(el) === key) return;
  painted.set(el, key);
  el.style.setProperty('--rim', sweep(w, h, mode));
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.classList.add('rim');
}

const sizes = new ResizeObserver((entries) => entries.forEach((entry) => paint(entry.target)));
const watched = new WeakSet();
function scan(root = document) {
  root.querySelectorAll(RIM_SELECTOR).forEach((el) => {
    if (watched.has(el)) { paint(el); return; }
    watched.add(el); sizes.observe(el); paint(el);
  });
  // A surface that stops matching (an option just selected) loses its rim.
  root.querySelectorAll('.rim').forEach((el) => { if (!el.matches(RIM_SELECTOR)) { el.classList.remove('rim'); painted.delete(el); } });
}

export async function startRim() {
  if (!tok('rim-shared-width')) return; // the R3 tokens are not loaded
  try { data = await loadData(); } catch (error) { console.warn('4.0b rim off:', error.message); return; } // the page works without it
  scan();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-mode', 'disabled'] });
}

startRim();
