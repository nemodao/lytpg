// Bottom sheet behaviour (TOKENS 7.14), for every `.scrim > .sheet` on any page. Pages keep their own close handlers:
// this only adds the drag and plays the slide out before their click runs.
// Down, the sheet follows the finger; let go past a third of its height or on a flick (over 900 px/s) it slides away,
// else it springs back. Up, it stretches from the bottom on a rubber band, max about 64px, and springs back with the
// bubble's release spring. A sheet whose content scrolls drags from its grip and head only.
const REBOUND = { w: 15.6, z: 0.36 };
const SLIDE_MS = 280;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let drag = null; let frame = 0;

const scrolls = (sheet) => sheet.scrollHeight > sheet.clientHeight + 1;
// A sheet at its height cap grows no band at the foot: the whole sheet rises and its content takes the room.
const capped = (sheet) => sheet.offsetHeight >= innerHeight * 0.82 - 1;
function place(sheet, dy, foot) {
  if (dy < 0) {
    const up = (64 * (1 - Math.exp(dy / 140))).toFixed(1);
    if (capped(sheet) || sheet.style.maxHeight) sheet.style.maxHeight = `calc(var(--size-sheet-max-height) + ${up}px)`;
    else sheet.style.paddingBottom = `calc(${foot}px + ${up}px)`;
    sheet.style.transform = '';
    return;
  }
  sheet.style.paddingBottom = ''; sheet.style.maxHeight = '';
  sheet.style.transform = dy ? `translateY(${dy}px)` : '';
}
// The page's own handler closes on a click on the scrim: send that click once the slide has played.
function slideAway(scrim, sheet, click) {
  sheet.style.animation = 'none';
  sheet.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(.4, 0, 1, 1)`;
  sheet.style.transform = 'translateY(105%)';
  scrim.classList.add('is-closing');
  scrim.dataset.closing = '';
  setTimeout(click, SLIDE_MS);
}
document.addEventListener('click', (event) => {
  const scrim = event.target.closest?.('.scrim');
  if (!scrim || reduced.matches || 'closing' in scrim.dataset) return;
  // The scrim itself, or a close button inside the sheet (the tap may land on its icon).
  const control = event.target === scrim ? scrim : event.target.closest('.sheet [data-action^="close"]');
  const sheet = scrim.querySelector('.sheet');
  if (!control || !sheet) return;
  event.stopPropagation();
  event.preventDefault();
  slideAway(scrim, sheet, () => control.click());
}, true);

document.addEventListener('pointerdown', (event) => {
  const sheet = event.target.closest?.('.scrim > .sheet');
  if (!sheet || event.target.closest('button, a, input, iframe')) return;
  if (scrolls(sheet) && !event.target.closest('.sheet__grab, .sheet__head, .sheet__top')) return;
  cancelAnimationFrame(frame);
  sheet.style.animation = 'none';
  drag = { sheet, id: event.pointerId, y0: event.clientY, dy: 0, t0: performance.now(), foot: parseFloat(getComputedStyle(sheet).paddingBottom) };
  try { sheet.setPointerCapture(event.pointerId); } catch { /* the pointer has already gone */ }
});
document.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  drag.dy = event.clientY - drag.y0;
  place(drag.sheet, drag.dy, drag.foot);
});
['pointerup', 'pointercancel'].forEach((type) => document.addEventListener(type, (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const { sheet, dy, t0, foot } = drag;
  drag = null;
  const speed = (dy / Math.max(1, performance.now() - t0)) * 1000;
  if (dy > sheet.offsetHeight / 3 || (dy > 24 && speed > 900)) {
    const scrim = sheet.parentElement;
    slideAway(scrim, sheet, () => scrim.click());
    return;
  }
  if (reduced.matches) { place(sheet, 0, foot); return; }
  let x = dy; let v = 0; let last = 0;
  const step = (now) => {
    const dt = Math.min(0.032, last ? (now - last) / 1000 : 0.016);
    last = now;
    v += (-REBOUND.w * REBOUND.w * x - 2 * REBOUND.z * REBOUND.w * v) * dt;
    x += v * dt;
    if (Math.abs(x) < 0.2 && Math.abs(v) < 4) { place(sheet, 0, foot); return; }
    place(sheet, x, foot);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}));

const scrimIn = (node) => (node.nodeType === 1 ? (node.matches('.scrim') ? node : node.querySelector('.scrim')) : null);
// A closing path the page runs on its own (Escape, Cancel, Apply, picking an option): a copy slides away.
function ghost(gone) {
  if (reduced.matches || 'closing' in gone.dataset) return;
  const copy = gone.cloneNode(true);
  copy.classList.add('no-enter');
  copy.dataset.closing = '';
  document.body.appendChild(copy);
  copy.getBoundingClientRect(); // starts from its place on screen: the transition needs a first style to leave from
  slideAway(copy, copy.querySelector('.sheet'), () => copy.remove());
}
// Pages redraw everything on a change, sheet included: a sheet that was already open does not enter again. A sheet that
// fits owns its touches, so the drag works from anywhere on it. The page behind does not scroll while one is open.
new MutationObserver((records) => {
  const gone = records.flatMap((record) => [...record.removedNodes]).map(scrimIn).find(Boolean);
  const fresh = [...document.querySelectorAll('.scrim > .sheet:not([data-sheet-ready])')];
  fresh.forEach((sheet) => {
    sheet.dataset.sheetReady = '';
    sheet.classList.toggle('is-draggable', !scrolls(sheet));
    if (gone) sheet.parentElement.classList.add('no-enter');
  });
  if (gone && !fresh.length) ghost(gone);
  document.documentElement.classList.toggle('has-sheet', Boolean(document.querySelector('.scrim:not([data-closing])')));
}).observe(document.documentElement, { childList: true, subtree: true });
