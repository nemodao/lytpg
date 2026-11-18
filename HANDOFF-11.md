# Handoff 11 — the Loyalty redesign on the app's design system (R3)

**Who this is for:** developers (and their AI assistants) who have applied handoff 10. Everything not named here is
unchanged. **Mostly visual:** events, intents, tour targets, states and navigation (Redeem included) are the same as
handoff 10. Data: one more field read (`orderTime`, §9). Copy: one new key and one changed text (§8, §9).
Behaviour: `spec.md` §80–§83. Exact line changes: `CHANGES-since-handoff-10.diff` in the package.

**In one line:** Home, Earn and Coins move to the app's R3 design system (surfaces, the sweep rim, the one pressed
model, Stolzl, the glass tab bar), every other page picks up the R3 surfaces and rim with its layout unchanged, and
every page now fits small screens and large text (`shared/fit.js`); plus no zoom in the webview, a temporary tax line
on Home's reward cards and the order time from `order/detail`.

| § | What | You |
|---|---|---|
| 1 | Tokens: the app's R3 file, plus Loyalty's alias layer | **First**: everything else reads from it |
| 2 | The sweep rim (`shared/rim.js`) | One shared component |
| 3 | Pressed, springs and timings read from tokens | Shared hooks |
| 4 | Home, Earn, Coins, bottom bar, header (approved designs) | Per page |
| 5 | Reward detail, Redemption history: R3 surfaces only | Small |
| 6 | Fit: small screens and large text (`shared/fit.js`) | One shared module + CSS classes |
| 7 | No zoom in the webview | Small; tell the app team |
| 8 | Home: temporary "Prices exclude taxes and fees." line, one switch | Small |
| 9 | Redemption history: order time from `order/detail` | One adapter line, one copy text |
| 10 | Checks | Before you call it done |

---

## 1. Tokens (R3)

- **Source:** the app's design system, `hsb_app/docs/redesign/qa/tokens.json`, owned by UI Designer 1. Loyalty uses
  two generated files from it, copied **byte-equal**: `tokens/hsb-tokens.css` (every value, `--hsb-*`) and
  `tokens/hsb-rim.g.json` (the rim's anchors). **You do not need `hsb_app`** (the design team's repository, not
  shared): this package is your source. In `hsb-loyalty`, add the same two files from this package to `styles/` and
  import `hsb-tokens.css` before your own `tokens.css`; never edit them. When UI Designer 1 changes a value, a new
  byte-equal copy in a handoff is the whole update. (`tools/check-tokens.sh` is the reference repository's own check
  against `hsb_app`; you compare with `cmp`, see §10.)
- **Pages load `hsb-tokens.css` first, then `tokens/tokens.css`.** `tokens/tokens.json` (and the generated
  `tokens.css`) is now only an alias layer: Loyalty's older variable names point at the R3 token of the same role, so
  page CSS kept its names. New code calls `--hsb-*` directly. Blocks: `alias`, `tokGap` (empty now: UI Designer 1
  named them as `--hsb-loyalty-kit-*`), `logicTiming` (existing timings kept as they were, EX-0-11), `exception`
  (the tab bar and lens, EX-4.0-04; the Earn cell, EX-4.4-01), `layout`, `legacy` (read only by the old store pages).
- **Modes:** R3 switches on `data-mode`. `shared/theme.js` sets `data-mode` next to `data-theme` on `<html>`; the
  Earn sky and the Terms frame carry their own `data-mode` (`pages/trading-task.js`). In yours: set
  `data-mode="dark|light"` wherever you set the theme (next-themes' `.dark` class also works with `hsb-tokens.css`).
  Premium: `data-premium` on `<html>` (see "Premium wiring" in §4).
- **Values that changed for the user:** light page `#F8F8FA` (was white), box `#ECECEF` (was `#EFEFF1`), tertiary
  text `#848488`, small button side padding 16 (was 14), header buttons' touch area 48, the sheet's scrim fades in
  200ms (was 280ms). Cards, fields and secondary buttons have no shadow.

## 2. The sweep rim (TOKENS §4.0b)

Every neutral surface (cards, sheets, the coach card, header buttons and the scrolled header pill, fields, the account
selector, the capsule tab track, sunk boxes, empty-state orbs, reward art plates) gets a thin ring painted over its
edge that takes no room: brightest along the top in light, a faint lift in dark.

- **Reference:** `shared/rim.js` builds each surface's `conic-gradient` from `hsb-rim.g.json` for its size and mode
  (121 stops), sets it as `--rim`, adds `.rim`; `components.css` draws the ring on `::before`, width
  `--hsb-rim-shared-width` (1). A `ResizeObserver` repaints on size changes, a `MutationObserver` on new surfaces and
  mode changes. `RIM_SELECTOR` in `rim.js` lists what takes it.
- **Not on:** selected, disabled and tinted surfaces, tags, images, the tab bar and lens (their own rim), the brand
  card and the Earn cell, primary buttons, shimmer; the reward detail's sheet in dark (glass over the gradient).
- **Yours:** port `rim.js` as one hook or component that reads `hsb-rim.g.json` and sets `--rim`, plus the
  `.rim::before` rule, and apply it to the same list. The math must match `rim.js` exactly: it is the reference, and its
  comments walk through the design system's rule (TOKENS §4.0b, in `hsb_app`, which you do not need) step by step.

## 3. Pressed, springs and timings come from tokens

- **Pressed (§4.0, one model):** a neutral control brightens (`--hsb-pressed-neutral-filter`) and takes the flat
  pressed fill of its ground (`--hsb-color-pressed-on-page` / `-on-box`, set as `--pressed-fill` by ground in
  `components.css`). Primary, brand and tinted buttons: `--hsb-pressed-brand-filter`. The old 8% overlay is gone.
- **Scripts** read springs, swells and durations through `shared/tokens.js` (`tok`, `tokMs`, `tokNum`,
  `tokSpring`): `shared/bubble.js` (press), `shared/sheet.js` (drag, slide out, rubber band), `shared/nav-lens.js`
  (lens springs, hold, `loyalty-kit-lens-fallback-ms`), Earn's hero touch (`pages/trading-task.js`). Read them the same way in
  your hooks (`getComputedStyle(document.documentElement)`), never as numbers in code. Under reduced motion some
  read 0.
- **Earn hero:** every value (sky, halo, rays, cup, HOT, burst, hold) reads `--hsb-loyalty-earn-hero-*`.
- The Close button's dark sheen is built from `--hsb-loyalty-kit-close-sheen-shape / -falloff / -at` (`shared/nav.js`).

## 4. Home, Earn, Coins, the bottom bar and the header (approved by the user, 2–3 Nov)

- **Tokens:** `tokens.json` v4.0. Role names stay, values follow the app's design system. New: materials, `--font-role-*`, a Premium layer.
- **Fonts:** Stolzl Book, Regular and Medium, referenced from `assets/fonts/stolzl/`. That folder is git-ignored and never in this repository. Take `Stolzl-Book.woff2`, `Stolzl-Regular.woff2` and `Stolzl-Medium.woff2` from `hsb-client/config/stolzl/`.
- **New shared files:** `shared/bubble.js` (press effect), `shared/sheet.js` (sheet drag and slide out), `shared/nav-lens.js` (glass lens on the bottom bar). In this handoff the page changes after the lens drops in, because each tab is a page. Where `BottomNav` stays mounted across routes, route at once and let the lens finish.
- **Premium wiring:** add `isPremium` to `TWebviewConfig`, and set `data-premium` on `<html>` in the same `initWebview` callback as the theme. Nothing else reads it.
- **Until `isWebviewSettled()` is true:** keep `.is-unsettled` on `<html>` and show the shimmer, so no brand colour shows before Premium is known.
- **Premium art:** the bottom bar's selected tab has a gold version, `assets/images/nav/<id>-on-gold.png`, shown by CSS under `[data-premium]`.
- **Earn hero:** the cup is `assets/images/cups/lime.webp` (no candlesticks), in place of `cups/purple-chart.webp`, which is no longer used and can be deleted. `earn/crown.webp` is a new gold crown, on Earn's top-tier upgrade row only; the tour's crown is unchanged. `earn/money-bag.webp` is lime. Eight rewards (`assets/images/earn/gifts/`) burst out from behind it on the page's first draw and frame it; the cup pops with a one-off flash of light and the HOT badge; then the rewards dim. `GIFTS` in `pages/trading-task.js` holds the positions; later draws use `.hero--settled` (no motion). Not on Ended or while loading. The sky's diagonal streaks are gone (`streakField`, `.streaks-fade`, `.streak*`): in their place `.hero-rays`, a CSS-only halo and rays of light centred on the cup, which spread out with the pop on the first draw, then dim with the rewards to `--rays-rest` (0.4) and stay still; 0.25 on Ended (`.hero--ended`), hidden while loading and on a load error (`.hero--loading`). The rays find the cup's centre from `--sky-top` (on `.hero-bg`), `--cup-size`, `--cup-gap` and `--sky-below` (on `.hero`; `--cup-size` moved there from `.today-cup`), so change those, not the lengths they replace. **Touch** (`watchHeroTouch`, no event sent): a tap on the cup bounces the cup and HOT (`.is-tapped` on `.today-cup-wrap`); a tap on the cup or a reward also shows the hold's look at 30% for 550 ms (`.hero--peek`; the rewards take taps, `pointer-events: auto`), not during the burst or on Ended. One custom property drives both, `--lift` on `.hero` (0 rest, 0.3 peek, 1 held): the rewards' and rays' opacity run from their rest value to 1 by it, the rewards' scale to 1.03, the cup's to 1.12; holding the hero 300 ms (not on Ended, not while loading) adds `.hero--held`, which brings the rewards back to full and pushes them out a little, lights the halo and rays to full and zooms the cup and HOT to 1.12, until the finger lifts. Moving 8px before the hold starts is a scroll and cancels it. While the first draw's burst still runs on the rewards or rays, the hold waits for those animations to end (`burstLeft`, from `getAnimations`; 0 under reduced motion), so the burst never dims what the finger lights; a press as long as a hold never counts as a tap; a tap during a bounce (500 ms) is ignored, so it never snaps; `.hero` has `touch-action: manipulation`. In React: start a hold on the primary pointer only and follow only that pointer; clear it on `pointerup` and `pointercancel` (on the document) and on unmount; restart the bounce by removing `is-tapped`, forcing a reflow, then adding it. The hold relies on the long-press menu being off: `-webkit-touch-callout: none` and `user-select: none` (`shared/base.css`), `-webkit-user-drag: none` on images, `contextmenu` blocked (`shared/app.js`) and `dragstart` blocked on the hero. The gifts' burst now uses `backwards` fill (its last frame is the rest state), so the hold can change them afterwards. Keep `overflow-x: clip` on `.app` (Safari 16 and later); without it the burst can scroll the page sideways for a moment.
- **Page header** (`.app-header`, `shared/components.css`; Home, Earn, Coins, Redemption history and its detail): the title is centred on the page. The header is a three-column grid: the back button (`[data-back]`) left, the title, and the page's button right, the side columns equal and at least a button wide, so the title stays centred and a long one ends in an ellipsis. At the top the title is plain text at 20; over the first 40 of scroll (`--p`, as before) its pill, styled like the round header buttons, fades in and the title scales to 15, now about its centre (no sideways move). `--title-grow` (set by `fitHeaderTitle` in `shared/components.js`, again once the font loads and on resize) is how much bigger than 15 it starts: a third, less when 20 would reach the side buttons (the long titles at 320). Below 360 wide the pill's side padding is 12, not 16, so "Redemption history" fits beside the back button. On Earn the sky pill and white title (`.is-over-sky`) turn when the Today card's top reaches the pill's middle, with 2px either side so it does not flick (`watchSky`); the pill's fill crosses linearly and the title's colour flips halfway, so it never fades into the pill. The Reward Store's own top bar is not changed yet.
- **Coins** (`pages/point-balance.*`):
  - The tabs are the capsule with the glass lens, as on Earn: `.tabs-box` with `.nav__sel` and `.nav__lens`, mounted by `mountBarLens` after each render. `data-tour="tabs"` stays on `.tabs`.
  - "Redemption history" moved from under Redeem to the balance card's last row (below the expiring warning when there is one), across the card under a line (`.balance-history`, `shared/components.js` / `components.css`). The side column now holds only Redeem, so the balance keeps its room: at 320 wide it was shrunk to 43% before. The tier tag still hangs on the card's top edge (spec §55, the user, 20 Oct).
  - The tab's blocks bind closer (`pages/point-balance.css`): tabs to content 16, the note to its list 12, the date chips to the first day 12, a day's title to its card 8, day to day 20, the end-of-list row 16. The page's other blocks stay 32 apart.
  - "Coins expiring soonest are used first." is a quiet line, no box: `.notice--neutral` on the page has no fill.
  - Lots: the labels (Earned, Remain, Expired) are tertiary, the Earned figure secondary, the main figure primary.
  - A lot expiring soon is amber (`--warn-text`, its clock `--warn`), like the card's expiry warning, not red. Dates do not break inside themselves (non-breaking spaces, `day()`).
  - Loading: Coins has its own skeleton (`coinsSkeleton`, through `showStatus`), the real blocks at their real sizes, so nothing moves when the data lands.
  - The date chips call `watchChips` after each render, as on Earn (the selected chip scrolls into view, the ends fade). Retry on a failed page turns to the spinner at once (`loadMore()` before `render()`).
  - Tour step 3's highlight takes in the tier tag that hangs above the card (`shared/tour.js`). The history row swells like a card when pressed (`.balance-history` in `SWELL`, `shared/bubble.js`).
  - Guest card: "Already have an account? Log in" keeps its space (gap 4).
  - Empty tabs use Earn's empty line, now shared (`.list-none`, `.list-none__orb`, moved from `trading-task.css` to `components.css`): calendar for Expired and History, the greyed coin (`.coin--empty`) for Available.
- **Waiting for the app:** while `switchAccount` waits, show `waitChip()` (`shared/components.js`, TOKENS 9.4), not the spinner in `components/atoms/Button`. Preview: Earn `?pending=1`.

## 5. Reward detail and Redemption history

No new layout: they take the R3 surfaces, the rim and the shared header pieces only. Reward detail: the sheet is
rimmed in light only, the header's balance pill too. The Reward Store is not part of this handoff (it is being
removed; Redeem's target is unchanged for now).

**Also:** a press or drag on the bottom bar or a capsule tab bar sends its click event exactly once, however long it
lasts (`pointerClick` in `shared/nav-lens.js` drops the pointer's own click per gesture, not within 1.5 s). Port the
same rule: one `loyalty_nav_click` / `loyalty_tab_click` per gesture. A lens no longer leaves its resize listener
behind when the page redraws the bar, and the rim stops watching surfaces that left the page.

**Later cleanup (no effect now):** the `card--soft` class is still emitted (`shared/components.js`,
`pages/point-balance.js`) but has no CSS since the redesign. Leave it or drop it in your code.

**Numbers in Indonesian (spec §81, the user, 9 Nov; sent to you ahead of this handoff):** numbers read like English in
every language, `3,100`, `11.02`. `copy/id.json` `locale` is `en-GB` (was `id-ID`); dates and words stay Indonesian.

## 6. Fit: small screens and large text (TOKENS §3.4, §12; spec §82)

Every page keeps its content inside its boxes at any width (down to 160 CSS px, what 320 at 200% page zoom gives) and
at any phone text size. Nothing about the data or the copy changes: only how text shrinks, wraps or moves.

- **One module:** `shared/fit.js` (imported by `shared/components.js`, starts itself). Port it as one hook or module
  that runs once per page. It watches the page (a `MutationObserver`, batched per animation frame, and a
  `ResizeObserver` per element) and runs one **fitter** per element family when an element appears, its size or text
  changes, the web font loads (`document.fonts` `ready` and `loadingdone`) or large text switches. Each run is keyed on
  size, text and mode, stored after the run, so a fitter's own changes never loop.
- **Large text:** a hidden probe in `--fit-probe-font` (100px/100px) is compared with the same text measured on a
  canvas at `--fit-probe-size`, which the OS text size never touches. Above 1, `data-large-text` is set on `<html>`.
  Page zoom (a narrow viewport at 1.0) is not large text. In large text nothing shrinks: text wraps or moves instead,
  and chrome text (`.btn`, `.badge`, `.tab`, `.chip`; not the bottom bar) is capped at `--hsb-fit-chrome-cap` (1.3) times
  its size.
- **The rules (TOKENS §3.4):**
  - *One ratio per element:* everything in one element (a row, a card's figures, a list's rows) shrinks by one factor
    (CSS `zoom`), down to `--hsb-fit-floor-ratio` (0.8). The rows of one list switch together.
  - *Then the alternate layout:* at 1.0 only when the element misses at its floor; in large text when it misses at its
    real size.
  - *Money is never cut:* past the floor it wraps at its separators only (a `<wbr>` after "," "." or a space between
    digits; no regex lookbehind, older iOS webviews cannot parse it). "/ lot" keeps its slash with its unit.
  - *A small miss wraps, a big miss moves:* money, a symbol or an id that would need 3+ lines beside a neighbour, or
    would break inside a part, takes its own line at full width (`.fit-own-line`).
  - *Pinned areas take at most half the screen:* past half, information leaves the pinned bar and scrolls (the store
    balance); the primary action (Checkout) stays pinned.
  - Ids (account numbers, order numbers) are never cut: they shrink with their row, then wrap.
- **The fitters and the classes they set** (each one's comment in `fit.js` says exactly what it measures):
  | Element | Alternate layout |
  |---|---|
  | `.balance-row` (Home, Coins) | `balance--stacked` (figure on its own line), `-redeem`, `-label` |
  | `.notice--warning .num` (expiring coins) | wraps; `notice--stacked` on a big miss |
  | `.reward-grid` (Home prices; tax line, §8) | `reward-grid--stacked` (Redeem under the price) |
  | `.rewards-more__cta` (Explore all rewards) | label shrinks; `rewards-more--stacked`; large text `fit-wrap-label` |
  | `.reward-soon__pair` (guest sheet) | `reward-soon__pair--stacked` (Sign up on top) |
  | `.today__stats` (Earn) | `today__stats--stacked` |
  | `.rates-frame` (Earn rates) | `rates-frame--stacked` (rate under its label) |
  | `.account-lines` (account field, sheet options) | `account-lines--stacked`; `select--wrap` on a big miss |
  | `.list` lots / history (Coins), orders (Redemption history) | `lots--stacked`, `fit-break`, `orders--stacked` |
  | `.reward-info__price` (reward page) | wraps |
  | `.store-head` (store and reward top bar) | title "…" by whole words; `store-head--split`, `-split-wide`; `store-head__balance--flow` |
  | `.store-banner` | grows to hold its text |
  | `.reward-cta` (Checkout) | sets `--pinned-foot` on `.app`: the room under the content is the bar's measured height |
- **Shared classes** (`shared/components.css`): `html .fit-wrap` (lets wrapped money break; above the pages' own
  `nowrap`), `.fit-own-line` / `.fit-own-line-parent`, `.btn.fit-wrap-label`, large-text minimum heights for `.btn` and
  `.badge`. Page CSS holds each page's stacked layouts.
- **Removed:** `fitBalanceNumber`, `fitBalanceTier` and `fitAccountTags` in `shared/components.js` (fit.js does their
  work); `watchAccountTags` stays and now calls `refit`. `pages/dashboard.js`' `fitPrices` calls `refit(grid)` and no
  longer listens to resize and fonts itself.
- **Tokens:** `--hsb-fit-floor-ratio` and `--hsb-fit-chrome-cap` (in `hsb-tokens.css`), `--fit-probe-font` and
  `--fit-probe-size` (Loyalty's `tokens.json`, `layout` block).
- **At 402 with normal values nothing moves:** the before and after shots are pixel-identical there, apart from
  animations. The Reward Store parts apply only while you still ship the store.

## 7. No zoom in the webview (spec §83)

The pages no longer zoom: pinch and double-tap do nothing, so the page feels like the app, not a browser. The phone's
text size still applies (§6).

- **Viewport meta** on every page: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no,
  viewport-fit=cover`. In Next.js: `export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1,
  userScalable: false, viewportFit: 'cover' }` in the root layout.
- **Double tap:** `html { touch-action: manipulation; }` (`shared/base.css`). Elements with their own `touch-action`
  (sheets, tab bars) keep theirs.
- **App side (please pass on to the app team):** iOS WKWebView honours the meta by default. Android WebView honours it
  too; to be sure, turn zoom off in the webview settings (`setSupportZoom(false)`, `setBuiltInZoomControls(false)`; in
  `webview_flutter`, `enableZoom(false)`). Safari outside the app ignores `user-scalable=no`; that is expected.

## 8. Home: "Prices exclude taxes and fees." (temporary; spec §83)

A small, quiet line under the price row of every reward card on Home (not on the earn card).

- **One switch:** `PRICE_TAX_NOTE` at the top of `pages/dashboard.js`. `false` removes the line from every card; nothing
  else depends on it. Keep it as one constant (or one feature flag) in your code too: the line may only run for a short
  time.
- **Markup:** `<span class="reward-card__tax">` after `.reward-card__foot`, inside the card. Copy key `rewards.taxNote`
  (EN "Prices exclude taxes and fees.", ID "Harga belum termasuk pajak dan biaya.", ZH "价格不含税费。").
- **Style** (`pages/dashboard.css`): `--font-role-meta` (11/14), `--ui-text-tertiary`, one line (`nowrap`), 4 under the
  price row.
- **Fit** (the `.reward-grid` fitter): one line, shrunk to the card's inner width by one ratio across the grid (every
  card the same size), **with no floor** (the user accepts very small text: about 10px in EN at 402, 6px in ID at 320).
  In large text it keeps its size and wraps (`fit-wrap`).

## 9. Redemption history: order time from `order/detail` (spec §83)

- **API:** `POST /app/point/order/detail` now sends `orderTime`, ISO 8601 UTC (`"2026-11-16T01:37:00Z"`), when the
  order was placed (on UAT since 17 Nov; checked 18 Nov: it equals the list's `orderDate`, to the second).
- **Adapter** (`toOrder`, `shared/api-adapter.js`): `orderDate: apiTime(order.orderTime ?? summary?.orderDate ??
  order.orderDate)`. Without `orderTime` the list's row gives the date, as before. The coins and the status still come
  from the list's row. Add `orderTime?: string | null` to your answer type. The sample
  `mock/api/loyalty-orders-detail.json` carries it.
- **Page:** the detail's row label is now "Order time" (it always showed the date and the time): key `orders.date`
  (unchanged key), EN "Order time", ID "Waktu pesanan", ZH "下单时间". `DATA.md` is unchanged.

## 10. Checks

- Token files byte-equal to this package: `cmp tokens/hsb-tokens.css <hsb-loyalty>/styles/hsb-tokens.css` and the same
  for `hsb-rim.g.json` (no output = equal).
- No hard-coded colours, sizes, radii, shadows or timings in the code you change: read the `--hsb-*` tokens or
  Loyalty's alias tokens (`tokens/tokens.css`), as the reference does. (The design team's own QA gate, `hsb_app` QA1
  and `tokscan.py`, was run on the reference: 0 blocking. You do not need it.)
- Shots at 402 × 874, light, dark and Premium, side by side with the reference pages (`python3 serve.py 8000`).
- Still to run: `node mock/api/check.mjs` (the sample now has `orderTime`), `python3 tools/check-copy.py` (one new
  key), `node tools/check-tracking.mjs` (no event changed).
- Fit: check each page at 320 × 568, at 160 × 284 (320 at 200% page zoom) and with the phone's largest text size;
  nothing leaves its box and no money is cut.
