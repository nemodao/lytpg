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

## 2. Event tracking review (spec §54)

All events were reviewed screen by screen. `TRACKING.md` is the contract (now 33 events); the changes:

- **`shared/tracking.js`:**
  - Every push first clears every event parameter (`PARAMS`, set to `undefined`): GTM keeps the last value of each
    key, so without this an event without `source` was read with an earlier event's `source`. **Keep this in the
    Next.js version, and add any new parameter to `PARAMS`.**
  - Every value is sent as text (`has_task` was a boolean, the tour step a number).
  - New common parameter `loyalty_tier` (`highestTier` in the new `shared/tiers.js`, which now holds `TIERS` for
    Earn too). GTM sets it as a GA4 user property. Not sent for guests.
  - `initTracking(page, common, extra)` takes extra common parameters (Redemption history: `view`).
- **"How to start"** (`joinPanel`, `mountJoinSheet` in `shared/components.js`): every button carries `source`
  (`card` | `redeem`) and, in the sheet, `from`. The sheet's `loyalty_join_card_view` is sent on every opening with
  `source` and `from`; `step` is gone from it.
- **Guests** (`balanceBlock`): the balance sends `loyalty_card_click` (`coins`), `Redemption history` sends
  `loyalty_orders_open`. The Coins sign-up card sends `loyalty_join_card_view` (`source` = `card`).
- **Home** (`pages/dashboard.js`): new `loyalty_rewards_view` (`watchRewards`); `position` is the rank among the
  rewards; `reward_name`, `affordable` on `loyalty_reward_click`.
- **Earn** (`pages/trading-task.js`): new `loyalty_upgrade_row_view`; the tier sheet's Deposit and Trade buttons carry
  `tier` and `next_tier`.
- **Redemption history** (`pages/redemptions.js`): `view` on every event; `item_type` and `status` on Show, Copy and
  Open voucher; a failed order sends `loyalty_error_view` with `error_scope` = `order`, a failed "load more" with
  `more`, once per page load like Coins (`showStatus` takes the scope).
- **Coins:** a failed "load more" sends `loyalty_error_view` (`error_scope` = `more`).
- **Tour** (`shared/tour.js`): `step` → `tour_step`; `step_count` on start, step view, skip and finish.
- **New check:** `tools/check-tracking.mjs` runs the pages (Playwright) and checks every rule and scenario. Running
  the same scenarios against the Next.js app is the quickest way to confirm the conversion.
- **GTM / GA4** (`TRACKING.md`, "Setting up GTM and GA4"): Data Layer Variables for the new parameters,
  `loyalty_tier` as a user property, custom dimensions, retention, key events, history-based page views off.
