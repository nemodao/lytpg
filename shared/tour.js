// Guided tour (spec §38): five steps across Home and Coins that explain how to earn coins and redeem gifts.
// It opens by itself the first time Home is opened on a device, and again from the help button in Home's header.
// While it runs, nothing but the tour pop-up can be tapped.
//
// To add, remove or reorder steps, edit STEPS: one entry per step (id, the page it runs on, the element to
// highlight, and its copy keys tour.<id>.*; `rules: true` adds the shared "How it works" list to the pop-up; `art` names the artwork shown above the
// title, see ART). Progress travels between pages in the URL (?tour=<id>), so it does not
// depend on storage; "already seen" is remembered on the device (localStorage).

import { rulesList } from './components.js';

const STEPS = [
  { id: 1, page: 'dashboard', file: 'dashboard.html', target: null, art: 'step-1', fingerAfter: 2, sparkles: true },
  { id: 2, page: 'dashboard', file: 'dashboard.html', target: null, art: 'step-2', rules: true, needsTask: true, fingerAfter: 7 },
  { id: 3, page: 'point-balance', file: 'point-balance.html', target: '[data-tour="balance"]', effect: 'coins', note: true },
  { id: 4, page: 'point-balance', file: 'point-balance.html', target: '[data-tour="redeem"]', effect: 'gifts', art: 'step-4' },
  { id: 5, page: 'point-balance', file: 'point-balance.html', target: '[data-tour="tabs"]', list: 3 },
];
const SEEN_KEY = 'hsb-loyalty-tour-seen';
const COUNT_MS = 1500;
// A finger appears under the pop-up's main (blue) button to nudge the user on: after FINGER_AFTER seconds, or the
// step's own `fingerAfter`. Its tip sits at FINGER_TIP (fractions of the image's width and height).
const FINGER_AFTER = 4;
const FINGER_TIP = { x: 0.9, y: 0.03 };

// Carousels: how many items (assets/tour/<name>-<n>.webp) and how long each rests at the front, in seconds.
const CAROUSELS = {
  'step-1': { holds: [2, 4, 4, 4] },
  'step-4': { holds: [2.5, 2.5, 2.5, 2.5, 2.5] },
};
const CAROUSEL_MOVE = 1.2; // seconds to change from one item to the next
const carousel = (name) => `
  <div class="tour__art" data-carousel="${name}" aria-hidden="true">
    ${CAROUSELS[name].holds.map((_, index) => `<img src="../assets/tour/${name}-${index + 1}.webp" alt="" ${index ? 'style="opacity:0"' : ''}>`).join('')}
  </div>`;
const smooth = (t) => t * t * (3 - 2 * t);

// The items sit on an elliptical path and move right to left. Only the front one is visible: as it moves off to the
// left it shrinks and fades out, while the next fades in from the right. (Same motion as tools/build-tour-animation.py.)
function runCarousel(node, reducedMotion) {
  const { holds } = CAROUSELS[node.dataset.carousel];
  const images = [...node.querySelectorAll('img')];
  if (reducedMotion) return; // the first item simply stays
  const count = holds.length;
  const total = holds.reduce((sum, hold) => sum + hold + CAROUSEL_MOVE, 0);
  const started = performance.now();
  const turnAt = (time) => {
    for (let step = 0; step < count; step += 1) {
      if (time < holds[step]) return step;
      time -= holds[step];
      if (time < CAROUSEL_MOVE) return step + smooth(time / CAROUSEL_MOVE);
      time -= CAROUSEL_MOVE;
    }
    return 0;
  };
  const frame = (now) => {
    if (!node.isConnected) return; // the step was closed
    const turn = turnAt(((now - started) / 1000) % total);
    const width = node.clientWidth;
    images.forEach((image, place) => {
      const awaySigned = ((place - turn + count / 2) % count + count) % count - count / 2; // 0 front, +1 right, -1 left
      const away = Math.abs(awaySigned);
      if (away >= 1) { image.style.opacity = 0; return; }
      const depth = Math.cos(awaySigned * Math.PI / 2);
      const x = width * 0.378 * Math.sin(awaySigned * Math.PI / 2);
      const y = width * 0.036 * (depth - 1);
      image.style.opacity = 1 - smooth(away);
      image.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.55 + 0.45 * depth).toFixed(3)})`;
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Artwork above a step's title.
const ART = {
  // Steps 1 and 4: a looping carousel of still images, animated in code (see `runCarousel`), so it stays sharp on
  // every screen. Step 1: coin, crown, gift box, cup. Step 4: phone, earbuds, laptop, travel, foldable phone.
  'step-1': () => carousel('step-1'),
  'step-4': () => carousel('step-4'),
  // Step 2: trading turns into coins. The candles appear, then the arrow, then the coin with a "+" popping on it,
  // and everything stays still after that (it plays once, so it does not distract from the rules below).
  'step-2': (ui) => `
    <div class="tour__flow" aria-hidden="true">
      <img class="tour__flow-item tour__flow-item--1" src="../assets/tour/step-2-candles.webp" alt="">
      <span class="tour__flow-arrow">${ui.icon('arrow-right')}</span>
      <span class="tour__flow-coin">
        <img class="tour__flow-item tour__flow-item--2" src="../assets/tour/step-2-coin.webp" alt="">
        <b class="tour__flow-plus">+</b>
        <i class="tour__flow-spark tour__flow-spark--1">+</i>
        <i class="tour__flow-spark tour__flow-spark--2">+</i>
      </span>
    </div>`,
};

const seen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage unavailable */ } };

// `page` is this page's id.
export function mountTour(ui, common, page) {
  // Placeholders in the copy: {max} is the highest earning rate ("Earn up to {max} coins per lot").
  const vars = { max: ui.num(Math.max(...common.rates.map((rate) => rate.ptsPerLot))) };
  const params = new URLSearchParams(location.search);
  const app = document.getElementById('app');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Steps that need the trading task are skipped when the programme runs none; the choice made on Home is carried
  // along in the URL so the other pages count the same steps.
  const skipped = new Set((params.get('tourskip') || '').split(',').filter(Boolean).map(Number));
  if (common.program.tradingTask === false) STEPS.filter((step) => step.needsTask).forEach((step) => skipped.add(step.id));
  const steps = STEPS.filter((step) => !skipped.has(step.id));

  // Step 3 counts the balance up from the user's real balance to a simulated figure. A user who already has that
  // many coins or more sees no movement at all.
  const simulated = common.balance.available < common.tour.simulatedBalance;

  let current = null; // the step on screen
  let layer = null;
  const balanceNode = () => app.querySelector('.balance-number');

  function urlFor(step) {
    const base = ui.href(step.file);
    const extra = [`tour=${step.id}`, ...(skipped.size ? [`tourskip=${[...skipped].join(',')}`] : [])].join('&');
    return `${base}${base.includes('?') ? '&' : '?'}${extra}`;
  }

  // The page URL without the tour parameters.
  function cleanUrl() {
    const query = new URLSearchParams(location.search);
    query.delete('tour');
    query.delete('tourskip');
    const text = query.toString().replace(/%2C/g, ',');
    return location.pathname + (text ? `?${text}` : '');
  }

  function go(step) {
    if (step.page !== page) { location.assign(urlFor(step)); return; }
    history.replaceState(null, '', urlFor(step));
    show(step);
  }

  function end({ home }) {
    markSeen();
    if (home && page !== 'dashboard') location.assign(ui.href('dashboard.html'));
    else location.replace(cleanUrl()); // reload without the tour: simulated numbers go back to the real ones
  }

  // Step 3: the balance counts up to a simulated figure while plus signs and small coins pop around it.
  function coinEffect(rect) {
    const node = balanceNode();
    if (!node) return;
    if (!simulated) return; // the user already has more coins than the simulated figure: nothing moves
    const from = common.balance.available;
    const to = common.tour.simulatedBalance;
    if (reducedMotion) { node.textContent = ui.num(to); return; }
    const started = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / COUNT_MS);
      node.textContent = ui.num(Math.round(from + (to - from) * (1 - (1 - progress) ** 3)));
      if (progress < 1 && current && current.effect === 'coins') requestAnimationFrame(frame);
      else node.textContent = ui.num(to);
    };
    requestAnimationFrame(frame);

    burst(rect, Array.from({ length: 14 }, (_, index) => {
      const style = `left:${(8 + Math.random() * 84).toFixed(1)}%;top:${(20 + Math.random() * 60).toFixed(1)}%;animation-delay:${(Math.random() * 1.3).toFixed(2)}s`;
      return index % 2
        ? `<img class="tour__pop" src="../assets/images/coin.png" alt="" style="${style}">`
        : `<span class="tour__pop tour__pop--plus" style="${style}">+</span>`;
    }));
  }

  // Step 4: small gift boxes pop up around the Redeem button when the step opens. Once, then nothing moves.
  function giftEffect(rect) {
    if (reducedMotion) return;
    // Spots around the button (x, y in px from its top-left corner; it sits near the right edge of the screen).
    const spots = [[-34, -20], [-6, -30], [rect.width * 0.45, -34], [rect.width - 14, -28], [-40, 6], [rect.width - 2, 10], [-22, rect.height + 2], [rect.width * 0.5, rect.height + 8]];
    burst(rect, spots.map(([x, y], index) =>
      `<img class="tour__pop tour__pop--gift" src="../assets/tour/gift.webp" alt="" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;animation-delay:${(0.15 + index * 0.12).toFixed(2)}s">`));
  }

  // Short-lived layer of popping items placed over `rect`.
  function burst(rect, items, lifetime = 2600) {
    const node = document.createElement('div');
    node.className = 'tour__burst';
    node.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
    node.innerHTML = items.join('');
    layer.appendChild(node);
    setTimeout(() => node.remove(), lifetime);
  }

  function show(step) {
    close();
    current = step;
    const index = steps.indexOf(step);
    const isLast = index === steps.length - 1;
    const target = step.target ? app.querySelector(step.target) : null;

    // Bring the highlighted part near the top, then stop the page from scrolling under the tour.
    if (target) window.scrollTo(0, Math.max(0, target.getBoundingClientRect().top + window.scrollY - 48)); // room above the highlight for effects that pop around it
    else window.scrollTo(0, 0);
    document.documentElement.classList.add('tour-open');

    // Simulated balance on the Coins page from the "coins arrive" step onwards.
    const simulate = steps.find((item) => item.effect === 'coins');
    if (simulated && simulate && page === simulate.page && index > steps.indexOf(simulate) && balanceNode()) balanceNode().textContent = ui.num(common.tour.simulatedBalance);

    const body = step.list
      ? `<ul class="tour__list">${Array.from({ length: step.list }, (_, item) => `<li>${ui.md(`tour.${step.id}.item${item + 1}`, vars)}</li>`).join('')}</ul>`
      : `<p class="t-body c-2 num">${ui.md(`tour.${step.id}.body`, vars)}</p>`;
    layer = document.createElement('div');
    layer.className = 'tour';
    layer.innerHTML = `
      <div class="tour__spot ${target ? '' : 'tour__spot--none'}"></div>
      <div class="tour__card" role="dialog" aria-modal="true" aria-labelledby="tour-title" tabindex="-1">
        <div class="tour__top">
          <span class="tour__count t-caption c-3 num">${index > 0 ? ui.t('tour.count', { current: index + 1, total: steps.length }) : ''}</span>
          ${isLast ? '' : `<button class="tour__skip" type="button" data-tour-action="skip">${ui.t('tour.skip')}</button>`}
        </div>
        ${step.art ? ART[step.art](ui) : ''}
        <h2 class="t-title-s" id="tour-title">${ui.t(`tour.${step.id}.title`)}</h2>
        ${body}
        ${step.rules ? `<div class="tour__rules">${rulesList(ui, common)}</div>` : ''}
        ${step.note && simulated ? `<p class="t-caption c-3">${ui.t(`tour.${step.id}.note`)}</p>` : ''}
        <div class="tour__actions">
          ${index > 0 ? `<button class="btn btn--stroke btn--sm" type="button" data-tour-action="back">${ui.t('tour.back')}</button>` : ''}
          <button class="btn btn--primary btn--sm" type="button" data-tour-action="next">${ui.t(`tour.${step.id}.cta`)}</button>
        </div>
      </div>
      <img class="tour__finger" src="../assets/tour/finger.webp" alt="" style="--finger-after:${step.fingerAfter || FINGER_AFTER}s">`;
    document.body.appendChild(layer);

    // Place the highlight on the target and the card under it (or above it, or pinned to the bottom, when there is no room);
    // without a target the card sits in the middle of the screen.
    const frame = app.getBoundingClientRect();
    const card = layer.querySelector('.tour__card');
    const spot = layer.querySelector('.tour__spot');
    const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spacing-gutter')) || 16;
    card.style.left = `${frame.left + gutter}px`;
    card.style.width = `${frame.width - gutter * 2}px`;
    let rect = null;
    if (target) {
      rect = target.getBoundingClientRect();
      const pad = 6;
      spot.style.cssText = `left:${rect.left - pad}px;top:${rect.top - pad}px;width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;border-radius:${getComputedStyle(target).borderRadius}`;
      const below = rect.bottom + pad + 12;
      const above = rect.top - pad - 12 - card.offsetHeight;
      if (below + card.offsetHeight <= window.innerHeight - gutter) card.style.top = `${below}px`;
      else if (above >= gutter) card.style.top = `${above}px`;
      else card.style.bottom = `calc(env(safe-area-inset-bottom, 0px) + ${gutter}px)`;
    } else {
      card.style.top = `${Math.max(gutter, (window.innerHeight - card.offsetHeight) / 2)}px`;
    }
    if (step.effect === 'coins' && rect) coinEffect(rect);
    if (step.effect === 'gifts' && rect) giftEffect(rect);
    const carouselNode = card.querySelector('[data-carousel]');
    if (carouselNode) runCarousel(carouselNode, reducedMotion);

    // The finger points up at the main button from just below it, its tip just touching the button's lower edge (so it does not cover the label).
    const finger = layer.querySelector('.tour__finger');
    const button = card.querySelector('[data-tour-action="next"]').getBoundingClientRect();
    const fingerWidth = finger.offsetWidth;
    const fingerHeight = fingerWidth * 1.21; // the artwork's height / width
    finger.style.left = `${button.left + button.width / 2 - fingerWidth * FINGER_TIP.x}px`;
    finger.style.top = `${Math.min(button.bottom - 3 - fingerHeight * FINGER_TIP.y, window.innerHeight - fingerHeight - 4)}px`;
    // Step 1 only: gold sparkles, large and small, pop at random spots around the main button; the finger comes in
    // with the first of them, and sits above them.
    if (step.sparkles && !reducedMotion) {
      const reach = 22; // px the sparkles may spread beyond the button's edges
      const TOP = 4; // extra sparkles kept above the button, so the top is not left bare
      const sparkles = Array.from({ length: 10 + TOP }, (_, index) => {
        const size = 6 + Math.random() * 11; // 6–17px
        // A random point in the band around the button: outside its middle, within `reach` of its edges.
        let x; let y;
        do {
          x = -reach + Math.random() * (button.width + reach * 2);
          y = index < TOP ? -reach - 8 + Math.random() * (reach + 4) : -reach + Math.random() * (button.height + reach * 2);
        } while (x > 10 && x < button.width - 10 && y > 6 && y < button.height - 6);
        const delay = 2 + Math.random() * 1.2; // they start with the finger, 2 s in
        return `<img class="tour__sparkle" src="../assets/tour/sparkle.webp" alt="" style="left:${(x - size / 2).toFixed(0)}px;top:${(y - size / 2).toFixed(0)}px;width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;animation-delay:${delay.toFixed(2)}s">`;
      });
      burst(button, sparkles, 4400);
    }
    card.focus({ preventScroll: true }); // focus the pop-up itself, so no button shows a focus ring on open
  }

  function close() {
    if (layer) layer.remove();
    layer = null;
    current = null;
    document.documentElement.classList.remove('tour-open');
  }

  document.addEventListener('click', (event) => {
    if (!layer) return;
    const button = event.target.closest('[data-tour-action]');
    if (!button) return;
    const index = steps.indexOf(current);
    const action = button.dataset.tourAction;
    if (action === 'skip') end({ home: false });
    else if (action === 'back') go(steps[index - 1]);
    else if (index === steps.length - 1) end({ home: true });
    else go(steps[index + 1]);
  });

  // Keep the highlight in place when the screen size changes.
  window.addEventListener('resize', () => { if (current) show(current); });

  const start = () => go(steps[0]);

  // Resume the step named in the URL, or open the tour on the first visit to Home. `?tour=off` never opens it.
  const wanted = params.get('tour');
  const resumed = steps.find((step) => String(step.id) === wanted && step.page === page);
  if (resumed) show(resumed);
  else if (wanted !== 'off' && !wanted && page === 'dashboard' && (!seen() || common.tour.firstVisit)) start();

  return { start };
}
