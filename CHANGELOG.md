# Changelog

One entry per handoff to developers, newest first. Each entry says what changed for the user, which files changed,
and whether the data contract (`DATA.md`) or the states (`STATES.md`) changed.

## Handoff 2 — UI changes and API mapping (12 Oct 2026)

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
- **API mapping done:** `shared/api-adapter.js` (converter), `shared/data-source.js` (two sources; replace `request()` to go live), sample answers and a self-check in `mock/api/`. `?source=api` runs the pages on the samples. See `HANDOFF.md` §5 and `HANDOFF-2.md` §4.

## Handoff 1 — 7 Oct 2026

First handoff: display only, mock data, no API.

- Pages: Home (Dashboard), Earn (Daily Trading), Coins (Coin Balance), bottom bar, guided tour (5 steps).
- Data contract: `DATA.md` (first version). States: `STATES.md`.
- All data access is in `shared/data-source.js`; API mapping points are marked `API:` in the code (list in `HANDOFF.md` §5).
- Not wired: every button with `data-intent` (deeplinks, `HANDOFF.md` §6).
- Not in this phase: daily check-in card (present but off: `checkIn.enabled`), lot detail sheet (spec §18).
