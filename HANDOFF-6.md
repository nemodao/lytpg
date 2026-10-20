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
- `TRACKING.md`: `source` listed on `loyalty_trade_click`; GTM reads it through the same `source` variable as the
  other events. (§2 then brings the total to 33 events.)

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
- **New check:** `tools/check-tracking.mjs` (now in the package) runs the pages (Playwright) and checks every rule and
  scenario: serve the package folder on port 8000 (e.g. `python3 -m http.server 8000`), run
  `npm install --no-save playwright@1.64.0` once, then `node tools/check-tracking.mjs` (`BASE` points it elsewhere). Running the same scenarios against the Next.js app is the quickest way to confirm
  the conversion.
- **Event documentation for data and marketing:** https://nemodao.github.io/lytpg_events/ (the same 33 events, every
  parameter value explained; English, Chinese, Vietnamese).
- **GTM / GA4** (`TRACKING.md`, "Setting up GTM and GA4"): Data Layer Variables for the new parameters,
  `loyalty_tier` as a user property, custom dimensions, retention, key events, history-based page views off.

## 3. Tier label next to "Coin Balance" on Home and Coins (spec §55)

- **New in `shared/tiers.js`:** `tierIndex`, `defaultAccountId`, `chosenAccountId`, `rememberAccount`. The account the
  pages show is chosen once for the session (sessionStorage key `hsb-loyalty-account-v1`): the one picked on Earn,
  else the eligible account on the highest tier (several on that tier: the app's own account if it is one of them,
  else the first in the API's order), else the app's account.
- **Earn** (`pages/trading-task.js`) now opens on that account instead of the app's account, and remembers a pick
  (`select-account`). With `?focus=account` it scrolls to the account card (`data-account-card`).
- **Home and Coins** (`balanceBlock` in `shared/components.js`): a tier badge next to "Coin Balance"
  (`balanceTier`), linking to `trading-task.html?focus=account`; only when Earn would show a tier for that account
  (trading task on, programme running, account eligible and on one of the four tiers; never for guests). New copy key
  `balance.tierLink` (its label for screen readers). The badge stays on the "Coin Balance" line: `fitBalanceTier`
  measures the room left and sets `--tier-fit` (CSS `zoom`, so text, padding and pill shrink together) down to
  `TIER_MIN_FIT` (0.75); below that it wraps under the label. A `ResizeObserver` measures again on rotation and once
  the web font has loaded. On Coins (`balanceBlock(…, { card: true })`) the badge is not on that line: it hangs on
  the card's top edge (`.balance-tier--edge`, middle on the border, on the left above the coin).
- **Tier badge colours changed (Earn too):** the `.tier--*` classes moved from `pages/trading-task.css` to
  `shared/components.css` and now read new tokens, one pair per tier and mode: `--ui-tier-micro-surface` /
  `--ui-tier-micro-text`, and the same for `standard`, `vip`, `platinum` (`tokens/tokens.json`, `tokens.css` rebuilt).
  Opaque, so the Coins card border does not show through. Platinum is no longer black/white, which looked like the
  main buttons.
- **Data:** `common.selectedAccountId` (the account the app trades with, from `tradingTask/get`; null for guests) so
  Home and Coins pick the same default as Earn. `DATA.md` updated.
- **Event:** `loyalty_tier_badge_click` with `tier` (`TRACKING.md`, now 34 events; covered by `tools/check-tracking.mjs`).
- **Mock:** two more accounts in `mock/common.json` and `mock/api/tradingTask-get.json`, so the default data has one
  account on every tier: 50000387 Micro (`Direct\Mini400`, $80 deposited) and 50000455 Standard (`Direct\Mini10`, $450).
- **Preview only:** Earn's tier states and `ineligible-selected` set `page.previewAccountId` to keep their account.

## 4. Close button in the bottom bar: red blend in dark mode (spec §56)

- `.nav__exit` (`shared/components.css`) now paints `--nav-exit-surface`: one small soft radial gradient of red
  behind the X over `--ui-nav-surface`, so the button stays black. Background only, no shadow.
- New token `--ui-nav-exit-glow` (transparent in light, so light mode looks as before) and the composed
  `--nav-exit-surface` (`tokens/tokens.json`, `tokens.css` rebuilt).
