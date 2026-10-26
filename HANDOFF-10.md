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

## Open, for product (spec §79)

"You traded" reads `today.lotsValid` (lots already turned into coins), so it stops rising on a capped day (31.02
lots closed, 20.2 shown). Product decides whether it should read `today.lots`. Until then, no change. If it does
change, the history's `days[].lots` (also the converted figure) needs the backend to send the total too.
