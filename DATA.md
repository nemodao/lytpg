# Data contract

_Generated from the mock files by `tools/build-data-contract.py`. Do not edit by hand._

These are the only data the pages read. All of it enters through `shared/data-source.js`: today that file
reads the mock JSON; to connect the API, make its functions return **these same shapes** and nothing else
changes. Field names say `points` for historical reasons; on screen the unit is always "coins".

Rows marked **PREVIEW ONLY** or **DEMO generator** exist for the demo and are not expected from the API.
Dates without a time are calendar days in WIB (GMT+7). Amounts are whole coins.

## Shared by all pages — `fetchCommon()`

Example file: `mock/common.json`

| Field | Type | Example | Meaning |
|---|---|---|---|
| `now` | string | `"2026-10-14T14:35:00+07:00"` | Current server time, ISO 8601 with offset. Drives "today", days until expiry, and the live-feed open/closed check. |
| `balance.available` | number | `12450` | Coins the user can spend now. The big number on Home and Coins. |
| `balance.pending` | number | `0` | Coins earned but not yet credited. Shown as "+850 pending" when above 0. |
| `balance.expiring` | null or object | `null` | Coins about to expire, or null. When set, the red warning shows under the balance. |
| `balance.expiring.points` |  |  | How many coins expire within the warning window. |
| `balance.expiring.date` | YYYY-MM-DD |  | Date of the nearest expiry (not displayed; kept for reference). |
| `program.ended` | boolean | `false` | true when the programme is over: Earn shows the end message, no trade button. |
| `program.creditMode` | "delayed" | "in-day" | `"delayed"` | When earned coins are credited: "delayed" (after creditDelayDays) or "in-day" (through the day). |
| `program.dailyMaxPoints` | number | `10000` | Most coins a user can earn per day. Shown in the rules. |
| `program.minHoldMinutes` | number | `3` | Minimum time a position must be held to earn. Shown in the rules. |
| `program.creditDelayDays` | number | `3` | Days between the trading day and crediting, in "delayed" mode. Shown in the rules. |
| `program.expiryDays` | number | `30` | Days after crediting until coins expire. Shown in the rules. |
| `program.refreshMinutes` | number | `30` | How often today's figures refresh. Shown as "Update every 30 mins". |
| `program.resetTime` | HH:MM | `"00:00"` | Local time (WIB) at which a new earning day starts. Shown in the rules. |
| `program.expiryWarningDays` | number | `10` | Size of the "expiring soon" window in days: the balance warning text and the red highlight on lots. |
| `program.tradingTask` | boolean | `true` | false when the trading task is off or hidden for this user: Home hides the Daily Trading card and the bottom bar drops the Earn tab. |
| `program.joinRequirement` | null | "kyc" | "deposit" | `null` | What the user must still do before joining the trading task. Changes the trade button text and hides the account picker on Earn. |
| `accounts[].id` | string | `"50000234"` | Trading account number, shown as is. |
| `accounts[].eligible` | boolean | `true` | Whether this account takes part in the programme (false e.g. for an MT5 group that is excluded). |
| `rates[].group` | "forex" | "metal" | "indices" | "other" | `"forex"` | Symbol group of an earning rate; its label is copy key rate.<group>. |
| `rates[].ptsPerLot` | number | `5` | Coins earned per lot in that group. Rows with 0 are hidden. The highest value fills "Earn up to {max} coins per lot" in the tour. |
| `liveFeed.openUtc.day` | weekday name | `"Sunday"` | Start of the weekly window in which the live activity line shows (UTC). |
| `liveFeed.openUtc.time` | HH:MM | `"17:00"` | Start time of that window (UTC). |
| `liveFeed.closeUtc.day` | weekday name | `"Friday"` | End of the weekly window (UTC). |
| `liveFeed.closeUtc.time` | HH:MM | `"17:00"` | End time of that window (UTC). |
| `liveFeed.clock` | ISO 8601, optional |  | PREVIEW ONLY. Overrides `now` for the live feed, used by the market-closed state. Not sent by the API. |
| `liveFeed.clientIdPrefix` | string | `"95"` | DEMO generator: fixed first digits of the masked client id. With a real feed the server sends the masked id. |
| `liveFeed.points.step` | number | `1` | DEMO generator: step between possible amounts. |
| `liveFeed.points.bands[].min` | number | `1` | DEMO generator: lowest amount of a band. |
| `liveFeed.points.bands[].max` | number | `29` | DEMO generator: highest amount of a band. |
| `liveFeed.points.bands[].weight` | number | `70` | DEMO generator: share of entries drawn from this band. |
| `liveFeed.intervalSeconds[]` | number | `[1, 2, 3, 4, 5, 6]` | DEMO generator: possible waits between two entries, in seconds. |
| `tour.firstVisit` | boolean | `false` | PREVIEW ONLY. Forces the guided tour to open as on a first visit. |
| `tour.simulatedBalance` | number | `12890` | Figure the balance counts up to in tour step 3 (a simulation). No effect if the real balance is already higher. |

## Home — `fetchPage('dashboard')`

Example file: `mock/dashboard.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `task.lotsToday` | number | `3.5` | Lots traded today. "You traded" on the Daily Trading card. |
| `task.pointsToday` | number | `2100` | Coins earned today. "Coins earned" on the Daily Trading card. |
| `task.updatedAt` | ISO 8601 | `"2026-10-14T14:35:00+07:00"` | When today's figures were last refreshed (not displayed). |
| `task.capped` | boolean | `false` | true when today's maximum is reached: the capped message shows in the Today panel. |
| `rewards[].image` | string | `"../assets/images/rewards/reward-1.webp"` | Image of a reward tile on Home (three tiles). Path or URL. |
| `rewards[].alt` | string | `"Wireless earbuds and a smartphone"` | Text alternative of that image. |
| `checkIn.enabled` | boolean | `false` | Shows the daily check-in card (future feature, off by default). |
| `checkIn.rewards[]` | number | `[10, 10, 20, 20, 30, 50, 100]` | Coins for each of the seven check-in days, in order. |
| `checkIn.checkedDays` | number | `3` | How many days in a row the user has checked in. |
| `checkIn.checkedToday` | boolean | `false` | Whether today is already checked in (button disabled). |

## Earn — `fetchPage('trading-task')`

Example file: `mock/trading-task.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `today.lots` | number | `3.5` | Lots traded today. |
| `today.points` | number | `2100` | Coins earned today. |
| `today.status` | "pending" | "credited" | `"pending"` | Whether today's coins are still waiting or already in the balance. Picks the status line under the figures. |
| `today.creditAt` | ISO 8601 | `"2026-10-17T01:00:00+07:00"` | When pending coins will be credited. Shown in the pending status line. |
| `today.updatedAt` | ISO 8601 | `"2026-10-14T14:35:00+07:00"` | When today's figures were last refreshed (not displayed). |
| `today.capped` | boolean | `false` | true when today's maximum is reached. |
| `selectedAccountId` | string | `"50000234"` | Trading account currently selected; must match one of common.accounts[].id. |
| `history[].date` | YYYY-MM-DD | `"2026-10-13"` | A past trading day. |
| `history[].lots` | number | `1.4` | Lots traded that day. |
| `history[].points` | number | `850` | Coins earned that day. |
| `history[].status` | "pending" | "credited" | `"pending"` | Badge of that day. In "in-day" mode every past day shows as credited. |
| `history[].capped` | boolean | `false` | true when that day reached the maximum ("Reached Max Coins"). |

## Coins — `fetchPage('point-balance')`

Example file: `mock/point-balance.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `items[].source` | "trading" | `"trading"` | Where the lot came from; its label is copy key pb.source.<source>. |
| `items[].earnedOn` | YYYY-MM-DD | `"2026-10-14"` | Day the coins were earned. |
| `items[].total` | number | `2100` | Coins earned in this lot ("Earned"). |
| `items[].remaining` | number | `2100` | Coins of this lot not yet spent ("Remain"); for an expired lot, the coins that expired unspent. |
| `items[].status` | "earning" | "pending" | "active" | "used" | "expired" | `"earning"` | State of the lot. earning/pending/active/used-before-expiry show in Available; expired and used-then-expired show in Expired. |
| `items[].creditAt` | YYYY-MM-DD or null | `null` | When a pending lot will be credited. Null for other statuses. |
| `items[].expiresAt` | YYYY-MM-DD or null | `"2026-10-28"` | Expiry date of the lot. Null while earning or pending. |
| `history[].date` | YYYY-MM-DD | `"2026-10-14"` | Day of a balance movement. Rows are grouped by day, newest first. |
| `history[].type` | "earning" | "earned" | "redeemed" | "refunded" | "expired" | "adjusted" | `"earning"` | Kind of movement; its label is copy key hist.<type>. |
| `history[].points` | number | `2100` | Signed amount: positive added, negative taken. |
| `history[].source` | "trading" or null | `"trading"` | Source of an earned movement, else null. |
| `pendingItems[]` | same shape as items[] | `[]` | PREVIEW ONLY. Lots added by the has-pending state. With a real API put every lot in items and send [] or omit. |
| `usedItems[]` | same shape as items[] | `[]` | PREVIEW ONLY. Lots added by the has-used state. Same remark. |
| `empty.available` | optional |  | PREVIEW ONLY. Empties the Available tab. |
| `empty.expired` | optional |  | PREVIEW ONLY. Empties the Expired tab. |
| `empty.history` | optional |  | PREVIEW ONLY. Empties the History tab. |
