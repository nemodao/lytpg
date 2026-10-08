# Handoff 2 — what changed since handoff 1

**Who this is for:** developers (and their AI assistants) who have already converted handoff 1 and now need to bring
their code up to date. Everything in handoff 1 that is not named here is unchanged.

**How to use it:** read §1 for the user-facing changes, apply §2 file by file, then check §3 (data) and §4 (API).
The exact line changes are in `CHANGES-since-handoff-1.diff` in this folder. Behaviour is specified in `spec.md` §39
and §40. `HANDOFF.md` still describes the overall structure and is unchanged except for three new rows in its §5.

**Status:** the UI changes are final. The API is **not** mapped yet: data still comes from the mock files through
`shared/data-source.js`, exactly as in handoff 1.

---

## 1. What the user sees (three changes)

### 1.1 "How to start" replaces today's figures for users who cannot earn yet

Applies when `common.program.joinRequirement` is `"kyc"` or `"deposit"`. Shown in two places: the Daily Trading card
on Home and the Today card on Earn. Both render the same shared function.

| | `joinRequirement = "kyc"` | `joinRequirement = "deposit"` |
|---|---|---|
| Step 1 | `Verify your account` — current step (solid number, bold) | `Account verified` — done (green check) |
| Step 2 | `Make your first deposit` — muted | `Make your first deposit` — current step |
| Step 3 | `Trade — coins are credited automatically` — muted | same, muted |
| Button | `Verify my account`, `data-intent="kyc"` | `Deposit now`, `data-intent="deposit"` |

- Under the steps: `70–100 coins per lot · up to 2,000 a day` and a `See rates` link. The range is the lowest and
  highest `rates[].ptsPerLot` above 0; the cap is `program.dailyMaxPoints`. `See rates` goes to the Earn page from
  Home, and scrolls to the Earning rates card (`#rates`) on Earn.
- Not shown in these two cases: today's lots and coins, "Update every 30 mins", the live activity line.
- On Earn the button moved: it is now on the Today card. The Earning rates card below keeps the rates table and has
  no button. These users **do** see the full rates table (product decision).
- When `joinRequirement` is `null`, both pages look exactly as in handoff 1.

**Nudge on the button.** 3 s after the card appears, a hand (the same image as the guided tour's finger,
`assets/tour/finger.webp`) grows in under the button. It then repeats this 4.65 s loop for as long as the card is on
screen: two quick taps on the button (about 0.65 s), then a 4 s wait during which the hand floats 4px away and back,
twice. On each tap the button looks pressed (scale 0.97, pressed colour). The button does not move while waiting.
The hand never catches taps. With reduced motion the hand just appears and nothing moves. It is CSS only.

### 1.2 Terms & Conditions on Earn

- A text button `Terms & Conditions ›` after the last rule in the `How it works` tab. Not shown in the guided tour.
- Tapping it opens a bottom sheet: title, round close button, and the document in a frame that scrolls by itself.
  `Loading…` shows behind the frame until the document paints. Closes with the button, a tap outside, or Escape.
- The document is a **PDF** whose address comes from the new field `program.termsUrl`. If the field is null or
  missing, the button is not rendered.
- **Check this in the real app.** An in-app webview may not display a PDF inside an iframe (Android WebView shows
  nothing; iOS may show only the first page). If it does not display, keep the button and the sheet and either draw
  the PDF with a viewer library inside `.doc`, or have the app open the PDF in its own viewer when the button is
  tapped. The mock uses `assets/docs/terms-sample.pdf`, a placeholder with made-up wording.

### 1.3 Wording and sample numbers

- Button text: `Verify my account` and `Deposit now` replace `KYC to join` and `Deposit to join` everywhere.
- Sample data only (no code): rates are now 80 / 100 / 90 / 70 coins per lot, the daily maximum is 2,000, and every
  sample amount was rescaled to fit (balance 3,100, today 310, pending 120, capped day 2,000).

---

## 2. Files to update

| File | Change |
|---|---|
| `shared/components.js` | **New export `joinPanel(ui, common, { ratesHref, flat, nudged })`**: returns the steps panel, the rates line and the button with its finger. `flat: true` lays the steps straight on the card (Earn). `nudged: true` skips the finger's entrance after a re-render. `joinLabel` and `joinIntent` are unchanged in signature; only the comment and the texts they return changed. |
| `shared/components.css` | New classes: `.join`, `.join__title`, `.join__steps`, `.join__step` (+ `--current`, `--done`, `--later`), `.join__mark`, `.join__rates`, `.join__cta` (+ `--nudged`), `.join__finger`; keyframes `join-tap`, `join-press`. New: `.sheet--doc`, `.sheet__head`, `.doc`, `.doc__loading`, `.doc__frame`, `.text-btn`. Moved here from `pages/dashboard.css` without change: `.details`. |
| `pages/dashboard.js` | The Today panel, live feed and trade button moved into a new local function `taskProgress()`. `taskCard()` now renders `joinPanel(...)` when `common.program.joinRequirement` is set, else `taskProgress()`. Imports: `joinPanel` added, `joinIntent` / `joinLabel` removed. |
| `pages/dashboard.css` | `.details` removed (moved to `shared/components.css`). |
| `pages/trading-task.js` | New `joinCard()`; `progressCard()` returns it when `program.joinRequirement` is set. `accountsCard()` join branch: no button, section gets `id="rates"`. `tradeButton()` no longer handles the join case. New `termsButton()` and `termsSheet()`, state `termsOpen`, actions `open-terms` / `close-terms`; `close-sheet` and Escape also close the terms sheet. New flag `nudged` (set after the first render). |
| `copy/en.json` | Changed: `join.kyc`, `join.deposit`. New: `join.title`, `join.step.kyc`, `join.step.kyc.done`, `join.step.deposit`, `join.step.trade`, `join.rates`, `join.rates.single`, `join.rates.cap`, `join.seeRates`, `tt.terms`, `tt.terms.loading`, `common.close`. |
| `mock/common.json` | New `program.termsUrl`. Changed sample values: `rates[].ptsPerLot`, `program.dailyMaxPoints`, `balance.available`, `tour.simulatedBalance`. |
| `mock/dashboard.json`, `mock/trading-task.json`, `mock/point-balance.json` | Sample amounts only, plus the descriptions of the `needs-kyc` and `needs-deposit` preview states. No field added, removed or renamed. |
| `assets/docs/terms-sample.pdf` | New sample file. |
| `pages/dashboard.html`, `pages/trading-task.html`, `shared/app.js` | Comments only. |

Not changed: `shared/data-source.js`, `shared/app.js` logic, `shared/nav.js`, `shared/tour.js`, `shared/live-feed.js`,
`shared/date-filter.js`, `pages/point-balance.*`, `tokens/*`, every `data-intent` and `data-tour` value, every file,
function and class name that existed in handoff 1.

---

## 3. Data contract

- **One new field:** `program.termsUrl` — URL of a PDF, or null. See `DATA.md`.
- **Same field, stricter meaning:** `program.joinRequirement` now decides what the Today card shows, not only the
  button text.
- **States (`STATES.md`):** no state added or removed. `needs-kyc` and `needs-deposit` have new descriptions.

---

## 4. Values to map from the API (not mapped yet)

Each of these is marked `API:` in the code.

| # | What the API must provide | Field | Read in | Note |
|---|---|---|---|---|
| 1 | Whether the user still needs KYC or a first deposit | `program.joinRequirement`: `"kyc"` \| `"deposit"` \| `null` | `shared/components.js` `joinPanel`; `pages/dashboard.js` `taskCard`; `pages/trading-task.js` `progressCard`, `accountsCard` | `"kyc"` until identity is verified, then `"deposit"` until the first deposit, then `null`. Existing field. |
| 2 | Earning rates | `rates[].ptsPerLot` | `joinPanel` (range), rates table, tour step 2 | Existing field. Must be sent for users who cannot earn yet too. |
| 3 | Daily maximum | `program.dailyMaxPoints` | `joinPanel` (cap), rules list | Existing field. |
| 4 | Terms & Conditions document | `program.termsUrl`: URL of a PDF, or `null` | `pages/trading-task.js` `termsButton`, `termsSheet` | **New field.** |
| 5 | Accounts of a user who cannot earn yet | `accounts`, `selectedAccountId` | not read on Earn while `joinRequirement` is set | May be empty / missing for these users. |

Not API data:

- `data-intent="kyc"` and `data-intent="deposit"`: the host app attaches the KYC and Deposit deeplinks (same as handoff 1).
- Fixed in the UI: the three step texts (copy file), the 3 s delay and the tap rhythm (`JOIN_NUDGE_AFTER` in
  `shared/components.js`, keyframes in `shared/components.css`).

---

## 5. Quick check after updating

Open each address in the reference build and compare with your version:

| Address | Expect |
|---|---|
| `pages/dashboard.html?tour=off&state=needs-kyc` | Steps with step 1 current, `Verify my account`, hand taps after 3 s |
| `pages/dashboard.html?tour=off&state=needs-deposit` | Step 1 checked, step 2 current, `Deposit now` |
| `pages/trading-task.html?state=needs-kyc` | Same block on the Today card; rates card below without a button; no account picker |
| `pages/trading-task.html` | Unchanged page; `Terms & Conditions ›` under the rules opens the sheet |
| `pages/dashboard.html?tour=off` | Unchanged apart from the sample numbers |
