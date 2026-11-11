// Fit (TOKENS §3.4, §12; FIT_AUDIT S1, S2, S3, S5): small screens and large text. Layout only: no copy, value or
// number-format change.
//
// - Large text. A probe sets html[data-large-text] when the OS text size is above 1: a hidden run in the 100px/100px
//   font token, compared with the same run measured off the page (canvas, at --fit-probe-size, which text zoom never
//   touches). Page zoom (a narrow viewport at 1.0) is not large text. In large text nothing shrinks; chrome text
//   (buttons, tags, tabs) is capped at --hsb-fit-chrome-cap times its size.
// - One ratio per element. Everything in one element (a row, a card's figures, a list's rows) shrinks by one factor,
//   down to its floor, --hsb-fit-floor-ratio of its size. At 1.0 an element takes its alternate layout only when it
//   misses at its floor; in large text only when it misses at its real size. The rows of one list switch together.
// - Money never cut: after the floor it wraps, at its separators only (break points after "," "." or a space between
//   digits, never inside a digit group).
//
// Each fitter below is one element family; this module watches the page and runs them when an element appears, its
// width or text changes, the web font loads, or large text switches.
import { tok, tokNum } from './tokens.js';

const root = document.documentElement;
const floor = () => tokNum('fit-floor-ratio');
const cap = () => tokNum('fit-chrome-cap');
const large = () => root.hasAttribute('data-large-text');

// ---- Large text ----
let scale = 1;
function probe() {
  const css = getComputedStyle(root);
  const size = parseFloat(css.getPropertyValue('--fit-probe-size'));
  if (!size) return;
  const run = document.createElement('span');
  run.textContent = 'MMMMMMMMMM';
  run.setAttribute('aria-hidden', 'true');
  run.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;font:var(--fit-probe-font)';
  document.body.append(run);
  const drawn = run.getBoundingClientRect().width;
  const style = getComputedStyle(run);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
  const plain = ctx.measureText(run.textContent).width;
  run.remove();
  if (!plain) return;
  scale = Math.round((drawn / plain) * 100) / 100;
  // Above 1 (fit.largeTextAbove): text drawn larger than the page asks for.
  const on = scale > 1;
  if (on !== large()) {
    root.toggleAttribute('data-large-text', on);
    rerunAll();
  }
}

// Chrome text in large text: at most cap x its size. The font tokens already carry the OS scale, so the label is set
// back to (cap / scale) of what it draws at. Kept per element, so a re-run never compounds.
const CHROME = '.btn, .badge, .tab, .chip'; // not .nav__tab: nav-lens.js measures it (L-28, a later round)
function capChrome(scope) {
  const k = large() ? Math.min(1, cap() / scale) : 1;
  scope.querySelectorAll(CHROME).forEach((el) => {
    if (el.dataset.fitCap === String(k)) return;
    el.style.removeProperty('font-size'); el.style.removeProperty('line-height');
    if (k < 1) {
      const cs = getComputedStyle(el);
      el.style.fontSize = `${parseFloat(cs.fontSize) * k}px`;
      if (cs.lineHeight.endsWith('px')) el.style.lineHeight = `${parseFloat(cs.lineHeight) * k}px`;
    }
    el.dataset.fitCap = String(k);
  });
}

// ---- Measuring ----
// The width an element takes on one line, or at its narrowest (min-content), with nothing around it squeezing it.
function natural(el, kind = 'max-content') {
  const s = el.style;
  const saved = [s.width, s.minWidth, s.maxWidth, s.flex, s.whiteSpace, s.flexWrap, s.display];
  s.width = kind; s.minWidth = '0'; s.maxWidth = 'none'; s.flex = 'none';
  if (kind === 'max-content') { s.whiteSpace = 'nowrap'; s.flexWrap = 'nowrap'; }
  if (getComputedStyle(el).display === 'contents') s.display = 'block';
  const w = el.getBoundingClientRect().width;
  [s.width, s.minWidth, s.maxWidth, s.flex, s.whiteSpace, s.flexWrap, s.display] = saved;
  return w;
}
const inner = (el) => { const cs = getComputedStyle(el); return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
const gapOf = (el) => parseFloat(getComputedStyle(el).columnGap) || 0;
// Half a pixel kept back: clientWidth rounds, and a run that fits to the last sub-pixel would still break.
const ratio = (room, need) => (need > 0 ? Math.min(1, Math.floor(((room - 0.5) / need) * 1000) / 1000) : 1);

// Shrink a group by one ratio (CSS zoom: text, icon and padding together).
const zoom = (els, r) => els.forEach((el) => { if (el) el.style.zoom = r < 1 ? String(r) : ''; });
const unzoom = (els) => els.forEach((el) => { if (el) el.style.removeProperty('zoom'); });

// Money: a break point after each separator that sits between two digits. Idempotent (a split run has no digit after
// its separator), and invisible while the element stays on one line.
// (No lookbehind: older iOS webviews cannot parse it.) The break goes after group 1.
const SEP = /(\d[,.   ])(?=\d)/g; // money: after a separator between digits
const DOT = /(\w\.)(?=\w)/g; // a symbol: after its suffix dot (XAUUSD.|micro)
const cutsOf = (text, at) => { const cuts = []; at.lastIndex = 0; for (let m = at.exec(text); m; m = at.exec(text)) cuts.push(m.index + m[1].length); return cuts; };
function breakable(el, at = SEP) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const runs = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (cutsOf(node.data, at).length) runs.push(node);
  runs.forEach((node) => {
    const frag = document.createDocumentFragment();
    let from = 0;
    cutsOf(node.data, at).forEach((cut) => { frag.append(node.data.slice(from, cut), document.createElement('wbr')); from = cut; });
    frag.append(node.data.slice(from));
    node.replaceWith(frag);
  });
}
const keepUnit = (el) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.data.includes('/ ')) node.data = node.data.replace(/\/ /g, '/\u00a0');
};
const wrapMoney = (els, on) => els.forEach((el) => {
  if (!el) return;
  if (on) breakable(el);
  el.classList.toggle('fit-wrap', on);
  if (!on) ownLine(el, false);
});

// TOKENS §3.4 "A small miss wraps, a big miss moves" (UI Designer 1, 11 Nov): wrapped money that needs more than 2 lines
// beside a neighbour takes its own line at full width instead. Run after each fitter on the money it wrapped.
// Lines the money itself takes: its longest run of digits and separators (the words of a sentence around it do not count).
const MONEY_CHAR = /[0-9,.+\u2212-]/;
const linesOf = (el) => {
  let run = []; let best = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (let i = 0; i < node.data.length; i += 1) {
      if (!MONEY_CHAR.test(node.data[i])) { if (run.length > best.length) best = run; run = []; continue; }
      const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
      const rect = range.getClientRects()[0];
      if (rect) run.push(rect.top);
    }
  }
  if (run.length > best.length) best = run;
  const tops = [];
  best.forEach((top) => { if (!tops.some((t) => Math.abs(t - top) <= 3)) tops.push(top); });
  return tops.length;
};
const besideOf = (el) => {
  const r = el.getBoundingClientRect();
  return [...el.parentElement.children].some((o) => {
    if (o === el) return false;
    const q = o.getBoundingClientRect();
    return q.width > 1 && q.bottom > r.top + 2 && q.top < r.bottom - 2 && (q.right <= r.left + 1 || q.left >= r.right - 1);
  });
};
function ownLine(el, on) {
  el.classList.toggle('fit-own-line', on);
  if (on) el.parentElement.classList.add('fit-own-line-parent');
  else if (!el.parentElement.querySelector(':scope > .fit-own-line')) el.parentElement.classList.remove('fit-own-line-parent');
}
function bigMiss(scope) {
  const money = scope.matches('.fit-wrap') ? [scope] : [...scope.querySelectorAll('.fit-wrap')];
  money.forEach((el) => { if (!el.classList.contains('fit-own-line') && linesOf(el) > 2 && besideOf(el)) ownLine(el, true); });
}

// One element of money: shrink to the floor, then wrap (normal); large text: wrap only if it misses.
function money(el, room) {
  unzoom([el]); el.classList.remove('fit-wrap');
  const r = ratio(room, natural(el));
  if (large()) { wrapMoney([el], r < 1); return; }
  zoom([el], Math.max(r, floor()));
  wrapMoney([el], r < floor());
}

// ---- The fitters (one per element family) ----
const FITTERS = [];
const fitter = (selector, run, accept = () => true) => FITTERS.push({ selector, run, accept });

// L-01, L-02 (S4): the balance block. Label, tier and figure one ratio; missing at the floor (or at its real size in
// large text), the figure takes its own line across the card (balance--stacked), wrapping at separators. If the first
// line (coin, label, Redeem) still has no room, Redeem goes under the figure (the element wraps, §3.4).
fitter('.balance-row', (row) => {
  const card = row.closest('.balance');
  const col = row.querySelector('.grow');
  const figure = row.querySelector('.balance-number');
  const label = row.querySelector('.balance-label');
  card.classList.remove('balance--stacked', 'balance--stacked-redeem', 'balance--stacked-label');
  unzoom([figure, label]); figure.classList.remove('fit-wrap');
  const r = ratio(col.clientWidth, natural(figure));
  if (r === 1 || (!large() && r >= floor())) { zoom([figure, label], r); fitTier(label, r); return; }
  card.classList.add('balance--stacked');
  if (inner(row) < natural(row.querySelector('.coin--lg')) + gapOf(row) * 2 + natural(label, 'min-content') + natural(row.querySelector('.balance-side'))) {
    card.classList.add('balance--stacked-redeem');
  }
  // Narrower still, "Coin Balance" and its tier have no room beside the coin: they take their own line too.
  if (inner(row) < natural(row.querySelector('.coin--lg')) + gapOf(row) + natural(label, 'min-content')) card.classList.add('balance--stacked-label');
  money(figure, inner(row));
  fitTier(label, 1);
});
// The tier tag on the label's line: shrinks to the floor to stay there, else goes under the label (no shrink in large text).
function fitTier(label, outer) {
  const badge = label.querySelector('.balance-tier');
  if (!badge) return;
  unzoom([badge]);
  if (large()) return;
  const room = label.clientWidth - natural(label.firstElementChild) - gapOf(label) - 1;
  const r = ratio(room, natural(badge));
  if (r < 1 && r * outer >= floor()) zoom([badge], r); // never below the floor with the column's own ratio
}

// L-03: the expiring figure in the warning sentence breaks at its separators when it is wider than the line.
fitter('.notice--warning .num', (p) => {
  p.parentElement.classList.remove('notice--stacked');
  wrapMoney([p], p.scrollWidth > p.clientWidth + 1 || natural(p, 'min-content') > inner(p.parentElement));
  // A big miss moves (§3.4): the figure would take 3+ lines beside the icon, so the sentence takes the full width under it.
  if (linesOf(p) > 2) p.parentElement.classList.add('notice--stacked');
});

// L-07: reward card prices, one ratio across the grid; then wrap. Runs after dashboard.js's fitPrices has put Redeem
// under the price where needed.
fitter('.reward-grid', (grid) => {
  const prices = [...grid.querySelectorAll('.reward-card:not(.reward-card--earn) .reward-card__price')];
  unzoom(prices); wrapMoney(prices, false);
  // A price too long to share its row with Redeem pushes Redeem under it, on every card (spec §49; was fitPrices).
  grid.classList.remove('reward-grid--stacked');
  const wrapped = [...grid.querySelectorAll('.reward-card__foot')]
    .some((foot) => foot.lastElementChild.offsetTop > foot.firstElementChild.offsetTop + foot.firstElementChild.offsetHeight / 2);
  grid.classList.toggle('reward-grid--stacked', wrapped);
  const r = Math.min(...prices.map((price) => ratio(price.parentElement.clientWidth, natural(price))));
  if (large()) { wrapMoney(prices, r < 1); return; }
  zoom(prices, Math.max(r, floor()));
  wrapMoney(prices, r < floor());
});

// L-06, L-23 (S3): button labels. One line; the label shrinks to its floor (font size, the control keeps its height).
// A pair shares one ratio; a pair that misses at the floor, or at its real size in large text, stacks (primary on top).
function labelRatio(btn, room) {
  const cs = getComputedStyle(btn);
  // Only the label's text shrinks: padding, icons and the gaps between them keep their size.
  const fixed = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
    + [...btn.children].reduce((sum, el) => sum + el.getBoundingClientRect().width + gapOf(btn), 0);
  return ratio(room - fixed, natural(btn) - fixed);
}
function shrinkLabel(btn, r) {
  btn.style.removeProperty('font-size');
  if (r >= 1) return;
  btn.style.fontSize = `${parseFloat(getComputedStyle(btn).fontSize) * r}px`;
}
fitter('.rewards-more__cta', (btn) => {
  const card = btn.closest('.rewards-more');
  card?.classList.remove('rewards-more--stacked');
  btn.style.removeProperty('font-size'); btn.classList.remove('fit-wrap-label');
  delete btn.dataset.fitCap; capChrome(btn.parentElement);
  let r = labelRatio(btn, inner(btn.parentElement));
  if (large()) {
    btn.classList.toggle('fit-wrap-label', r < 1); // large text: the label wraps, the control grows
    // Even wrapped, its longest word has no room in the text column: the column goes under the gift.
    if (card && natural(btn, 'min-content') > inner(btn.parentElement) + 1) card.classList.add('rewards-more--stacked');
    return;
  }
  // A button label never wraps at normal size (§3.4): when it misses at its floor the card gives way first, the text
  // column going under the gift so the button has the card's width; only past that does the label wrap.
  if (r < floor() && card) { card.classList.add('rewards-more--stacked'); r = labelRatio(btn, inner(btn.parentElement)); }
  shrinkLabel(btn, Math.max(r, floor()));
  btn.classList.toggle('fit-wrap-label', r < floor());
});
fitter('.reward-soon__pair', (pair) => {
  const btns = [...pair.querySelectorAll('.btn')];
  pair.classList.remove('reward-soon__pair--stacked');
  btns.forEach((btn) => { btn.style.removeProperty('font-size'); delete btn.dataset.fitCap; });
  capChrome(pair);
  const r = Math.min(...btns.map((btn) => labelRatio(btn, btn.getBoundingClientRect().width)));
  if (r === 1) return;
  if (!large() && r >= floor()) { btns.forEach((btn) => shrinkLabel(btn, r)); return; }
  pair.classList.add('reward-soon__pair--stacked');
});

// L-12: Earn's Today figures, one ratio for both; missing, they stack ("You traded" over "Coins earned").
const valueNeed = (value) => { const unit = value.querySelector('small'); return natural(value) - (unit ? natural(unit) + gapOf(value) : 0); };
fitter('.today__stats', (stats) => {
  const values = [...stats.querySelectorAll('.today__value')];
  stats.classList.remove('today__stats--stacked');
  unzoom(values); wrapMoney(values, false);
  const r = Math.min(...values.map((value) => ratio(value.parentElement.clientWidth, valueNeed(value))));
  if (r === 1 || (!large() && r >= floor())) { zoom(values, r); return; }
  stats.classList.add('today__stats--stacked');
  const r2 = Math.min(...values.map((value) => ratio(value.parentElement.clientWidth, valueNeed(value))));
  if (large()) { wrapMoney(values, r2 < 1); return; }
  zoom(values, Math.max(r2, floor()));
  wrapMoney(values, r2 < floor());
});

// L-13: the rate list, label and rate one ratio across every row; missing, every rate goes under its label. The symbol
// is never cut: at its floor it breaks (only a single code longer than the line does).
fitter('.rates-frame', (frame) => {
  const rows = [...frame.querySelectorAll('.list__row')];
  const parts = rows.flatMap((row) => [row.querySelector('.grow'), row.querySelector('.rate')]);
  frame.classList.remove('rates-frame--stacked', 'fit-break');
  unzoom(parts); wrapMoney(parts.filter((el) => el.matches('.rate')), false);
  // The row's gap is not zoomed: it comes off the room, not into the need.
  const r = Math.min(...rows.map((row) => ratio(row.clientWidth - gapOf(row), natural(row.querySelector('.grow')) + natural(row.querySelector('.rate')))));
  if (r === 1 || (!large() && r >= floor())) { zoom(parts, r); return; }
  frame.classList.add('rates-frame--stacked');
  const r2 = Math.min(...parts.map((el) => ratio(el.parentElement.clientWidth, natural(el))));
  if (!large()) zoom(parts, Math.max(r2, floor()));
  const miss = large() ? r2 < 1 : r2 < floor();
  frame.classList.toggle('fit-break', miss);
  if (miss) parts.filter((el) => el.matches('.grow')).forEach((el) => breakable(el, DOT));
  // "/ lot" stays together, so a rate that must wrap breaks before the slash, never after it.
  if (miss) parts.filter((el) => el.matches('.rate')).forEach(keepUnit);
  wrapMoney(parts.filter((el) => el.matches('.rate')), miss);
});

// L-14 (S5): the account field and the sheet's options. Number, tier and Eligible one ratio (a sheet's rows together);
// missing, the number takes line 1 and the tags line 2. The number is never cut: at its floor it breaks.
const accountNeed = (lines) => natural(lines.querySelector('.account-name')) + gapOf(lines) + [...lines.children].filter((el) => !el.matches('.account-name')).reduce((sum, el) => sum + natural(el), 0);
fitter('.account-lines', (lines) => {
  const group = [...(lines.closest('.sheet') ?? lines.parentElement).querySelectorAll('.account-lines')];
  if (lines !== group[0]) return; // the group runs once, from its first field
  group.forEach((item) => { item.classList.remove('account-lines--stacked', 'fit-break'); item.parentElement.classList.remove('select--wrap'); unzoom([item]); });
  const r = Math.min(...group.map((item) => ratio(item.clientWidth, accountNeed(item))));
  if (r === 1 || (!large() && r >= floor())) { zoom(group, r); return; }
  group.forEach((item) => item.classList.add('account-lines--stacked'));
  const need2 = (item) => Math.max(natural(item.querySelector('.num')), ...[...item.querySelectorAll('.badge')].map((b) => natural(b)));
  let r2 = Math.min(...group.map((item) => ratio(item.clientWidth, need2(item))));
  // A big miss moves (§3.4): the number would still break beside the chevron or radio, so the field wraps: number and
  // tags across its full width, the chevron or radio under them on the right.
  if (large() ? r2 < 1 : r2 < floor()) {
    group.forEach((item) => item.parentElement.classList.add('select--wrap'));
    r2 = Math.min(...group.map((item) => ratio(item.clientWidth, need2(item))));
  }
  if (!large()) zoom(group, Math.max(r2, floor()));
  group.forEach((item) => item.classList.toggle('fit-break', large() ? r2 < 1 : r2 < floor()));
}, (lines) => !lines.querySelector('.skeleton__bar'));

// L-15: Coins' lot rows, the source line and the figures one ratio across the list; missing, the figures go under the
// source line on every row.
const lotRows = (list) => [...list.children].filter((row) => row.matches('.list__row') && row.querySelector(':scope > .list__end'));
fitter('.list', (list) => {
  const rows = lotRows(list);
  list.classList.remove('lots--stacked');
  const parts = rows.flatMap((row) => [...row.querySelector(':scope > .grow').children, row.querySelector(':scope > .list__end')]);
  const figures = rows.flatMap((row) => [...row.querySelectorAll('.amount')]);
  unzoom(parts); wrapMoney(figures, false);
  const need = (row) => natural(row.querySelector(':scope > .grow > :first-child')) + natural(row.querySelector(':scope > .list__end')); // the row gap comes off the room
  const r = Math.min(...rows.map((row) => ratio(row.clientWidth - gapOf(row), need(row))));
  if (r === 1 || (!large() && r >= floor())) { zoom(parts, r); return; }
  list.classList.add('lots--stacked');
  const r2 = Math.min(...figures.map((el) => ratio(el.closest('.list__row').clientWidth, natural(el))));
  if (large()) { wrapMoney(figures, r2 < 1); return; }
  zoom(parts, Math.max(r2, floor()));
  wrapMoney(figures, r2 < floor());
}, (list) => lotRows(list).length > 0 && !list.closest('.skeleton'));

// L-17: Coins' history rows. The label keeps its narrowest width (the time never runs onto the figure); the figures of
// a list share one ratio to the floor, then wrap.
const histRows = (list) => [...list.children].filter((row) => row.matches('.list__row') && row.querySelector(':scope > .grow > .hist-time'));
fitter('.list', (list) => {
  const rows = histRows(list);
  const figures = rows.map((row) => row.lastElementChild);
  unzoom(figures); wrapMoney(figures, false);
  // A label whose one word takes more than half the row: on every row the figure goes under the label (the row wraps,
  // §3.4), and the label may break inside that word.
  const tight = rows.some((row) => natural(row.firstElementChild, 'min-content') > row.clientWidth / 2);
  list.classList.toggle('fit-break', tight);
  const room = (row) => (tight ? row.clientWidth : row.clientWidth - gapOf(row) - natural(row.firstElementChild, 'min-content'));
  const r = Math.min(...rows.map((row) => ratio(room(row), natural(row.lastElementChild))));
  if (large()) { wrapMoney(figures, r < 1); return; }
  zoom(figures, Math.max(r, floor()));
  wrapMoney(figures, r < floor());
}, (list) => histRows(list).length > 0);

// L-19 (S5): Redemption history rows. Name column and side (status, coins) one ratio across the list; missing, the side
// goes under the name on every row. The order number is never cut: it shrinks with its row, then breaks.
const orderRows = (list) => [...list.children].filter((row) => row.matches('.order-row'));
fitter('.list', (list) => {
  const rows = orderRows(list);
  const parts = rows.flatMap((row) => [...row.querySelector(':scope > .grow').children, row.querySelector('.order-row__side')]);
  const coins = rows.map((row) => row.querySelector('.order-coins')).filter(Boolean);
  list.classList.remove('orders--stacked', 'fit-break');
  unzoom(parts); wrapMoney(coins, false);
  const mainNeed = (row) => Math.max(...[...row.querySelector(':scope > .grow').children].map((el) => natural(el, el.matches('.order-row__name') ? 'min-content' : 'max-content')));
  const r = Math.min(...rows.map((row) => ratio(row.clientWidth - gapOf(row), mainNeed(row) + natural(row.querySelector('.order-row__side'))))); // the gap is not zoomed
  if (r === 1 || (!large() && r >= floor())) { zoom(parts, r); return; }
  list.classList.add('orders--stacked');
  const r2 = Math.min(...rows.map((row) => ratio(row.clientWidth, Math.max(mainNeed(row), natural(row.querySelector('.order-row__side'))))));
  if (!large()) zoom(parts, Math.max(r2, floor()));
  const miss = large() ? r2 < 1 : r2 < floor();
  list.classList.toggle('fit-break', miss);
  wrapMoney(coins, miss);
}, (list) => orderRows(list).length > 0);

// L-21: the reward's price on its page: shrink to the floor, then wrap.
fitter('.reward-info__price', (price) => money(price, inner(price.parentElement)));

// L-20, L-S1 (S5): the store's top bar. The balance takes its real room: first it shrinks to its floor, then the
// title ends in "…" by whole words; if even the first word does not fit, the balance takes its own line under the
// back + title row and the title is centred on its row.
// TOKENS §3.4 "Pinned areas take at most half the screen" (UI Designer 1, 11 Nov): the page's pinned bars together.
const PINNED = '.app-header, .store-head, .store-filters, .nav, .reward-cta';
function pinnedShare() {
  const spans = [...document.querySelectorAll(PINNED)].filter((el) => !el.parentElement.closest(PINNED) && el.offsetHeight)
    .map((el) => { const r = el.getBoundingClientRect(); return [Math.max(0, r.top), Math.min(innerHeight, r.bottom)]; })
    .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let total = 0; let cur = null;
  spans.forEach((s) => { if (!cur || s[0] > cur[1]) { if (cur) total += cur[1] - cur[0]; cur = [...s]; } else cur[1] = Math.max(cur[1], s[1]); });
  if (cur) total += cur[1] - cur[0];
  return total / innerHeight;
}
// The balance is information, not the primary action: when the bars would take more than half the screen, it leaves the
// pinned bar and scrolls with the content, right under it; Checkout stays pinned.
fitter('.store-head', (head) => {
  const away = head.nextElementSibling?.classList.contains('store-head__balance--flow') ? head.nextElementSibling : null;
  if (away) { away.classList.remove('store-head__balance--flow'); head.append(away); }
  layoutHead(head);
  const pill = head.querySelector('.store-head__balance');
  if (!pill || pinnedShare() <= 0.5) return;
  pill.classList.add('store-head__balance--flow');
  head.after(pill);
  layoutHead(head);
});
function layoutHead(head) {
  const title = head.querySelector('.store-head__title');
  const pill = head.querySelector('.store-head__balance');
  const figure = pill?.querySelector('.num');
  const brand = head.querySelector('.store-head__brand');
  const back = head.querySelector('.store-head__back');
  title.dataset.full ??= title.textContent;
  title.textContent = title.dataset.full;
  head.classList.remove('store-head--split', 'store-head--split-wide');
  if (figure) figure.style.removeProperty('font-size');
  head.style.removeProperty('--store-reserve');
  const lead = back ? back.getBoundingClientRect().width + gapOf(head) : 0;
  if (!pill) {
    // No balance in the bar (it scrolls with the content): the title has the row, "…" by whole words.
    head.style.setProperty('--store-reserve', `${lead}px`);
    if (!large() && natural(brand) > head.clientWidth - lead) { title.setAttribute('aria-label', title.dataset.full); wordsFit(title, () => natural(brand) <= head.clientWidth - lead); }
    return;
  }
  const titleRoom = (pillWidth) => head.clientWidth - lead - pillWidth - gapOf(head);
  const brandNeed = natural(brand);
  const pillNeed = pill.offsetWidth;
  const figureNeed = natural(figure);
  let pillWidth = pillNeed;
  const short = brandNeed - titleRoom(pillNeed);
  if (short > 0 && !large()) {
    // The figure shrinks only as far as the full title needs, never below its floor.
    const r = Math.max(floor(), ratio(figureNeed - short, figureNeed));
    if (r < 1) figure.style.fontSize = `${parseFloat(getComputedStyle(figure).fontSize) * r}px`;
    pillWidth = pill.offsetWidth;
  }
  head.style.setProperty('--store-reserve', `${lead + pillWidth + gapOf(head)}px`);
  if (large()) {
    // Large text: the header title wraps to 2 lines, then "…" (§3.4); the balance drops onto its own line only when the
    // title's longest word has no room beside it, and the title takes the mirror column when its centred one is too narrow.
    const extra = natural(brand) - natural(title); // icon, gap and padding around the title
    if (natural(title, 'min-content') + extra <= titleRoom(pillWidth)) return;
    head.classList.add('store-head--split');
    if (natural(title, 'min-content') > title.clientWidth) head.classList.add('store-head--split-wide');
    return;
  }
  if (natural(brand) <= titleRoom(pillWidth)) return;
  // "…" by whole words; the full title stays readable to screen readers.
  title.setAttribute('aria-label', title.dataset.full);
  if (wordsFit(title, () => natural(brand) <= titleRoom(pillWidth))) return;
  // Not even one word: the balance takes its own line; the title, centred on its row, ends in "…" by whole words there
  // (per character only when one word is longer than the row).
  title.textContent = title.dataset.full;
  if (figure) figure.style.removeProperty('font-size');
  head.classList.add('store-head--split');
  const fitsRow = () => title.scrollWidth <= title.clientWidth;
  if (wordsFit(title, fitsRow)) return;
  // A title row never shows an empty pill (UI Designer 1, 11 Nov): when the centred column cannot hold even "…", the
  // title also takes the empty mirror column, starting after Back, centred in that wider room. The only off-centre case.
  title.textContent = '…';
  const ellipsis = natural(title);
  title.textContent = title.dataset.full;
  if (title.clientWidth >= ellipsis) return;
  head.classList.add('store-head--split-wide');
  wordsFit(title, fitsRow);
}
function wordsFit(title, fits) {
  const words = title.dataset.full.split(' ');
  for (let n = words.length - 1; n >= 1; n -= 1) {
    title.textContent = `${words.slice(0, n).join(' ')}…`;
    if (fits()) return true;
  }
  title.textContent = title.dataset.full;
  return false;
}

// ---- Watching the page ----
const state = new WeakMap(); // element -> "width|text|large" last fitted
const watched = new Set();
const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => entries.forEach((entry) => run(entry.target))) : null;
const runsOf = (el) => FITTERS.filter((f) => el.matches(f.selector) && f.accept(el));
function run(el, force = false) {
  if (!el.isConnected) return;
  const key = `${Math.round(el.getBoundingClientRect().width)}|${el.textContent}|${large()}|${scale}`;
  if (!force && state.get(el) === key) return;
  runsOf(el).forEach((f) => f.run(el));
  bigMiss(el);
  state.set(el, `${Math.round(el.getBoundingClientRect().width)}|${el.textContent}|${large()}|${scale}`);
}
function scan() {
  watched.forEach((el) => { if (!el.isConnected) { sizes?.unobserve(el); watched.delete(el); } });
  capChrome(document);
  const seen = new Set(FITTERS.map((f) => f.selector));
  document.querySelectorAll([...seen].join(', ')).forEach((el) => {
    if (!runsOf(el).length) return;
    if (!watched.has(el)) { watched.add(el); sizes?.observe(el); }
    run(el);
  });
}
function rerunAll() { capChrome(document); watched.forEach((el) => run(el, true)); scan(); }

export function startFit() {
  if (!tok('fit-floor-ratio')) return; // the R3 tokens are not loaded
  probe();
  scan();
  // The web font changes every width: fit again once it is in (ready can resolve before Stolzl starts loading).
  const fonts = () => { probe(); rerunAll(); };
  document.fonts?.ready.then(fonts);
  document.fonts?.addEventListener?.('loadingdone', fonts);
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  addEventListener('resize', probe);
}
// Fit again now (a page that has just laid out an element itself, such as dashboard.js's fitPrices).
export const refit = (el) => (el ? run(el, true) : rerunAll());

startFit();
