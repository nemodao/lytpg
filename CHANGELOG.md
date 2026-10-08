# Changelog

One entry per handoff to developers, newest first. Each entry says what changed for the user, which files changed,
and whether the data contract (`DATA.md`) or the states (`STATES.md`) changed.

## Handoff 2 — in progress (started 8 Oct 2026)

Phase 2: small UI fixes, then API mapping. Entries are added here as each change is made.

### UI changes

- **"How to start" for users who cannot earn yet** (spec §39). When `program.joinRequirement` is `kyc` or `deposit`, the Daily Trading card on Home and the Today card on Earn show three steps, a one-line rates summary with `See rates`, and the button for the current step, instead of today's figures and the live activity line. Button text is now `Verify my account` / `Deposit now` (was `KYC to join` / `Deposit to join`); its `data-intent` is unchanged (`kyc`, `deposit`). On Earn the button moved from the rates card to the Today card.
  - Files: `shared/components.js` (new `joinPanel`), `shared/components.css` (new `.join*` classes; `.details` moved here from `pages/dashboard.css`), `pages/dashboard.js`, `pages/trading-task.js`, `copy/en.json` (new `join.title`, `join.step.*`, `join.rates*`, `join.seeRates`; changed `join.kyc`, `join.deposit`), state descriptions in `mock/dashboard.json` and `mock/trading-task.json`.
  - `DATA.md`: no new field; the meaning of `program.joinRequirement` is reworded. `STATES.md`: descriptions of `needs-kyc` and `needs-deposit` updated.
- **Sample rates and daily maximum** in `mock/common.json`: rates are now Forex 80, Metal 100, Indices 90, Other 70 coins per lot (were 5 / 10 / 3 / 1) and `program.dailyMaxPoints` is 2000 (was 10000). Data only, no code change; the rates table, the daily-maximum rule and tour step 2 read these values. `DATA.md` examples regenerated.
- **Sample amounts rescaled** to fit the new rates and daily maximum, in `mock/common.json` (`balance.available` 3100, `tour.simulatedBalance` 3410), `mock/dashboard.json`, `mock/trading-task.json` and `mock/point-balance.json`. Data only: no field added, removed or renamed. `DATA.md` and `STATES.md` regenerated (examples and state values only).
- **Nudge on the "How to start" button** (spec §39): after 3 s the tour's finger appears under `Verify my account` / `Deposit now` and double-taps it, with 4 s between double taps, during which the finger floats gently; the button looks pressed on each tap. Files: `shared/components.js` (`joinPanel`: button wrapped in `.join__cta` with `.join__finger`; new option `nudged`), `shared/components.css` (`.join__cta`, `.join__finger`, `@keyframes join-tap`, `join-press`), `pages/trading-task.js` (the finger's entrance plays on the first render only). Image reused: `assets/tour/finger.webp`.
- **Terms & Conditions** (spec §40): text button after the rules in Earn's `How it works` tab; it opens a bottom sheet that shows the document at `program.termsUrl`. Files: `pages/trading-task.js` (`termsButton`, `termsSheet`, actions `open-terms` / `close-terms`), `shared/components.css` (`.sheet--doc`, `.sheet__head`, `.doc*`, `.text-btn`), `copy/en.json` (`tt.terms`, `tt.terms.loading`, `common.close`), `mock/common.json`, new sample `assets/docs/terms-sample.html`. **`DATA.md`: new field `program.termsUrl`** (URL or null; null hides the button).

### API mapping

Not mapped yet. These are the points the UI changes above need from the API; each is marked `API:` in the code and listed in `HANDOFF.md` §5.

| # | Value | Field | Where it shows | Status |
|---|---|---|---|---|
| 1 | Has the user passed KYC / made a first deposit | `program.joinRequirement`: `"kyc"`, `"deposit"` or `null` | Picks "How to start" or today's figures on Home and Earn; picks the step to do and the button (`shared/components.js` `joinPanel`) | Existing field; must now reflect the real user status |
| 2 | Lowest and highest earning rate | `rates[].ptsPerLot` | `70–100 coins per lot` on the "How to start" card; also the rates table and tour step 2 | Existing field |
| 3 | Daily maximum | `program.dailyMaxPoints` | `up to 2,000 a day` on the "How to start" card; also the rules | Existing field |
| 4 | KYC and Deposit screens | `data-intent="kyc"` / `"deposit"` on the button | `Verify my account` / `Deposit now` | Deeplinks from the host app, not API data |
| 5 | Terms & Conditions document | `program.termsUrl`: URL or `null` | Text button under the rules on Earn, and the sheet it opens (`pages/trading-task.js` `termsButton`, `termsSheet`) | **New field.** Format open: web page recommended; PDF likely not readable inside the sheet on phones |
| 6 | Accounts of a user who cannot earn yet | `accounts`, `selectedAccountId` | Not read on Earn while `joinRequirement` is set | May be empty / missing for these users |

Open question for product: should a user who has not passed KYC or made a first deposit see the full rates table on Earn (today: yes)? If not, the API can omit `rates` detail and the card would need another source for the range.

Not API values (fixed in the UI): the three step texts, the 3 s delay and tap rhythm of the finger, button wording.


## Handoff 1 — 7 Oct 2026

First handoff: display only, mock data, no API.

- Pages: Home (Dashboard), Earn (Daily Trading), Coins (Coin Balance), bottom bar, guided tour (5 steps).
- Data contract: `DATA.md` (first version). States: `STATES.md`.
- All data access is in `shared/data-source.js`; API mapping points are marked `API:` in the code (list in `HANDOFF.md` §5).
- Not wired: every button with `data-intent` (deeplinks, `HANDOFF.md` §6).
- Not in this phase: daily check-in card (present but off: `checkIn.enabled`), lot detail sheet (spec §18).
