# Changelog

One entry per handoff to developers, newest first. Each entry says what changed for the user, which files changed,
and whether the data contract (`DATA.md`) or the states (`STATES.md`) changed.

## Handoff 6 — phase 3, replaces handoff 5 (20 Oct 2026)

**Full description for developers: `HANDOFF-6.md`** (everything since handoff 4; exact changes in
`CHANGES-since-handoff-4.diff`). Spec §49–§58. Handoff 5 was sent but not converted: apply this one instead.

- Everything in handoff 5 below: rewards grid on Home, Redeem asks for KYC / first deposit first, recent activity card,
  account tiers on Earn, Redemption history, guest mode, taller sheets, tour fixes.
- Tier label next to "Coin Balance" on Home and Coins; Earn opens on the highest-tier account, and a pick is kept for
  the session. Tier colours are now tokens, one style for the four tiers.
- Sticky header: plain title at the top, a small pill once the page scrolls.
- Dark mode: a faint red sheen behind the bottom bar's Close.
- Recent activity: one-line messages centred.
- Events: 34 (12 new since handoff 4), reviewed screen by screen; `tools/check-tracking.mjs` in the package.
- `DATA.md` and `STATES.md` changed (see `HANDOFF-6.md` §11).

## Handoff 5 — phase 3: rewards on Home, account tiers, Redemption history, guest mode (20 Oct 2026)

**Sent but not converted; replaced by handoff 6** (`HANDOFF-6.md`; `HANDOFF-5.md` is not in the package). Spec §49–§53.

- Home: a rewards grid (with an "Earn more coins" card) replaces the Daily Trading card; a "Looking for something else?" card under it.
- Every Redeem asks users who still need KYC or a first deposit to do that first, in a bottom sheet.
- Recent activity card ("Trader … just redeemed / earned") on Home and Earn, from a new API; hidden when it has no data.
- Earn: account tier label, an upgrade row and a tier sheet with the deposit still needed and the rates of every tier.
- New page: Redemption history (list and order details), from Coins.
- Guest mode: the pages work without a token and ask the user to sign up or log in.
- Bottom sheets grow up to 80% of the screen; the tour skips the Coins tabs step for guests.
- Events: 31 (9 new). New intents for the app: `voucher`, `signup`, `login`; `deposit` carries an account and amount.
- `DATA.md` and `STATES.md` changed.

## Handoff 4 — fixes from the owner's manual test (14 Oct 2026)

**Full description for developers: `HANDOFF-4.md`.** Spec §48.

- Trade buttons open the market; `Open a trading account` opens KYC.
- Terms & Conditions opens in the bottom sheet inside the page (PDF viewer on Android).
- No text selection, long-press menu or link preview.
- The tapping finger stays above the next card.
- Coin glow drawn as a gradient, not a filter.
- Dates always show the year (replaces the handoff 3 rule).
- `DATA.md` and `STATES.md` unchanged.

## Handoff 3 — fixes from the QA with real UAT accounts (14 Oct 2026)

**Full description for developers: `HANDOFF-3.md`.** Spec §47.

- Delayed programme: no "after your first trade" line while coins wait.
- Singular wording: "1 day", "1 minute".
- Dates show the year when it is not the current year.
- Programme ended: only "This program has ended", nothing to tap, on Home and Earn.
- `DATA.md` unchanged. `STATES.md`: new Home state `ended`.

## Handoff 2 — UI changes, API mapping and event tracking (12 Oct 2026)

**Full description for developers: `HANDOFF-2.md`** (what changed since handoff 1, file by file, and the values to map from the API).

Summary:

- "How to start" on the Today card (Home and Earn) for users who still need KYC or a first deposit, with a finger that taps the button. Spec §39.
- `Terms & Conditions` text button under the rules on Earn; opens a PDF in a bottom sheet. Spec §40.
- Button wording: `Verify my account` / `Deposit now` (were `KYC to join` / `Deposit to join`).
- Rates belong to the selected trading account; users without an account see only `70–100 coins per lot` (no rates table, no `See rates`); new no-account card with `Open a trading account` (`data-intent="open-account"`). Spec §42. New preview state `no-account`.
- **Event tracking** (GTM → GA4): 22 events through `shared/tracking.js`; clicks tracked from `data-track` attributes. List in `TRACKING.md`. Spec §46.
- Loading placeholder, failed-to-load card with `Try again`, and 15-row pages with load-on-scroll on the Coins lists. Spec §44. New preview states `loading`, `error`, `more-error`.
- Coins history: one row per credit with its time, not merged; source labels; custom date ranges limited to 30 days. Spec §43.
- No pending coins anywhere; same-day crediting is the default; `Updates within 15 mins`. Spec §41. Preview states `has-pending` and `in-day` removed, `credited` and `delayed` added.
- Sample data: rates 70–100 coins per lot, daily maximum 2,000, all sample amounts rescaled.
- `DATA.md` and `STATES.md` changed: see `HANDOFF-2.md` §3 for the full list of fields and states added and removed.
- The programme fields `rateRange`, `termsUrl`, `minHoldSeconds` are on UAT (12 Oct 2026). Empty values are handled: `termsUrl` null, missing or `""` hides the Terms & Conditions button; `minHoldSeconds` = 0 hides the holding-time rule; `rateRange` null hides the rate range.
- **API mapping done:** `shared/api-adapter.js` (converter), `shared/data-source.js` (two sources; replace `request()` to go live), sample answers and a self-check in `mock/api/`. `?source=api` runs the pages on the samples. See `HANDOFF.md` §5 and `HANDOFF-2.md` §4.

## Handoff 1 — 7 Oct 2026

First handoff: display only, mock data, no API.

- Pages: Home (Dashboard), Earn (Daily Trading), Coins (Coin Balance), bottom bar, guided tour (5 steps).
- Data contract: `DATA.md` (first version). States: `STATES.md`.
- All data access is in `shared/data-source.js`; API mapping points are marked `API:` in the code (list in `HANDOFF.md` §5).
- Not wired: every button with `data-intent` (deeplinks, `HANDOFF.md` §6).
- Not in this phase: daily check-in card (present but off: `checkIn.enabled`), lot detail sheet (spec §18).
