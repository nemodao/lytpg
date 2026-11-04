// Glass lens on the bottom bar (TOKENS 8.2), ported from the app's approved tab bar. Touching the bar lifts the selected
// pill into a clear lens: a tap travels to the tapped tab and drops in, a hold or a drag grows it fully and it follows
// the finger, and release snaps to the nearest tab. Inside the lens a copy of the row shows at 118%, in the brand colour.
// Items never scale or change colour themselves. Chromium also refracts what is behind the lens; Safari magnifies only.
// In this handoff a tab is a separate page, so the page changes once the lens has dropped in. API: where the bar stays
// mounted across routes, route at once and let the lens finish.
const FILTERS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="lensBD" x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">  <feImage class="lbd" href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3ClinearGradient%20id%3D%27g%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23c10000%27/%3E%3Cstop%20offset%3D%27.04%27%20stop-color%3D%27%23b30000%27/%3E%3Cstop%20offset%3D%27.08%27%20stop-color%3D%27%23a70000%27/%3E%3Cstop%20offset%3D%27.12%27%20stop-color%3D%27%239d0000%27/%3E%3Cstop%20offset%3D%27.5%27%20stop-color%3D%27%23800000%27/%3E%3Cstop%20offset%3D%27.88%27%20stop-color%3D%27%23620000%27/%3E%3Cstop%20offset%3D%27.92%27%20stop-color%3D%27%23580000%27/%3E%3Cstop%20offset%3D%27.96%27%20stop-color%3D%27%234c0000%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%233e0000%27/%3E%3C/linearGradient%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27url%28%23g%29%27/%3E%3C/svg%3E" x="0" y="0" width="100" height="100" preserveAspectRatio="none" result="mx"/>  <feImage class="lbd" href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3ClinearGradient%20id%3D%27g%27%20x2%3D%270%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%2300b300%27/%3E%3Cstop%20offset%3D%27.05%27%20stop-color%3D%27%2300a500%27/%3E%3Cstop%20offset%3D%27.1%27%20stop-color%3D%27%23009800%27/%3E%3Cstop%20offset%3D%27.5%27%20stop-color%3D%27%23008000%27/%3E%3Cstop%20offset%3D%27.9%27%20stop-color%3D%27%23006700%27/%3E%3Cstop%20offset%3D%27.95%27%20stop-color%3D%27%23005a00%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23004d00%27/%3E%3C/linearGradient%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27url%28%23g%29%27/%3E%3C/svg%3E" x="0" y="0" width="100" height="100" preserveAspectRatio="none" result="my"/>  <feComposite in="mx" in2="my" operator="arithmetic" k2="1" k3="1" result="map"/>  <feDisplacementMap id="lbdMap" in="SourceGraphic" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G" result="warp"/>  <feGaussianBlur in="warp" stdDeviation="1.8" result="smear"/>  <feImage class="lbd" href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3CradialGradient%20id%3D%27g%27%20cx%3D%27.5%27%20cy%3D%27.5%27%20r%3D%27.5%27%3E%3Cstop%20offset%3D%27.6%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%270%27/%3E%3Cstop%20offset%3D%27.85%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%27.8%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23000%27/%3E%3C/radialGradient%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27url%28%23g%29%27/%3E%3C/svg%3E" x="0" y="0" width="100" height="100" preserveAspectRatio="none" result="ring"/>  <feComposite in="smear" in2="ring" operator="in" result="smearRing"/>  <feMerge><feMergeNode in="warp"/><feMergeNode in="smearRing"/></feMerge></filter><filter id="lensRow" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">  <feImage href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3ClinearGradient%20id%3D%27g%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23e60000%27/%3E%3Cstop%20offset%3D%27.04%27%20stop-color%3D%27%23b90000%27/%3E%3Cstop%20offset%3D%27.08%27%20stop-color%3D%27%23990000%27/%3E%3Cstop%20offset%3D%27.12%27%20stop-color%3D%27%23800000%27/%3E%3Cstop%20offset%3D%27.88%27%20stop-color%3D%27%23800000%27/%3E%3Cstop%20offset%3D%27.92%27%20stop-color%3D%27%23670000%27/%3E%3Cstop%20offset%3D%27.96%27%20stop-color%3D%27%23460000%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%231a0000%27/%3E%3C/linearGradient%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27url%28%23g%29%27/%3E%3C/svg%3E" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="mx"/>  <feImage href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27%23008000%27/%3E%3C/svg%3E" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="my"/>  <feComposite in="mx" in2="my" operator="arithmetic" k2="1" k3="1" result="map"/>  <feDisplacementMap in="SourceGraphic" in2="map" scale=".2" xChannelSelector="R" yChannelSelector="G" result="warp"/>  <feGaussianBlur in="warp" stdDeviation=".012 .02" result="smear"/>  <feImage href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3ClinearGradient%20id%3D%27g%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23000%27/%3E%3Cstop%20offset%3D%27.05%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%27.8%27/%3E%3Cstop%20offset%3D%27.12%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%270%27/%3E%3Cstop%20offset%3D%27.88%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%270%27/%3E%3Cstop%20offset%3D%27.95%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%27.8%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23000%27/%3E%3C/linearGradient%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27url%28%23g%29%27/%3E%3C/svg%3E" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="ends"/>  <feComposite in="smear" in2="ends" operator="in" result="smearEnds"/>  <feImage href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3ClinearGradient%20id%3D%27g%27%3E%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23000%27/%3E%3Cstop%20offset%3D%27.1%27%20stop-color%3D%27%23000%27/%3E%3Cstop%20offset%3D%27.16%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%270%27/%3E%3Cstop%20offset%3D%27.84%27%20stop-color%3D%27%23000%27%20stop-opacity%3D%270%27/%3E%3Cstop%20offset%3D%27.9%27%20stop-color%3D%27%23000%27/%3E%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23000%27/%3E%3C/linearGradient%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27url%28%23g%29%27/%3E%3C/svg%3E" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="outer"/>  <feComponentTransfer in="outer" result="inner"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>  <feComposite in="SourceGraphic" in2="inner" operator="in" result="mid"/>  <feComposite in="warp" in2="outer" operator="in" result="warpEnds"/>  <feMerge><feMergeNode in="mid"/><feMergeNode in="warpEnds"/><feMergeNode in="smearEnds"/></feMerge></filter></svg>`;
const POSITION = { down: { w: 35.1, z: 0.8 }, snap: { w: 29.7, z: 0.68 } };
const LIFT = { up: { w: 29.7, z: 0.62 }, sink: { w: 21.6, z: 0.9 } };
const SQUASH = { w: 23, z: 0.42 };
const PINK_AT = 29; // the fringe's pink patch peaks this many degrees after the conic start angle
const HOLD_MS = 180; const DEAD_ZONE = 4;
const RIM_POINTS = 16; const RIM_IDLE = 0.3;
// The fringe is fainter towards the top-right and bottom-left, down to 40%.
const RIM_TILT = Array.from({ length: RIM_POINTS }, (_, k) => 1 - 0.6 * Math.max(0, Math.cos(2 * ((k * 2 * Math.PI) / RIM_POINTS - Math.PI / 4))));
const LANDED_BY = 700; // ms: the page changes by then even if animation frames stall
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// The lens picks the tab, so a pointer's own click on a bar is dropped. Only a click that follows a pointer: a screen
// reader or the keyboard activates the tab directly.
let pointerAt = 0;
export const pointerClick = (event) => event.isTrusted && event.detail > 0 && performance.now() - pointerAt < 1500;

// `bar` is the row and `item` its tabs. The bottom bar takes the defaults; a category bar (TOKENS 8.3) runs at 70% of the
// speed.
export function mountLens(box, onChoose, { bar: barSelector = '.nav__tabs', item = '.nav__tab', inset = 4, speed = 1 } = {}) {
  if (!document.getElementById('lensBD')) document.body.insertAdjacentHTML('beforeend', FILTERS);
  const bar = box.querySelector(barSelector);
  const pill = bar.querySelector('.nav__sel');
  const lens = box.querySelector('.nav__lens');
  const items = [...bar.querySelectorAll(item)];
  const map = document.getElementById('lbdMap');
  const filter = document.getElementById('lensBD');
  const S = { x: 0, vx: 0, tx: 0, p: 0, vp: 0, tp: 0, q: 0, vq: 0, k: 1, full: true, ang: 315, down: false, raf: 0, last: 0, release: 0, sel: 0, fAcc: 0, fc: new Array(RIM_POINTS).fill(RIM_IDLE), hold: 0, id: null, from: 0, done: null };
  const local = (event) => event.clientX - bar.getBoundingClientRect().left;
  const nearest = (cx) => items.reduce((best, tab, i) => (Math.abs(tab.offsetLeft + tab.offsetWidth / 2 - cx) < Math.abs(items[best].offsetLeft + items[best].offsetWidth / 2 - cx) ? i : best), 0);

  function draw() {
    const w = items[0].offsetWidth; const p = Math.max(0, S.p);
    const stretch = 12 * S.q * p; const squash = 4.5 * S.q * p;
    // A tap caps the size: no taller than the bar, 8 wider each side. A hold or drag opens the cap (k 0 to 1).
    const grow = Math.min(15 * p, 8 + 7 * S.k); const lift = Math.min(11 * p, 4 + 7 * S.k);
    pill.style.width = `${w}px`; pill.style.transform = `translateX(${S.x}px)`; pill.style.opacity = String(Math.max(0, 1 - p * 1.6));
    const lw = w + 2 * grow + stretch; const lx = S.x - grow - stretch / 2; const liftE = lift - squash;
    const barW = bar.clientWidth; const barH = bar.clientHeight; const radius = barH / 2;
    Object.entries({ '--lx': `${lx}px`, '--lift': `${liftE}px`, '--barw': `${barW}px`, '--barh': `${barH}px`, '--cl': `${Math.max(0, -lx)}px`, '--cr': `${Math.max(0, lx + lw - barW)}px`, '--rl': `${lx < radius ? radius : 0}px`, '--rr': `${lx + lw > barW - radius ? radius : 0}px`, '--ox': `${lx + lw / 2}px`, '--mag': String(1 + 0.18 * p), '--swirl': `${S.ang - PINK_AT}deg`, '--swirl2': `${S.ang + 150}deg` }).forEach(([name, value]) => lens.style.setProperty(name, value));
    lens.style.width = `${lw}px`; lens.style.transform = `translateX(${lx}px)`; lens.style.top = `${inset - liftE}px`; lens.style.bottom = `${inset - liftE}px`;
    lens.style.opacity = String(Math.min(1, p * 1.4));
    box.style.transform = p > 0.001 ? `scale(${1 + 0.025 * Math.min(p, 0.4 + 0.6 * S.k)})` : '';
    if (p > 0.01) { // the backdrop filter is sized to the lens; the pull is half its width
      const lh = Math.max(1, barH - inset * 2 + 2 * liftE);
      filter.setAttribute('width', lw); filter.setAttribute('height', lh);
      filter.querySelectorAll('.lbd').forEach((image) => { image.setAttribute('width', lw); image.setAttribute('height', lh); });
      map.setAttribute('scale', (lw * 0.5).toFixed(1));
    }
    box.classList.toggle('is-lensing', p > 0.4);
  }

  // What the rim touches lights the fringe: an icon or label, the bar's edge, or content on the screen behind.
  const contentAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.closest('.nav')) continue;
      if (el.closest('img, svg, .card, .sunk, .btn')) return 1;
      return [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim()) ? 1 : 0;
    }
    return 0;
  };
  function fringe(dt) {
    if (S.p < 0.02) return;
    const r = lens.getBoundingClientRect(); const b = bar.getBoundingClientRect(); const rad = b.height / 2;
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
    const marks = items.flatMap((tab) => [...tab.querySelectorAll('img, span:last-child')].filter((el) => el.offsetWidth).map((el) => el.getBoundingClientRect()));
    const inBar = (x, y) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    const edge = (x, y) => Math.abs(Math.hypot(Math.max(Math.abs(x - (b.left + b.width / 2)) - (b.width / 2 - rad), 0), Math.abs(y - (b.top + rad))) - rad);
    const stops = [];
    for (let k = 0; k < RIM_POINTS; k++) {
      const a = (k * 2 * Math.PI) / RIM_POINTS;
      const x = cx + Math.sin(a) * (r.width / 2 - 3) * 0.82; const y = cy - Math.cos(a) * (r.height / 2 - 3) * 0.82;
      let c = 0;
      if (marks.some((m) => x >= m.left - 2 && x <= m.right + 2 && y >= m.top - 2 && y <= m.bottom + 2)) c = 1;
      else if (edge(x, y) < 4) c = 0.9;
      else if (!inBar(x, y)) c = contentAt(x, y);
      S.fc[k] += (RIM_IDLE + (1 - RIM_IDLE) * c - S.fc[k]) * Math.min(1, dt * 12);
      stops.push(`rgba(0,0,0,${(S.fc[k] * RIM_TILT[k]).toFixed(3)}) ${((k * 360) / RIM_POINTS).toFixed(1)}deg`);
    }
    stops.push(`rgba(0,0,0,${(S.fc[0] * RIM_TILT[0]).toFixed(3)}) 360deg`);
    lens.style.setProperty('--fmask', `conic-gradient(from 0deg, ${stops.join(', ')})`);
  }

  function step(now) {
    const dt = Math.min(0.05, (now - (S.last || now)) / 1000) || 0.016;
    S.last = now;
    const sx = { ...(S.down ? POSITION.down : POSITION.snap) }; const sp = { ...(S.tp ? LIFT.up : LIFT.sink) };
    sx.w *= speed; sp.w *= speed;
    // Sub-steps of 4ms or less: one stiff step on a slow frame makes the lens shake and fly off.
    const n = Math.max(1, Math.ceil(dt / 0.004)); const h = dt / n;
    for (let i = 0; i < n; i++) {
      S.vx += (-(sx.w * sx.w) * (S.x - S.tx) - 2 * sx.z * sx.w * S.vx) * h; S.x += S.vx * h;
      S.vp += (-(sp.w * sp.w) * (S.p - S.tp) - 2 * sp.z * sp.w * S.vp) * h; S.p += S.vp * h;
      const tq = Math.min(1, Math.abs(S.vx) / 500);
      S.vq += (-(SQUASH.w * SQUASH.w) * (S.q - tq) - 2 * SQUASH.z * SQUASH.w * S.vq) * h; S.q += S.vq * h;
    }
    const lo = items[0].offsetLeft - 24; const hi = items.at(-1).offsetLeft + 24;
    if (S.x < lo || S.x > hi) { S.x = Math.max(lo, Math.min(hi, S.x)); S.vx = 0; }
    S.q = Math.max(-0.45, Math.min(1.3, S.q));
    if (!S.down && S.tp === 1 && now > S.release) S.tp = 0; // hold over the tab a moment, then sink
    S.k += ((S.full ? 1 : 0) - S.k) * Math.min(1, dt * 14);
    const target = 315 + Math.max(-25, Math.min(25, S.vx * 0.05)); // the pink patch sways, it never spins
    S.ang += (target - S.ang) * Math.min(1, dt * 10);
    draw();
    S.fAcc += dt;
    if (S.fAcc >= 0.033) { fringe(S.fAcc); S.fAcc = 0; }
    if (S.done && S.tp === 0 && S.p < 0.08) S.done();
    const still = Math.abs(S.x - S.tx) < 0.2 && Math.abs(S.vx) < 2 && Math.abs(S.p - S.tp) < 0.003 && Math.abs(S.vp) < 0.01 && Math.abs(S.q) < 0.003 && Math.abs(S.vq) < 0.01;
    if (still && !S.down && S.tp === 0) { S.x = S.tx; S.p = 0; draw(); S.raf = 0; S.last = 0; return; }
    S.raf = requestAnimationFrame(step);
  }
  const run = () => { if (!S.raf) { S.last = 0; S.raf = requestAnimationFrame(step); } };

  function rest() {
    if (!bar.isConnected) { removeEventListener('resize', rest); return; } // the page redrew this bar
    S.sel = Math.max(0, items.findIndex((tab) => tab.hasAttribute('aria-current') || tab.getAttribute('aria-selected') === 'true'));
    S.x = S.tx = items[S.sel].offsetLeft; S.vx = S.p = S.vp = S.tp = 0; S.down = false;
    draw();
  }
  rest();
  addEventListener('resize', rest);
  document.fonts?.ready.then(rest);

  // A link or picture must not start a native drag or a long-press menu: either would cancel the pointer.
  ['dragstart', 'contextmenu'].forEach((type) => bar.addEventListener(type, (event) => event.preventDefault()));
  bar.addEventListener('pointerdown', (event) => {
    pointerAt = performance.now();
    clearTimeout(S.stall); S.done = null; // a new touch replaces a tab still waiting to land
    S.down = true; S.tp = 1; S.id = event.pointerId; S.full = false;
    try { bar.setPointerCapture(event.pointerId); } catch { /* the pointer has already gone */ }
    clearTimeout(S.hold);
    S.hold = setTimeout(() => { if (S.down) { S.full = true; run(); } }, HOLD_MS);
    S.tx = items[nearest(local(event))].offsetLeft;
    S.from = local(event);
    if (reduced.matches) { S.x = S.tx; S.p = 1; draw(); return; }
    run();
  });
  bar.addEventListener('pointermove', (event) => {
    if (!S.down || event.pointerId !== S.id) return;
    const cx = local(event);
    if (Math.abs(cx - S.from) < DEAD_ZONE) return;
    if (!S.full) { S.full = true; run(); }
    const w = items[0].offsetWidth;
    S.tx = Math.max(items[0].offsetLeft - 6, Math.min(items.at(-1).offsetLeft + 6, cx - w / 2));
  });
  ['pointerup', 'pointercancel'].forEach((type) => bar.addEventListener(type, (event) => {
    if (!S.down || event.pointerId !== S.id) return;
    S.down = false; clearTimeout(S.hold);
    const chosen = nearest(S.tx + items[0].offsetWidth / 2);
    if (type === 'pointerup') {
      S.sel = chosen;
      const landed = () => { if (S.done === landed) S.done = null; else if (!S.done) return; clearTimeout(S.stall); onChoose(items[chosen], 'landed'); };
      S.done = landed;
      S.stall = setTimeout(landed, LANDED_BY);
      onChoose(items[chosen], 'chosen');
    }
    S.tx = items[S.sel].offsetLeft;
    S.release = performance.now() + (S.full ? 105 : 60); // a tap drops in sooner
    if (reduced.matches) { S.x = S.tx; S.p = 0; S.tp = 0; draw(); S.done?.(); return; }
    run();
  }));
  return { rest };
}

// A category bar (TOKENS 8.3) whose tab change redraws the page: the lens picks the tab, and the tab's own click runs
// once it has dropped in, so the change lands as the lens does. Keyboard clicks go straight through.
let dropsClicks = false;
export function mountBarLens(box) {
  if (!box) return;
  if (!dropsClicks) {
    dropsClicks = true;
    addEventListener('click', (event) => {
      if (pointerClick(event) && event.target.closest?.('.tabs')) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
  }
  mountLens(box, (tab, moment) => { if (moment === 'landed') tab.click(); }, { bar: '.tabs', item: '.tab', speed: 0.7 });
}
