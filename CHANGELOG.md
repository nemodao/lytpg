# Changelog

One entry per handoff to developers, newest first. Each entry says what changed for the user, which files changed,
and whether the data contract (`DATA.md`) or the states (`STATES.md`) changed.

## Handoff 2 — UI round done 8 Oct 2026; API mapping to follow

**Full description for developers: `HANDOFF-2.md`** (what changed since handoff 1, file by file, and the values to map from the API).

Summary:

- "How to start" on the Today card (Home and Earn) for users who still need KYC or a first deposit, with a finger that taps the button. Spec §39.
- `Terms & Conditions` text button under the rules on Earn; opens a PDF in a bottom sheet. Spec §40.
- Button wording: `Verify my account` / `Deposit now` (were `KYC to join` / `Deposit to join`).
- Sample data: rates 70–100 coins per lot, daily maximum 2,000, all sample amounts rescaled.
- `DATA.md`: one new field, `program.termsUrl`. `STATES.md`: descriptions of `needs-kyc` and `needs-deposit` reworded; no state added or removed.
- API mapping: not done yet. The values to map are listed in `HANDOFF-2.md` §4.

## Handoff 1 — 7 Oct 2026

First handoff: display only, mock data, no API.

- Pages: Home (Dashboard), Earn (Daily Trading), Coins (Coin Balance), bottom bar, guided tour (5 steps).
- Data contract: `DATA.md` (first version). States: `STATES.md`.
- All data access is in `shared/data-source.js`; API mapping points are marked `API:` in the code (list in `HANDOFF.md` §5).
- Not wired: every button with `data-intent` (deeplinks, `HANDOFF.md` §6).
- Not in this phase: daily check-in card (present but off: `checkIn.enabled`), lot detail sheet (spec §18).
