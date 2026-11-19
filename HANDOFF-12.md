# Handoff 12 — Brand 2026 colours; glass only on the bottom bar; smoother pages

**Who this is for:** developers (and their AI assistants) who have applied handoff 11. Everything not named here is
unchanged.

**Two parts.** Part A (§1–§5) is token files only: the Brand 2026 colours. Part B (§6–§10) is the review of the UAT build
(19 Nov): Earn's and Coins' tabs lose the lens and the dark pill, glass stays only on the bottom bar, and the jank on
scroll, on the tab bar and in the tour is fixed. Exact line changes are in `CHANGES-since-handoff-11.diff` in the
package. Behaviour is in `spec.md` §84 and §85. Copy, data, events, states and the rim data are unchanged.

**Part A in one line:** the brand colours move to the Brand 2026 palette: brand text and marks, the selected rim, the
soft brand tint, the primary-button gradient and the logo gradient. Every neutral (page, box, text, lines), every status
colour and the Premium gold stay exactly as they are.

# Part A — Brand 2026 colours (token files only)

## 1. What to copy

Copy these four files from the package's `tokens/` into the same place as in handoff 11. Don't edit them by hand.

| File | Changed? |
|---|---|
| `tokens/hsb-tokens.css` | Yes: the app's R3 file, brand tokens and the two gradients (§2) |
| `tokens/tokens.css` | Yes: Loyalty's alias layer, the brand values in its legacy and exception blocks (§3); version 5.1 |
| `tokens/tokens.json` | Yes: the source of `tokens.css` (same values) |
| `tokens/hsb-rim.g.json` | **No**: the rim ramp is unchanged, so any rim test or fixture keeps its values |

If your app copies these files with a script (for example a sync from `handoff/tokens`), run it, then regenerate any
file you build from `tokens.css`, and keep only the token files in the change. Nothing else should move. If the sync
touches copy, mocks or assets, that change is not part of this handoff.

## 2. R3 tokens that change (`hsb-tokens.css`)

Light → new, dark → new. Every other line of the file is unchanged.

| Token (`--hsb-…`) | Light | Dark |
|---|---|---|
| `color-on-accent` | `#0D0F11` → `#1C1717` | `#0B0B0D` → `#151900` |
| `color-on-brand-card` | `#0D0F11` → `#1C1717` | `#0D0F11` → `#151900` |
| `color-accent-text` | `#527200` → `#546300` | `#D1F801` (same) |
| `color-accent-mark` | `#74A200` → `#546300` | `#D1F801` (same) |
| `color-accent-tag-text` | `#4A6700` → `#546300` | `#D1F801` (same) |
| `color-accent-soft` | `rgba(116,162,0,0.15)` → `#E0E2D6` | `rgba(209,248,1,0.08)` → `#29292B` |
| `color-flow-progress` | `#709D00` → `#546300` | `#D1F801` (same) |
| `color-selected-rim` | `#B3D400` → `#A7C601` | `#C3E31D` → `#DAF934` |
| `color-focus-ring` | `#527200` → `#546300` | `#C3E31D` → `#D1F801` |
| `gradient-brand` | `#B3D400 → #C3E31D → #B1D200` → `#A7C601 → #C2E600 → #A7C601` | → flat `#D1F801` |
| `gradient-logo` | `#94BE00 → #6E9A00 → #86B000` → `#A7C601 → #7D9501 → #A7C601` | `#E4FF5A → #D1F801 → #C3E31D` → flat `#D1F801` |

`color-accent` (`#D1F801`), the brand-card rim and every Premium gold value are unchanged.

## 3. Loyalty aliases that change (`tokens.css`)

| Variable | Light | Dark | Read by |
|---|---|---|---|
| `--bg-blend` | `#74A200` → `#546300` | same | `pages/store.css` |
| `--blend-theme-ink` | `#527200` → `#546300` | same | `shared/components.css` |
| `--ui-icon-brand` | `#527200` → `#546300` | same | `shared/components.css` |
| `--logo-stop-1/2/3` | `#94BE00 #6E9A00 #86B000` → `#A7C601 #7D9501 #A7C601` | `#E4FF5A #D1F801 #C3E31D` → `#D1F801` ×3 | `shared/components.js` |
| `--ui-chip-stroke-selected` | `#B3D400` → `#A7C601` | `#C3E31D` → `#DAF934` | `pages/store.css` |
| `--ui-chip-surface-selected` | `rgba(116,162,0,.15)` → `#E0E2D6` | `rgba(209,248,1,.08)` → `#29292B` | `pages/store.css`, `shared/components.css` |
| `--earn-card-button-text` (EX-4.4-01) | `#0D0F11` → `#1C1717` | same | `pages/dashboard.css` |

The Premium blocks are unchanged.

## 4. What you will see

- **Primary buttons** (Redeem, Checkout, "Trade with account…"): a lighter brand gradient in light mode, flat Volt in dark.
- **Soft brand tint** (the Redeem chip on Home's reward cards, gift entry, upgrade row, selected chips): a quiet
  neutral tint (`#E0E2D6` / `#29292B`) instead of the lime wash.
- **Brand text and marks** (links, ticks, progress): `#546300` in light.
- **Selected rim, focus ring and the logo:** the new values above.

Page, box, text, lines, status colours (green, red, amber, blue), badges, tier tags, HOT and the Premium theme must
look the same as in handoff 11. If any of them changes, a wrong file was copied.

## 5. Checks

1. `cmp` each of the four files against the package's `tokens/`: all identical.
2. Your token check (for example a theme file generated from `tokens.css`) is up to date.
3. Grep your app for hard-coded brand hexes: `#527200 #4A6700 #74A200 #709D00 #B3D400 #C3E31D #B1D200 #94BE00
   #6E9A00 #86B000 #E4FF5A`. There should be none: every colour comes from tokens. If one turns up, it maps by §2.
4. Unit and parity tests: unchanged. The rim data is the same, so rim hashes don't move.
5. Shots at 360 wide, light and dark, on every page next to handoff 11's. Only the brand pieces in §4 differ.

# Part B — Glass only on the bottom bar, smoother pages (spec §85)

The user saw the UAT build on 19 Nov: Earn's "How it works / History" and Coins' "Available / Expired / History" bars
looked off (the selected tab sat in a dark pill), they had a glass lens nobody needs there, and the pages stuttered on
scroll, on the bottom bar and in the tour. Measured in Chrome with the phone CPU slowed 4×: scrolling spent 32–52% less
GPU and compositor time after these changes (Home 834 → 565 ms, Coins 784 → 447, Earn 1481 → 715, store 1282 → 801 over
the same scroll), and a Coins tab change 55% less main-thread time, with no frame over 50 ms (5 before).

## 6. Earn and Coins tabs: no lens, a plain pill that slides

- **Look (TOKENS 8.3, the capsule):** track `--strip-track`, selected pill `--capsule-pill` with `--capsule-pill-shadow`.
  On the page that is light `#F8F8FA` on `#ECECEF`, dark `#2E2E32` on `#222225`; inside Earn's card the track takes
  the page colour (`.card` remaps `--strip-track`). Selected label `--ui-text-brand`, weight `--font-role-small-em`.
- **No lens, no glass, no magnified copy.** Tapping a tab changes it at once (no wait for a lens to land) and the pill
  slides from the old tab to the new one: `transform` and `width` over `--hsb-motion-switch-move-dur` /
  `--hsb-motion-switch-move-ease` (the "% / Price" switch, TOKENS 9.1 Menus). Reduced motion: the token is 0 ms.
- Handoff code: `shared/components.css` (`.tabs .nav__sel`), `shared/components.js` `mountTabs()`, called by
  `pages/point-balance.js` and `pages/trading-task.js` (the `.nav__lens` markup and `mountBarLens()` are gone).
  `loyalty_tab_click` is unchanged (one per tap).
- **In your build, `components/molecules/SegmentedTabs`:** drop `mountLens`, the `[data-lens]` block and the
  `Lens.module.css` import; position `[data-lens-pill]` on the selected tab (offsetLeft / offsetWidth, on mount, on
  `value` change and on resize) with the CSS transition above; let react-aria handle the pointer again (remove the
  capture `keep` listeners). **The dark pill:** HeroUI's `Tabs.ListContainer` paints its default fill,
  `rgba(146,146,150,.14)`, on top of your pill (the pill sits under the list container in the box). Give it
  `bg-transparent` (the box already carries `bg-strip-track`), or put the pill inside the list. Check in light that the
  pill reads `#F8F8FA`, not grey.

## 7. Glass only on the bottom bar

`backdrop-filter` stays only on the bottom bar (`.nav__exit`, `.nav__tabs`, `--bar-blur`) and on the sheet scrim. It
is removed from these, each keeping its fill (over these smooth backgrounds the look does not change):

| Handoff | Your build |
|---|---|
| `.app-header::after` (the 6 px blur under the status bar): removed; the gradient fade (`::before`) stays | `AppHeader.module.css` line 69 and its masked pseudo-element |
| `.today` (Today panel on Home and Earn) | `TodayPanel.tsx`, the `[backdrop-filter:…]` class |
| `.store-look .store-chips .chip`, `.store-sort` (chips on the blue) | `Store.module.css` (the three `backdrop-filter` lines: 197, 512, 536) |
| `.store-tab--rewards .store-filters.is-stuck` (stuck chips band) | the same file |
| dark `.store-card`, `.voucher`, `.reward-sheet` (cards on the blue) | the same file and `Reward.module.css` line 158 |

## 8. The bottom bar's lens: the same look, less work

The lens looks and moves as before. Three changes in `shared/nav-lens.js` and `components.css`; port them to
`core/r3/lens.ts` and `Lens.module.css`:

1. **Refraction only while the lens shows.** `backdrop-filter: url(#lensBD)` on `.nav__lens` and `filter: url(#lensRow)`
   on `.nav__mag` apply only under `.nav__box.is-lens-up`, set by `draw()` while `p > 0.001`. At rest the clear lens
   kept the SVG backdrop filter alive, and Chrome redrew it on every scrolled frame (about a quarter of the compositor
   time on Coins).
2. **No layout reads inside a frame.** Tab offsets, the tab width, the bar's size and rect and the icon/label rects are
   read in `measure()`: on `rest()`, on resize and on a new touch when the lens is down. `draw()`, `step()`,
   `nearest()`, `local()` and `fringe()` use the cache; `fringe()` builds the lens rect from the last frame's geometry
   and runs before `draw()` in the frame, so its `elementsFromPoint` sees a clean layout.
3. **The SVG filter is resized only when its whole-pixel size changes** (each attribute change redraws it).

## 9. Smaller fixes

- **Tour carousel** (`shared/tour.js` `runCarousel`; your `Carousel.tsx`): the path width (`clientHeight * 1.5`) is read
  once and on resize, not in every frame after the last frame's writes.
- **Rim** (`shared/rim.js`; your `core/r3/rim.ts`): one sweep per size, mode and set, kept in a `Map`. A redraw (a tab
  change, a sheet) builds surfaces of the same sizes again; the conic gradient is not recomputed.

- **The tax line is off** (spec §85, the user, 19 Nov): no "Prices exclude taxes and fees." under the reward cards'
  prices. Handoff: `PRICE_TAX_NOTE = false` in `pages/dashboard.js`. Your build: set `NEXT_PUBLIC_PRICE_TAX_NOTE=false`
  in the UAT and production environments (and in `.env.example`); no code change. The copy key `rewards.taxNote` stays.

## 10. Checks for Part B

1. Home: no tax line under any reward card's price.
2. Coins and Earn, light and dark: the selected pill is `--capsule-pill` (light `#F8F8FA` with its small shadow), no grey
   veil; tapping a tab slides the pill, no lens appears.
3. `getComputedStyle` of every element: `backdrop-filter` only on the bottom bar (and on the scrim while a sheet is open);
   `.nav__lens` shows `none` at rest and `url("#lensBD")` while held.
4. Hold and drag on the bottom bar: the lens, its fringe and the refraction (Android) as in handoff 11.
5. On a real Android phone (chrome://inspect → Performance, or the GPU rendering bars): scroll Home, Earn, Coins and the
   store, change tabs, run the tour. No long frames. We could not test on a device; please tell us what you see.
