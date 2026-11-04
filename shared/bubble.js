// Bubble (TOKENS 9.1): the press effect on every button and clickable card. Spring physics, not keyframes.
// A touch waits a beat before it shows: moved past 8px within the first 100ms it is a scroll and nothing lights; still
// after 100ms the press begins; lifted sooner, the press plays at once and lets go. A press that turns into a scroll
// within 180ms fades out with no bounce. Only the shape stretches: children are counter-scaled, so text keeps its
// proportions. Because of that, a child of a pressable must not rely on its own transform for layout.
import { tokMs, tokNum, tokSpring } from './tokens.js';
const SELECTOR = 'button.btn, a.btn, .header-action, .nav__exit, .nav__tabs button, .text-btn, a.badge, .reward-card, .card-link, .upgrade-row, button.select, .option, .chip, .cal-nav, button.cal__day';
// Swell by role (9.1): round buttons, cards, the account field, chips; anything else the standard swell.
const SWELL = [['.header-action, .nav__exit', 'round'], ['.reward-card, .balance, .upgrade-row, .option, .balance-history', 'card'], ['button.select', 'list-row'], ['a.badge, .chip', 'glass-chip'], ['.cal-nav, button.cal__day', 'round']];
const PRESS = tokSpring('bubble-press');
const RELEASE = tokSpring('bubble-release');
const CANCEL = tokSpring('press-soft-cancel');
const PRESS_DELAY = tokMs('motion-tap-delay-dur'); const SCROLL_SLOP = tokNum('bubble-scroll-slop'); const HOLD_OWN = tokMs('motion-hold-owns-drag-dur');
const FOLLOW = tokNum('bubble-drag-factor'); const FOLLOW_CAP = tokNum('bubble-drag-cap'); const DEAD_ZONE = tokNum('bubble-drag-dead-zone'); const FOLLOW_DIVISOR = tokNum('bubble-drag-divisor');

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const live = new Map(); // element -> spring state
let pressed = null; let pending = null; let startX = 0; let startY = 0; let downAt = 0; let ticking = false;

// The whole-card link stands for its card, which is what swells.
const pressable = (target) => {
  const found = target.closest?.(SELECTOR);
  if (!found || found.disabled) return null;
  return found.matches('.card-link') ? found.parentElement : found;
};
const swellOf = (el) => tokNum(`swell-${SWELL.find(([selector]) => el.matches(selector))?.[1] ?? 'standard'}`);
const spring = (el) => {
  if (!live.has(el)) live.set(el, { s: 1, vs: 0, x: 0, vx: 0, y: 0, vy: 0, ts: 1, tx: 0, ty: 0, k: RELEASE, last: 0 });
  return live.get(el);
};

function tick(now) {
  live.forEach((st, el) => {
    const dt = Math.min(0.032, st.last ? (now - st.last) / 1000 : 0.016);
    st.last = now;
    const { w, z } = st.k;
    [['s', 'vs', 'ts'], ['x', 'vx', 'tx'], ['y', 'vy', 'ty']].forEach(([p, v, t]) => {
      st[v] += (-w * w * (st[p] - st[t]) - 2 * z * w * st[v]) * dt;
      st[p] += st[v] * dt;
    });
    // The pulled side grows along the drag and thins slightly across it.
    const ex = (Math.abs(st.x) * 1.4) / (el.offsetWidth || 1); const ey = (Math.abs(st.y) * 1.4) / (el.offsetHeight || 1);
    const sx = st.s * (1 + ex - ey * 0.35); const sy = st.s * (1 + ey - ex * 0.35);
    el.style.transform = `translate(${(st.x * 1.7).toFixed(2)}px, ${(st.y * 1.7).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    const counter = `scale(${(st.s / sx).toFixed(4)}, ${(st.s / sy).toFixed(4)})`;
    [...el.children].forEach((child) => { child.style.transform = counter; });
    const still = Math.abs(st.s - st.ts) + Math.abs(st.vs) + Math.abs(st.x - st.tx) + Math.abs(st.vx) + Math.abs(st.y - st.ty) + Math.abs(st.vy) < 6e-4;
    if (still && el !== pressed) {
      el.style.transform = '';
      [...el.children].forEach((child) => { child.style.transform = ''; });
      live.delete(el);
    }
  });
  if (live.size) requestAnimationFrame(tick); else ticking = false;
}
const run = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };

function begin(el) {
  pressed = el;
  el.classList.add('pressed');
  if (reduced.matches) return;
  const st = spring(el);
  st.k = PRESS; st.ts = 1 + swellOf(el); st.last = 0;
  run();
}
function end(k) {
  const el = pressed;
  if (!el) return;
  pressed = null;
  el.classList.remove('pressed');
  if (reduced.matches) return;
  const st = spring(el);
  st.k = k; st.ts = 1; st.tx = 0; st.ty = 0;
  if (k === CANCEL) st.last = 0;
  run();
}

document.addEventListener('pointerdown', (event) => {
  const el = pressable(event.target);
  if (!el) return;
  end(RELEASE);
  clearTimeout(pending?.timer);
  startX = event.clientX; startY = event.clientY; downAt = performance.now();
  pending = { el, timer: setTimeout(() => { pending = null; begin(el); }, PRESS_DELAY) };
});
document.addEventListener('pointermove', (event) => {
  const far = Math.hypot(event.clientX - startX, event.clientY - startY) > SCROLL_SLOP;
  if (pending) { if (far) { clearTimeout(pending.timer); pending = null; } return; }
  if (!pressed) return;
  if (far && performance.now() - downAt < HOLD_OWN) { end(CANCEL); return; }
  if (reduced.matches) return;
  const follow = (d) => Math.sign(d) * Math.min(FOLLOW_CAP, (Math.max(0, Math.abs(d) - DEAD_ZONE) * FOLLOW) / FOLLOW_DIVISOR);
  const st = spring(pressed);
  st.tx = follow(event.clientX - startX); st.ty = follow(event.clientY - startY);
  run();
});
['pointerup', 'pointercancel'].forEach((type) => document.addEventListener(type, () => {
  if (pending) { // lifted before the beat
    const { el, timer } = pending;
    clearTimeout(timer); pending = null;
    if (type === 'pointerup') { begin(el); setTimeout(() => { if (pressed === el) end(RELEASE); }, 90); }
    return;
  }
  end(type === 'pointerup' ? RELEASE : CANCEL);
}));
