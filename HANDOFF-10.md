# Handoff 10 — what changed since handoff 9 (in progress)

**Who this is for:** developers (and their AI assistants) who have already applied handoff 9, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §79 on. Exact line changes:
`CHANGES-since-handoff-9.diff` in the package.

---

## 1. Lots show up to 2 decimals (spec §79)

Found on UAT: a day of 11.02 lots read "11.0 lots". The backend sends the right figure; the page rounded every lot
figure to one decimal (a 0.01-lot trade read "0.0 lots").

- **Reference** (`shared/app.js`): `ui.lots` formats with `maximumFractionDigits: 2` and no minimum
  (`lotNumber`, in the copy's locale), replacing `oneDecimal`: `11.02`, `1.5`, `10`, `0.01`, `0`; Indonesian `11,02`.
  `ui.lotUnit` is unchanged (`lot` from above 0 to 1, `lots` otherwise).
- **Yours:** `core/format/index.ts`, the `oneDecimal` formatter used for lots: same change.
- Where: "You traded" on Earn's Today card and every row of the Earn history.
- Mock: the history has a day of 11.02 lots and one of 0.02 lot (`mock/trading-task.json`,
  `mock/api/tradingTask-getHistory.json`).

## 2. Tier sheet: the amount deposited rounds down (spec §79)

`usd()` in `pages/trading-task.js` takes the rounding: the amount still to deposit rounds up (as the Deposit
button's `data-amount` already did), the amount deposited in "$… of $… deposited" rounds down. Before, $999.50
deposited read "$1,000 of $1,000 deposited" next to "Deposit $1 more".

## 3. "You traded" shows the lots actually traded (spec §79)

Decided by the owner (26 Oct 2026). Found on UAT: a client who closed 31.02 lots on a capped day read 20.2.

- **Reference** (`shared/api-adapter.js`, `toToday`): `today.lots` (the API's `today.lots`: every valid position
  closed today, coins arrived or not, still rising after the daily maximum) instead of `today.lotsValid` (lots
  already turned into coins, which stops at the cap). `DATA.md` updated.
- **Yours:** `core/data-source/api-adapter.ts`, `toToday`: `lots: today.lots ?? 0`.
- What changes on screen: right after a trade the card reads its lots and 0 coins, with "Coins are being credited…",
  until the coins arrive; on a capped day the lots keep rising; a delayed programme shows the day's lots and 0 coins.
- Mock: `today.lots` 4.3 by default (the sample answer's `lots`), 0.5 in `first-trade`, 31.02 in `capped`, 2 in
  `delayed`.
- Not changed: the Earn history's rows still read `days[].lots`, the converted figure, until the backend sends the
  lots traded per day too; until then today's row can read fewer lots than the Today card.
