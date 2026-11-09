# Handoff 11 — the Loyalty redesign on the app's design system (R3)

**Who this is for:** developers (and their AI assistants) who have applied handoff 10. Everything not named here is
unchanged. **This handoff is visual only:** data, API calls, events, intents, tour targets, states, copy keys and
navigation (Redeem included) are the same as handoff 10. Behaviour: `spec.md` §80. Exact line changes:
`CHANGES-since-handoff-10.diff` in the package.

**In one line:** Home, Earn and Coins move to the app's R3 design system (surfaces, the sweep rim, the one pressed
model, Stolzl, the glass tab bar), and every other page picks up the R3 surfaces and rim with its layout unchanged.

| § | What | You |
|---|---|---|
| 1 | Tokens: the app's R3 file, plus Loyalty's alias layer | **First**: everything else reads from it |
| 2 | The sweep rim (`shared/rim.js`) | One shared component |
| 3 | Pressed, springs and timings read from tokens | Shared hooks |
| 4 | Home, Earn, Coins, bottom bar, header (approved designs) | Per page |
| 5 | Reward detail, Redemption history: R3 surfaces only | Small |
| 6 | Checks | Before you call it done |

---

## 1. Tokens (R3)

- **Source:** the app's design system, `hsb_app/docs/redesign/qa/tokens.json`, owned by UI Designer 1. Loyalty uses
  two generated files from it, copied **byte-equal**: `tokens/hsb-tokens.css` (every value, `--hsb-*`) and
  `tokens/hsb-rim.g.json` (the rim's anchors). `sh tools/check-tokens.sh ../hsb_app` compares them. In
  `hsb-loyalty`, add the same two files from this package to `styles/` and import `hsb-tokens.css` before your own
  `tokens.css`; never edit them. When UI Designer 1 changes a value, a new byte-equal copy is the whole update.
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
  `.rim::before` rule, and apply it to the same list. The math must match TOKENS §4.0b exactly (the comments in
  `rim.js` follow it step by step).

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

## 6. Checks

- `sh tools/check-tokens.sh ../hsb_app`: both token files byte-equal.
- The app's QA gate on every file you change: `hsb_app/docs/redesign/qa/QA1.md` (G1–G5;
  `tokscan.py --strict`, 0 blocking). Shots at 402 × 874, light, dark and Premium.
- Unchanged and still to run: `node mock/api/check.mjs`, `python3 tools/check-copy.py`, `node tools/check-tracking.mjs`.
