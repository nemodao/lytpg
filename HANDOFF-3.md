# Handoff 3 — what changed since handoff 2

**Who this is for:** developers (and their AI assistants) who have already applied handoff 2 (including the QA fixes
`312e399` and `fd3c846`). Everything not named here is unchanged. Exact line changes: `CHANGES-since-handoff-2.diff`.
Behaviour: `spec.md` §47.

Four changes, all found while testing with the real UAT accounts K1–K10.

---

## 1. Delayed programme: no "after your first trade" line while coins wait

**Seen with:** K8 (T+1). The user traded 2.5 lots today, but the Today card on Earn read "Your lots and coins will show
up here after your first trade."

**Why:** while coins wait (`today.status = "pending"`), `today.lots` (the API's `lotsValid`) is 0, and the page tested
"no trade yet" before the status.

**Change** (`pages/trading-task.js`, `progressCard`): the order of the line under the figures is now
1. capped → "You've earned today's max coins for today."
2. `earning` → "Coins are being credited to your balance"
3. `pending` → **no line**
4. no trade yet → "Your lots and coins will show up here after your first trade."
5. `credited` → "Credited to your balance"

**Check:** K8 on Earn: 0.0 lots, 0 coins, no line under the figures. Preview: `trading-task.html?state=delayed`.

---

## 2. Singular wording

**Seen with:** K8: "Coins are credited **1 days** after the trading day."

**Change:** new copy keys used when the number is 1 (`shared/components.js`, `rulesList`):

| Key | Text | Used when |
|---|---|---|
| `rule.credit.delayed.one` | Coins are credited **1 day** after the trading day. | `program.creditDelayDays` = 1 |
| `rule.hold.one` | Hold each position for at least **1 minute**. Shorter trades earn **0 coins**. | `program.minHoldMinutes` = 1 (and the seconds are a whole minute) |
| `rule.expire.one` | Coins expire **1 day** after they are credited. | `program.expiryDays` = 1 |

**Check:** K8: "credited 1 day after the trading day". Preview: `trading-task.html?state=delayed`.

---

## 3. Dates show the year when it is not the current year

**Seen with:** K4. A check-in lot earned on 15 Sep showed "Expires 10 Sep" (the expiry is in 2046); trading lots
showed "Expires 21 Mar" (2027). It reads as already expired.

**Change** (`shared/app.js`, `ui.date`): day and month, plus the year when the year differs from the current year
(the year of `common.now`, programme time zone). Examples: `19 Oct` (this year), `21 Mar 2027`, `31 Dec 2025`.
`ui.date` is used for every short date: lot lines in Available and Expired, the day titles of the coin history, the
custom range chip. `ui.dateYear` (Earn history rows) is unchanged.

**Check:** K4, Coins, Available: "Expires 21 Mar 2027", check-in lots "Expires 10 Sep 2046", the adjustment lot
"Expires 19 Oct".

---

## 4. Programme ended: only the message, nothing to tap

**Seen with:** K10. Earn already had no trade button, but Home still showed today's figures and "Trade now", and
Earn still showed the account, the rates, the rules and the history.

**Decision:** when `program.ended` is true, the pages only say that the programme has ended, and nothing can be tapped.

**Change:**

| Page | Before | Now |
|---|---|---|
| Home (`pages/dashboard.js`, new `endedCard`) | Daily Trading card with today's figures, `Details`, live feed, `Trade now`; the card was a link to Earn | The card keeps its cup and title, and shows one line "This program has ended" with an info icon. No figures, no `Details`, no live feed, no button, not a link. `loyalty_daily_cap_view` is not sent |
| Earn (`pages/trading-task.js`, `render`) | Ended card, then the trading account card, then the How it works / History card | Only the ended card under the cup |
| Both | "This program has ended" + "Pending coins will still be credited." | "This program has ended" only. Copy key `tt.ended.body` removed |

Styles: `pages/dashboard.css`, new `.task-ended`, `.task-ended__icon`. New preview state on Home: `ended`.

**Check:** K10: Home card shows only the message and is not tappable; Earn shows only the message. Preview:
`dashboard.html?tour=off&state=ended`, `trading-task.html?state=ended`.

---

## Data contract and states

- `DATA.md`: unchanged.
- `STATES.md`: Home has a new state `ended`; the descriptions of Earn `ended` and `delayed` changed (the `delayed`
  sample now credits after 1 day).
