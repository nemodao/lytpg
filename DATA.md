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
| `balance.available` | number | `3100` | Coins the user can spend now. The big number on Home and Coins. |
| `balance.expiring` | null or object | `null` | Coins about to expire, or null. When set, the red warning shows under the balance. |
| `balance.expiring.points` |  |  | How many coins expire within the warning window. |
| `program.ended` | boolean | `false` | true when the programme is over: Earn shows the end message, no trade button. |
| `program.creditMode` | "delayed" | "in-day" | `"in-day"` | When earned coins are credited: "delayed" (after creditDelayDays) or "in-day" (through the day). |
| `program.dailyMaxPoints` | number or null | `2000` | Most coins a user can earn per day, or null for no maximum. Shown in the rules and next to the rate range; null hides both. |
| `program.minHoldMinutes` | number | `3` | Minimum time a position must be held to earn. Shown in the rules. |
| `program.minHoldSeconds` | number | `180` | The same minimum in seconds. When it is not a whole number of minutes the rule reads "at least 90 seconds". |
| `program.tzMinutes` | number | `420` | Time zone of the programme as minutes from UTC (420 = GMT+7). Sent back to the coin list endpoints; the pages format every date in GMT+7 (WIB). |
| `program.creditDelayDays` | number | `0` | Days between the trading day and crediting, in "delayed" mode. Shown in the rules. |
| `program.expiryDays` | number | `30` | Days after crediting until coins expire. Shown in the rules. |
| `program.creditWithinMinutes` | number | `15` | NOT FROM THE API: fixed in the UI. Longest time for coins to arrive after a position is closed. Shown as "Updates within 15 mins" and in the in-day rule. |
| `program.resetTime` | HH:MM | `"00:00"` | Local time (WIB) at which a new earning day starts. Shown in the rules. |
| `program.expiryWarningDays` | number | `10` | Size of the "expiring soon" window in days: the balance warning text and the red highlight on lots. |
| `program.tradingTask` | boolean | `true` | false when the trading task is off or hidden for this user: Home hides the Daily Trading card and the bottom bar drops the Earn tab. |
| `program.joinRequirement` | null | "kyc" | "deposit" | `null` | NOT SENT BY THE LOYALTY API: derive it from the app sign-in data (kycApproveTime = 0 -> "kyc"; kycApproveTime > 0 and firstDepositTime = 0 -> "deposit"; else null). When set, the Today card on Home and Earn shows "How to start" instead of today's figures, and Earn shows no account picker and no rates table. |
| `program.termsUrl` | URL of a PDF, or null | `"../assets/docs/terms-sample.pdf"` | Address of the Terms & Conditions document. Earn shows a `Terms & Conditions` text button under the How it works rules; it opens this address inside a bottom sheet. The document is a PDF. Null or missing hides the button. The mock points at a sample PDF. |
| `program.rateRange` | object or null |  | Lowest and highest earning rate of the programme, or null when it has no rate yet. Shown as "70–100 coins per lot" to users without a trading account, and its max in tour step 2. Null hides both. |
| `program.rateRange.min` | number | `70` | Lowest coins per lot. |
| `program.rateRange.max` | number | `100` | Highest coins per lot. One figure is shown when min = max. |
| `accounts[].id` | string | `"50000234"` | Trading account number, shown as is. The list is empty for users without a live account. |
| `accounts[].eligible` | boolean | `true` | Whether this account takes part in the programme (false e.g. for an MT5 group that is excluded). |
| `accounts[].rates[].type` | "symbol" | "symbol_group" | "any" | `"symbol_group"` | Kind of rate row. Empty list for an account that is not eligible. |
| `accounts[].rates[].value` | string or null | `"metal"` | Symbol (shown as is), or group: forex, metal, energy, index, stocks, other (label = copy key rate.<value>). For type "any": "other" or null, shown as "Others". |
| `accounts[].rates[].ptsPerLot` | number | `100` | Coins earned per lot for that row. Rows come highest first, the "any" row last, never 0. |
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
| `view` | "loading" | "error", optional |  | PREVIEW ONLY. "loading" or "error" replaces the page content with the loading placeholder or the error message. In the product this comes from the state of the requests, not from data. |
| `tour.firstVisit` | boolean | `false` | PREVIEW ONLY. Forces the guided tour to open as on a first visit. |
| `tour.simulatedBalance` | number | `3410` | Figure the balance counts up to in tour step 3 (a simulation). No effect if the real balance is already higher. |

## Home — `fetchPage('dashboard')`

Example file: `mock/dashboard.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `task.lotsToday` | number | `3.5` | Lots traded today. "You traded" on the Daily Trading card. |
| `task.pointsToday` | number | `310` | Coins earned today. "Coins earned" on the Daily Trading card. |
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
| `today.lots` | number | `3.5` | Lots already counted for coins today (the API's today.lotsValid). It rises together with today.points, when the coins of a closed position arrive. |
| `today.points` | number | `310` | Coins earned today. |
| `today.status` | "not_started" | "earning" | "credited" | "pending" | `"earning"` | Where today's coins stand. Picks the line under the figures: earning = coins are arriving (shown even while lots and coins still read 0), credited = all in the balance, not_started = no trade yet, pending (delayed programmes) = no line. |
| `today.capped` | boolean | `false` | true when today's maximum is reached. |
| `selectedAccountId` | string or null | `"50000234"` | Trading account selected when the page opens; one of common.accounts[].id. Missing or null when the user has no account. |
| `history[].date` | YYYY-MM-DD | `"2026-10-14"` | A trading day, newest first. Today is included once it has coins arriving and is labelled "Today". |
| `history[].lots` | number | `3.5` | Lots traded that day. |
| `history[].points` | number | `310` | Coins earned that day. |
| `history[].status` | "earning" | "credited" | "pending" | `"earning"` | Badge of that day. Days with status "pending" are not listed. |
| `history[].capped` | boolean | `false` | true when that day reached the maximum ("Reached Max Coins"). |

## Coins — `fetchPage('point-balance')`

Example file: `mock/point-balance.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `items[].source` | "trading" | "daily_checkin" | "adjust" | `"trading"` | Where the lot came from; its label is copy key pb.source.<source>. |
| `items[].earnedOn` | YYYY-MM-DD | `"2026-10-14"` | Day the coins reached the balance (not the trading day). |
| `items[].total` | number | `310` | Coins earned in this lot ("Earned"). |
| `items[].remaining` | number | `310` | Coins of this lot not yet spent ("Remain"); for an expired lot, the coins that expired unspent. |
| `items[].status` | "earning" | "active" | "used" | "expired" | `"earning"` | State of the lot. earning/active/used-before-expiry show in Available; expired and used-then-expired show in Expired. |
| `items[].expiresAt` | date or ISO 8601, or null | `"2026-10-28"` | Expiry of the lot; only its day is shown. May be null while earning. |
| `items[].list` | "available" | "expired" | `"available"` | Tab the lot belongs to. |
| `items[].expiringSoon` | boolean | `false` | true when the lot still has coins and expires within 10 days: its expiry line turns red. |
| `history[].happenedAt` | ISO 8601 | `"2026-10-14T14:12:00+07:00"` | When the movement happened. Its time is shown after the label; rows are ordered by it, newest first. |
| `history[].date` | YYYY-MM-DD | `"2026-10-14"` | Local day of happenedAt. Rows are grouped under it. |
| `history[].type` | "earn" | "consume" | "refund" | "expire" | "adjust_positive" | "adjust_negative" | `"earn"` | Kind of movement. earn shows the source as its label; consume = "Redeemed reward"; refund = "Refund"; expire = "Expired"; adjust_* = "Adjustment". |
| `history[].source` | "trading" | "daily_checkin" | "adjust" | "redeem" | `"trading"` | Where the coins came from or went to; label of an earn row (copy key pb.source.<source>). |
| `history[].points` | number | `80` | Signed amount: positive added, negative taken. One row per credit: several earn rows a day are normal and are not merged. |
| `usedItems[]` | same shape as items[] | `[]` | PREVIEW ONLY. Lots added by the has-used state. Same remark. |
| `loadMoreError` | optional |  | PREVIEW ONLY. Shows the failed-to-load row at the end of a long list. |
| `empty.available` | optional |  | PREVIEW ONLY. Empties the Available tab. |
| `empty.expired` | optional |  | PREVIEW ONLY. Empties the Expired tab. |
| `empty.history` | optional |  | PREVIEW ONLY. Empties the History tab. |
