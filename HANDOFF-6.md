# Handoff 6 — what changed since handoff 5

> **Status: in progress.** This file grows until the round is handed off (after the QA of handoff 5 on UAT); read it
> again then.

**Who this is for:** developers (and their AI assistants) who have already applied handoff 5. Everything not named here
is unchanged. Exact line changes: `CHANGES-since-handoff-5.diff` in the package.

---

## 1. Events: `source` on the tier sheet's trade button (spec §51)

On Platinum, the tier sheet's `Trade with account …` button now sends `loyalty_trade_click` with `source` = `upgrade`,
like `Deposit now` in the same sheet, so trades started from the sheet can be told apart. The trade button on Earn is
unchanged (no `source`).

- `pages/trading-task.js`: `tradeButton(source)` adds `data-track-source` when given; the sheet calls
  `tradeButton('upgrade')`.
- `TRACKING.md`: `source` listed on `loyalty_trade_click`. Still 31 events; GTM reads it through the same `source`
  variable as the other events.
