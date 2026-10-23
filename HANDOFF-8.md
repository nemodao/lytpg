# Handoff 8 — what changed since handoff 7 (in progress)

**Who this is for:** developers (and their AI assistants) who have already applied handoff 7, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §71 on. Exact line changes:
`CHANGES-since-handoff-7.diff` in the package.

---

## 1. The coin balance shrinks to fit (spec §71)

The balance number in the balance block (Home, and the card on Coins) stays on one line in the room its column leaves
next to `Redeem`. When the number is wider than that room (a very large balance, a narrow screen, or Coins, where the
"Redemption history" link makes the right side wider), the whole number shrinks by the ratio that makes it fit, with
no lower limit. It never wraps, is never cut and never runs under `Redeem`. Normal balances are unchanged.

- **Code:** `watchBalanceNumber` / `fitBalanceNumber` in `shared/components.js`, called from `balanceBlock` on the
  next frame. `fitBalanceNumber` clears `--balance-fit`, measures `clientWidth / scrollWidth` of `.balance-number`
  and, below 1, sets `--balance-fit` (rounded down to 0.01). CSS (`shared/components.css`): `.balance-number` has
  `white-space: nowrap; zoom: var(--balance-fit, 1)`, the same technique as the tier label (`--tier-fit`).
- **Measured again** when the column changes size (a `ResizeObserver` on the number's column: rotation), once the web
  font has loaded (`document.fonts.ready`), and whenever the number's text changes (a `MutationObserver`: the guided
  tour's step 3 counts the balance up). In React, a `useLayoutEffect` keyed on the value plus a `ResizeObserver` on
  the column does the same.
- **Preview:** new shared state `big-balance` (balance 9,876,543,210) on Home and Coins (`SHARED_STATES` in
  `shared/app.js`).
- Not changed: the small balance pill at the top of the Reward Store.
