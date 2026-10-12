# Handoff 2 — what changed since handoff 1

**Who this is for:** developers (and their AI assistants) who have already converted handoff 1 and now need to bring
their code up to date. Everything in handoff 1 that is not named here is unchanged.

**How to use it:** read §1 for the user-facing changes, apply §2 file by file, then check §3 (data) and §4 (API).
The exact line changes are in `CHANGES-since-handoff-1.diff` in this folder. Behaviour is specified in `spec.md` §39
to §42. `HANDOFF.md` still describes the overall structure and is unchanged except for three new rows in its §5.

**Status:** the UI changes are final. The API is **not** mapped yet: data still comes from the mock files through
`shared/data-source.js`, exactly as in handoff 1.

---

## 1. What the user sees

### 1.1 "How to start" replaces today's figures for users who cannot earn yet

Applies when `common.program.joinRequirement` is `"kyc"` or `"deposit"`. Shown in two places: the Daily Trading card
on Home and the Today card on Earn. Both render the same shared function.

| | `joinRequirement = "kyc"` | `joinRequirement = "deposit"` |
|---|---|---|
| Step 1 | `Verify your account` — current step (solid number, bold) | `Account verified` — done (green check) |
| Step 2 | `Make your first deposit` — muted | `Make your first deposit` — current step |
| Step 3 | `Trade — coins are credited automatically` — muted | same, muted |
| Button | `Verify my account`, `data-intent="kyc"` | `Deposit now`, `data-intent="deposit"` |

- Under the steps: `70–100 coins per lot · up to 2,000 a day`. The range is `program.rateRange` (`min`–`max`; one
  figure when they are equal); the cap is `program.dailyMaxPoints`. Either half is left out when its value is null.
  There is **no** `See rates` link.
- Not shown in these two cases: today's lots and coins, the update note, the live activity line.
- On Earn these users see **no Trading account card and no rates table**: they have no trading account, and rates
  belong to an account. The page is the "How to start" card followed by the rules. The button is on that card.
- When `joinRequirement` is `null`, both pages show today's figures as in handoff 1.

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

### 1.4 No pending coins; same-day crediting by default (spec §41)

Decided on 12 Oct 2026 after the review of the real API.

- Removed everywhere: the `+N pending` line under the balance (`balanceBlock`), pending lots in the Coins Available tab, the `Trading today · Earning` row in the Coins History tab, the `Pending` badge. Removed preview state: `has-pending` (all three pages, and from `SHARED_STATES`).
- The sample programme now credits the same day: `program.creditMode` is `"in-day"` by default. Preview states on Earn: `credited` and `delayed` replace `in-day`.
- Earn, Today card, line under the figures: `earning` → `Coins are being credited to your balance`; `credited` → `Credited to your balance`; `pending` → no line.
  The status wins over the figures: `earning` shows its line even while lots and coins still read 0 (first trade of the day; preview state `first-trade`). `not_started` shows the "after your first trade" line.
- Earn history: days with status `pending` are filtered out; today's row is labelled `Today` and carries today's own status.
- `Updates within 15 mins` and the in-day rule `Coins are credited within 15 minutes after you close a position.` read the new `program.creditWithinMinutes`, which is fixed in the UI and not sent by the API. `program.refreshMinutes` is gone.

Files: `shared/components.js` (`balanceBlock`, `rulesList`), `shared/app.js` (`SHARED_STATES`), `pages/dashboard.js`, `pages/trading-task.js` (`progressCard`, `historyList`), `pages/point-balance.js`, `copy/en.json` (removed `balance.pending`, `tt.status.pending`, `badge.pending`, `pb.item.pending.meta`, `hist.earning`; new `tt.status.earning`; changed `task.updateEvery`, `rule.credit.inDay`), all four mock files.

`DATA.md`: removed `balance.pending`, `program.refreshMinutes`, `pendingItems[]`; new `program.creditWithinMinutes`; `today.status` and `history[].status` now also take `"earning"`. `STATES.md`: `has-pending` and `in-day` removed, `credited` and `delayed` added.

---

### 1.5 Rates belong to a trading account; users without an account see only the rate range (spec §42)

- **Earning rates table (Earn):** shows the rates of the **selected account** (`accounts[].rates[]`), in the order the
  data gives them. Switching account switches the table. Row label: a group name for `symbol_group` (Forex, Metal,
  Energy, Indices, Stocks, Others), the symbol itself for `symbol` (e.g. `XAUUSD`), `Others` for `any`; an unknown
  group is shown as received. An account that is not eligible has no rates and shows the "not part of the program"
  notice, as before.
- **Users without a trading account never see the table.** They see `70–100 coins per lot · up to 2,000 a day`
  (`program.rateRange`, `program.dailyMaxPoints`). This covers three cases:

| Case | How to recognise it | Earn page |
|---|---|---|
| Not yet KYC | `joinRequirement = "kyc"` | "How to start" card (with the range line), then the rules |
| KYC done, no first deposit | `joinRequirement = "deposit"` | same |
| Allowed to trade, no live account | `joinRequirement = null` and `accounts` empty | Today card as usual; then a card "Trading account" with `You don’t have a live trading account yet. Open one to start earning coins.`, the range line and the button `Open a trading account` (`data-intent="open-account"`) |

- **Tour step 2** reads `Earn up to 100 coins per lot` from `program.rateRange.max`; when it is missing the sentence
  is just `Here’s how it works:`.
- New preview state on Earn: `no-account`.

---

### 1.6 Coins history row by row; 30-day limit on custom ranges (spec §43)

- **Coins, History tab:** one row per movement, never merged. Row = label, time of `happenedAt` (small, after the
  label), signed amount. Rows are grouped by `date`, newest first, in a tighter list (`.list--compact`). The mock
  history is now in the API's own shape: `{ happenedAt, date, type, source, points }` with `type` =
  `earn | consume | refund | expire | adjust_positive | adjust_negative`. Label: for `earn` the source
  (`pb.source.<source>`), otherwise `hist.consume`, `hist.refund`, `hist.expire`, `hist.adjust`.
- **Lot date** (`items[].earnedOn`): now means the day the coins reached the balance. No visual change.
- **Calendar:** a custom range is at most 30 days (`MAX_DAYS` in `shared/date-filter.js`): days later than start + 29
  are disabled, and a hint line reads `You can select up to 30 days.` The real list APIs refuse longer ranges.

Files: `pages/point-balance.js` (`historyLabel`, `historyRow`, `historyTab`, `source`), `shared/date-filter.js`,
`shared/components.css` (`.list--compact`, `.hist-time`, `.cal-hint`), `copy/en.json` (new `pb.source.daily_checkin`,
`pb.source.adjust`, `filter.max`; renamed `hist.redeemed` → `hist.consume`, `hist.refunded` → `hist.refund`,
`hist.expired` → `hist.expire`, `hist.adjusted` → `hist.adjust`; removed `hist.earned`), `mock/point-balance.json`.

`DATA.md`: `history[]` on Coins has a new field `happenedAt`, and new values for `type` and `source`.

---

### 1.7 Loading, failed to load, paged lists (spec §44)

- **`showStatus(ui, common, app, header)`** (new, `shared/components.js`): when `common.view` is `"loading"` or
  `"error"` it renders the page header plus the loading skeleton or the error card, and returns true; the page then
  only mounts the bottom bar. In the product, drive it from the requests: loading until every request of the page has
  answered, error when any fails (no network, HTTP error, or a response without `success = true`). `Try again`
  (`data-action="retry"`) repeats the requests; the demo reloads the page.
- **Paged lists on Coins** (`pages/point-balance.js`): `PAGE_SIZE = 15` per tab (`shown`), `loadMoreRow(ui, failed)`
  (new, `shared/components.js`) at the end of a list that has more rows, an `IntersectionObserver` on that row
  (`watchEnd`) that calls `loadMore()`. In the demo `loadMore` waits `LOAD_DELAY_MS` and shows more of the list it
  already has; with the API it requests `pageNo + 1` until the rows shown reach `total`. A new date range resets to
  the first page.
- New preview states: `loading`, `error` (all pages), `more-error` (Coins). New PREVIEW ONLY data: `view`,
  `loadMoreError`.

Files: `shared/components.js`, `shared/components.css` (`.skeleton*`, `.page-error*`, `.load-more`, `.spinner`),
`pages/dashboard.js` (page body now inside `if (showStatus(...)) … else …`), `pages/trading-task.js`,
`pages/point-balance.js`, `copy/en.json` (`common.retry`, `common.loading`, `common.loadingMore`,
`common.loadMoreError`, `error.title`, `error.body`), the three page mock files.

---

## 2. Files to update

| File | Change |
|---|---|
| `shared/components.js` | **New export `joinPanel(ui, common, { flat, nudged })`**: returns the steps panel, the rate range line and the button with its finger. `flat: true` lays the steps straight on the card (Earn). `nudged: true` skips the finger's entrance after a re-render. **New export `rateRangeLine(ui, common)`**: the `70–100 coins per lot · up to 2,000 a day` line, also used by the no-account card. `rulesList` hides the daily-maximum rule when `program.dailyMaxPoints` is null; `balanceBlock` no longer shows pending coins. `joinLabel` and `joinIntent` are unchanged in signature; only the comment and the texts they return changed. |
| `shared/components.css` | New classes: `.join`, `.join__title`, `.join__steps`, `.join__step` (+ `--current`, `--done`, `--later`), `.join__mark`, `.join__rates`, `.join__cta` (+ `--nudged`), `.join__finger`; keyframes `join-tap`, `join-press`. New: `.sheet--doc`, `.sheet__head`, `.doc`, `.doc__loading`, `.doc__frame`, `.text-btn`. Moved here from `pages/dashboard.css` without change: `.details`. |
| `pages/dashboard.js` | The Today panel, live feed and trade button moved into a new local function `taskProgress()`. `taskCard()` now renders `joinPanel(...)` when `common.program.joinRequirement` is set, else `taskProgress()`. Imports: `joinPanel` added, `joinIntent` / `joinLabel` removed. |
| `pages/dashboard.css` | `.details` removed (moved to `shared/components.css`). |
| `pages/trading-task.js` | New `joinCard()`; `progressCard()` returns it when `program.joinRequirement` is set. `accountsCard()`: returns nothing when `joinRequirement` is set; returns the new no-account card when `accounts` is empty; otherwise shows the rates of the selected account (`rateLabel`, `rateRow(rate)`, `ratesList(account)`, constant `RATE_GROUPS`). `tradeButton()` no longer handles the join case. Today line and history changed as in §1.4. New `termsButton()` and `termsSheet()`, state `termsOpen`, actions `open-terms` / `close-terms`; `close-sheet` and Escape also close the terms sheet. New flag `nudged` (set after the first render). |
| `copy/en.json` | Changed: `join.kyc`, `join.deposit`. New: `join.title`, `join.step.kyc`, `join.step.kyc.done`, `join.step.deposit`, `join.step.trade`, `join.rates`, `join.rates.single`, `join.rates.cap`, `tt.terms`, `tt.terms.loading`, `common.close`, `tt.noAccount.body`, `tt.noAccount.cta`, `tt.status.earning`, `tour.2.bodyNoRate`, `rate.index`, `rate.energy`, `rate.stocks`. Removed: `rate.indices`, `tt.rates.introNoAccount`, and the pending keys listed in §1.4. Changed: `rate.other` (`Others`), `task.updateEvery`, `rule.credit.inDay`. |
| `mock/common.json` | New `program.termsUrl`, `program.rateRange`, `program.creditWithinMinutes`, `accounts[].rates[]`. Removed: top-level `rates`, `balance.pending`, `program.refreshMinutes`. Changed sample values: `program.creditMode` (`in-day`), `program.dailyMaxPoints`, `balance.available`, `tour.simulatedBalance`. |
| `mock/dashboard.json`, `mock/trading-task.json`, `mock/point-balance.json` | Sample amounts; preview states changed (see §3); `pendingItems` removed from `point-balance.json`. |
| `shared/tour.js` | Step 2 reads the top rate from `program.rateRange.max`; without it the text is `tour.2.bodyNoRate`. |
| `shared/app.js` | `SHARED_STATES` no longer contains `has-pending`. |
| `assets/docs/terms-sample.pdf` | New sample file. |
| `pages/*.html` | Comments only (list of states). |

Not changed: `shared/data-source.js`, `shared/nav.js`, `shared/live-feed.js`, `tokens/*`, every `data-intent` and `data-tour` value that existed in handoff 1 (one new intent: `open-account`), every file
name. Function and class names that existed in handoff 1 are unchanged, except `rateRow` / `ratesList` in
`pages/trading-task.js`, which now take a rate / an account.

---

## 3. Data contract (`DATA.md`) and states (`STATES.md`)

| Change | Field |
|---|---|
| New | `program.termsUrl`, `program.rateRange.min` / `.max`, `program.creditWithinMinutes` (fixed in the UI), `accounts[].rates[].type` / `.value` / `.ptsPerLot` |
| Removed | top-level `rates[]`, `balance.pending`, `program.refreshMinutes`, `pendingItems[]` (Coins) |
| Same name, wider meaning | `program.joinRequirement` (decides what the Today card and the Earn page show), `program.dailyMaxPoints` (may be null), `today.status` and `history[].status` (also `"earning"`), `selectedAccountId` (may be null), `accounts` (may be empty) |

Preview states: removed `has-pending` (all pages) and `in-day` (Earn); added `first-trade`, `credited`, `delayed`, `no-account` (Earn),
`loading` and `error` (all pages), `more-error` (Coins).
`needs-kyc` and `needs-deposit` have new descriptions.

---

## 4. Values to map from the API (not mapped yet)

The real API is now known. The mapping itself (a converter in `shared/data-source.js`) comes in the next drop; until
then the mock files feed the pages. This table tells you where each value will come from.

| # | UI field (`DATA.md`) | Source | Note |
|---|---|---|---|
| 1 | `program.joinRequirement` | App sign-in data (`/app/signin`), **not** the loyalty API | `kycApproveTime` = 0 → `"kyc"`; `kycApproveTime` > 0 and `firstDepositTime` = 0 → `"deposit"`; otherwise `null` |
| 2 | `program.tradingTask` | `tradingTask/get` → `tradingTask` | `false` hides the whole trading part, whatever the KYC status |
| 3 | `program.rateRange` | `tradingTask/get` → `program.rateRange` | **Being added by backend, not on UAT yet.** Treat a missing field as null |
| 4 | `program.termsUrl` | `tradingTask/get` → `program.termsUrl` | **Being added by backend, not on UAT yet.** URL of a PDF, or null |
| 5 | `program.dailyMaxPoints` | `tradingTask/get` → `program.dailyMaxPoints` | May be null |
| 6 | `accounts[]`, `accounts[].rates[]`, `selectedAccountId` | `tradingTask/get` | Same shape as the mock. `accounts` may be empty; then `selectedAccountId` is missing |
| 7 | `today.lots` | `tradingTask/get` → `today.lotsValid` | Not `today.lots`: `lotsValid` matches the lots shown in the history. It rises together with `today.points`, when coins arrive |
| 8 | `today.status` | `tradingTask/get` → `today.status` | `not_started` \| `earning` \| `credited` \| `pending` |
| 9 | `balance.available`, `balance.expiring` | `coin/summary` | `pending` from the API is not used |
| 10 | `program.creditWithinMinutes` | none | Fixed in the UI (15) |

Not API data:

- `data-intent` values: the host app attaches the deeplinks. New in this handoff: `open-account`.
- Fixed in the UI: the three step texts, the 3 s delay and the tap rhythm (`JOIN_NUDGE_AFTER` in
  `shared/components.js`, keyframes in `shared/components.css`).

---

## 5. Quick check after updating

Open each address in the reference build and compare with your version:

| Address | Expect |
|---|---|
| `pages/dashboard.html?tour=off&state=needs-kyc` | Steps with step 1 current, `Verify my account`, hand taps after 3 s |
| `pages/dashboard.html?tour=off&state=needs-deposit` | Step 1 checked, step 2 current, `Deposit now` |
| `pages/trading-task.html?state=needs-kyc` | Same block on the Today card; no Trading account card, no rates table |
| `pages/trading-task.html?state=no-account` | Today card with zeros; card with the message, the range line and `Open a trading account` |
| `pages/trading-task.html?state=delayed&tab=history` | 0 coins on the Today card, no line under the figures, no row for today |
| `pages/trading-task.html` | Rates of the selected account (six rows); switching account changes the table; `Terms & Conditions ›` under the rules opens the sheet |
| `pages/dashboard.html?tour=off` | No pending line under the balance; `Updates within 15 mins`; new sample numbers |
