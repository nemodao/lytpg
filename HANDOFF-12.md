# Handoff 12 — Brand 2026 colours (brand only)

**Who this is for:** developers (and their AI assistants) who have applied handoff 11. Everything not named here is
unchanged.

**Token files only.** Markup, CSS, JS, copy, data, events, states and the rim stay the same as in handoff 11.
Exact line changes are in `CHANGES-since-handoff-11.diff` in the package. Behaviour is in `spec.md` §84.

**In one line:** the brand colours move to the Brand 2026 palette: brand text and marks, the selected rim, the soft
brand tint, the primary-button gradient and the logo gradient. Every neutral (page, box, text, lines), every status
colour and the Premium gold stay exactly as they are.

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
