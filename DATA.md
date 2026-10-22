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
| `guest` | boolean | `false` | true when the app opened the page without a token (not signed in, spec §53). The pages then show their guest version and call only the guest APIs; program.joinRequirement is "signup", balance 0, no accounts. |
| `now` | string | `"2026-10-14T14:35:00+07:00"` | Current server time, ISO 8601 with offset. Drives "today", days until expiry, and "3m ago" in the recent activity card. |
| `activity[].type` | "gift" | "coin" | `"coin"` | Recent activity card on Home and Earn (spec §50), one list per session from the backend. Kind of entry: "gift" (a reward was redeemed) or "coin" (coins were earned). |
| `activity[].client` | string | `"95***356"` | Client of that entry, already masked by the backend, e.g. "95***442". |
| `activity[].reward` | string | `"iPhone 16 Pro"` | Gift entries: the reward's name. |
| `activity[].points` | number | `12` | Coin entries: coins earned. |
| `activity[].at` | string | `"2026-10-14T07:32:00Z"` | When it happened (ISO 8601). The card shows the time since then ("3m ago"). |
| `balance.available` | number | `3100` | Coins the user can spend now. The big number on Home and Coins. |
| `balance.expiring` | null or object | `null` | Coins about to expire, or null. When set, the red warning shows under the balance. |
| `balance.expiring.points` |  |  | How many coins expire within the warning window. |
| `program.ended` | boolean | `false` | true when the programme is over: Earn shows the end message, no trade button; Home hides the "earn coins" card. |
| `program.creditMode` | "delayed" | "in-day" | `"in-day"` | When earned coins are credited: "delayed" (after creditDelayDays) or "in-day" (through the day). |
| `program.dailyMaxPoints` | number or null | `2000` | Most coins a user can earn per day, or null for no maximum. Shown in the rules and next to the rate range; null hides both. |
| `program.minHoldMinutes` | number | `3` | Minimum time a position must be held to earn. Shown in the rules. |
| `program.minHoldSeconds` | number | `180` | The same minimum in seconds. When it is not a whole number of minutes the rule reads "at least 90 seconds"; when it is 0 the rule is not shown. |
| `program.tzMinutes` | number | `420` | Time zone of the programme as minutes from UTC (420 = GMT+7). Sent back to the coin list endpoints; the pages format every date in GMT+7 (WIB). |
| `program.creditDelayDays` | number | `0` | Days between the trading day and crediting, in "delayed" mode. Shown in the rules. |
| `program.expiryDays` | number | `30` | Days after crediting until coins expire. Shown in the rules. |
| `program.creditWithinMinutes` | number | `15` | NOT FROM THE API: fixed in the UI. Longest time for coins to arrive after a position is closed. Shown as "Updates within 15 mins" and in the in-day rule. |
| `program.resetTime` | HH:MM | `"00:00"` | Local time (WIB) at which a new earning day starts. Shown in the rules. |
| `program.expiryWarningDays` | number | `10` | Size of the "expiring soon" window in days: the balance warning text and the red highlight on lots. |
| `program.tradingTask` | boolean | `true` | false when the trading task is off or hidden for this user: Home hides the "earn coins" card of the rewards grid and the bottom bar drops the Earn tab. |
| `program.joinRequirement` | null | "signup" | "kyc" | "deposit" | `null` | Guests (no token): "signup". Otherwise NOT SENT BY THE LOYALTY API: derive it from the app sign-in data (kycApproveTime = 0 -> "kyc"; kycApproveTime > 0 and firstDepositTime = 0 -> "deposit"; else null). When set, the Today card on Earn shows "How to start" instead of today's figures, Earn shows no account picker and no rates table, and every Redeem button (Home, Coins) opens the "How to start" sheet instead of Tada. |
| `program.termsUrl` | URL of a PDF, or null | `"../assets/docs/terms-sample.pdf"` | Address of the Terms & Conditions document. Earn shows a `Terms & Conditions` text button under the How it works rules; it opens this address inside a bottom sheet. The document is a PDF. Null or missing hides the button. The mock points at a sample PDF. |
| `program.rateRange` | object or null |  | Lowest and highest earning rate of the programme, or null when it has no rate yet. Shown as "70–100 coins per lot" to users without a trading account, and its max in tour step 2. Null hides both. |
| `program.rateRange.min` | number | `70` | Lowest coins per lot. |
| `program.rateRange.max` | number | `100` | Highest coins per lot. One figure is shown when min = max. |
| `accounts[].id` | string | `"50000234"` | Trading account number, shown as is. The list is empty for users without a live account. |
| `accounts[].eligible` | boolean | `true` | Whether this account takes part in the programme (false e.g. for an MT5 group that is excluded). |
| `accounts[].group` | string | `"Direct\\VIP1"` | Full MT5 group name of the account, e.g. Direct\VIP1 (tradingTask/get, spec §51). A tier only when it is exactly (any case) Direct\Mini400 = Micro, Direct\Mini10 = Standard, Direct\VIP1 = VIP, Direct\MIVIP = Platinum; others (e.g. 1F\Direct\Mini10) show no tier and no upgrade row. |
| `accounts[].lifetimeDeposit` | number | `2350` | Approved deposits into this account, USD; 0 when none (every account, eligible or not). The tier sheet compares it with the next tier's threshold, fixed in the page: 0, 200, 1,000, 5,000. |
| `selectedAccountId` | string | null | `"50000234"` | The trading account the app currently trades with (tradingTask/get `selectedAccountId`); null for guests. Used only as a tie-break: the pages show the eligible account on the highest tier, and among several on that tier this one (spec §55). |
| `accounts[].rates[].type` | "symbol" | "symbol_group" | "any" | `"symbol_group"` | Kind of rate row. Empty list for an account that is not eligible. |
| `accounts[].rates[].value` | string or null | `"metal"` | Symbol (shown as is), or group: forex, metal, energy, index, stocks, other (label = copy key rate.<value>). For type "any": "other" or null, shown as "Others". |
| `accounts[].rates[].ptsPerLot` | number | `100` | Coins earned per lot for that row. Rows come highest first, the "any" row last, never 0. |
| `tiers[].group` | string | `"Direct\\VIP1"` | One element per MT5 group the programme has rates for (tradingTask/get, spec §51), unsorted; full group name. The page keeps the four tier groups, in tier order. None for guests. |
| `tiers[].rates[].type` | "symbol" | "symbol_group" | "any" | `"symbol_group"` | Rates of this group, made by the same function as an account's rates. Shown in the tier sheet's table. |
| `tiers[].rates[].value` | string or null | `"metal"` | As accounts[].rates[].value. |
| `tiers[].rates[].ptsPerLot` | number | `100` | Coins per lot on this tier for that row. |
| `view` | "loading" | "error", optional |  | PREVIEW ONLY. "loading" or "error" replaces the page content with the loading placeholder or the error message. In the product this comes from the state of the requests, not from data. |
| `tour.firstVisit` | boolean | `false` | PREVIEW ONLY. Forces the guided tour to open as on a first visit. |
| `tour.simulatedBalance` | number | `3410` | Figure the balance counts up to in tour step 3 (a simulation). No effect if the real balance is already higher. |

## Home — `fetchPage('dashboard')`

Example file: `mock/dashboard.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `rewards[].id` | string | `"101"` | HSB's key for the reward card (POST /app/point/catalog, number in the API, text here). Sent as data-reward and as reward_id in loyalty_reward_click. Not a Tada id: it does not open the reward in Tada. |
| `rewards[].name` | string | `"iPhone 16 Pro"` | Reward name as HSB sends it (may include a denomination, e.g. "Rp50.000"), two lines at most. |
| `rewards[].points` | number | `95000` | Price in coins on the card. |
| `rewards[].image` | string | `"../assets/images/rewards/gift-01.webp"` | HTTPS link to the reward image, hosted by HSB: square, transparent background, product centred, at least 460px; shown whole. |
| `rewards[].category` | string or null | `"gadget_electronics"` | Reward Store category (spec §59), from the catalog API: gadget_electronics, tour_travel, shopping_voucher, fnb_voucher or home_living. Any other value, or null: the reward shows only under "All" in the store. |
| `rewards[].description` | string or null | `"256GB, Desert Titanium"` | One line about the reward (point_featured_gift.gift_description), on its store page under "About this reward"; no section when null. |
| `rewards[].badge` | "hot" | "new" | null | `"hot"` | "Hot" or "New" on the reward's picture in the store; `hot` rewards come first in Popular Rewards. |
| `rewards[].showOnHome` | boolean | `true` | True for the rewards Home's grid shows (point_featured_gift.show_on_dashboard). The store shows every reward. |
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
| `selectedAccountId` | string or null | `"50000234"` | The trading account the app currently trades with (tradingTask/get `selectedAccountId`, the same value as common.selectedAccountId); one of common.accounts[].id. Missing or null when the user has no account. Since spec §55 it is only the tie-break and the fallback: Earn opens on the account chosen for the session (shared/tiers.js chosenAccountId). |
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

## Redemption history — `fetchPage('redemptions')` (list) and `fetchOrder(ref)` (one order, shape of `details[]`)

Example file: `mock/redemptions.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `total` | number | `7` | Number of orders the user has (the `total` of POST /app/point/orders). While the list holds fewer, it loads the next page on scroll (page, pageSize 20). |
| `orders[].orderReference` | string | `"ord_a03f77"` | Order id from POST /app/point/orders (spec §52). Opens the order: fetchOrder(orderReference). |
| `orders[].orderNumber` | string | `"TADA26101406220019"` | Order number shown to the user, e.g. TADA26101214305512. |
| `orders[].status` | "new" | "on process" | "completed" | "canceled" | "failed" | `"new"` | Normalised by the backend. Badge: new = Order placed, on process = Processing, completed, canceled = Cancelled, failed. |
| `orders[].orderDate` | string | `"2026-10-14T06:22:00Z"` | When the order was placed (ISO 8601). List is newest first. |
| `orders[].firstItemName` | string | `"Nintendo Switch"` | Name of the order's first reward (POST /app/point/orders `firstItemName`, settled 20 Oct 2026). |
| `orders[].coinSpent` | number | `30000` | Coins taken for the order. |
| `details[].orderReference` | string | `"ord_a03f77"` | MOCK ONLY: the demo's orders for fetchOrder(ref). With the API, one POST /app/point/orders/detail { orderReference } per order, in this shape. |
| `details[].orderNumber` | string | `"TADA26101406220019"` | As in the list. |
| `details[].status` | as orders[].status | `"new"` | Current status (phase 1 has no step-by-step history). |
| `details[].orderDate` | string | `"2026-10-14T06:22:00Z"` | When the order was placed. |
| `details[].lastStatusAt` | string | `"2026-10-14T06:22:00Z"` | When the status last changed: "Updated {date}, {time}". |
| `details[].coinSpent` | number | `30000` | Coins taken for the order. |
| `details[].refunded` | boolean | `false` | true when the coins went back to the balance: a green note. |
| `details[].items[].name` | string | `"Nintendo Switch"` | Reward name. |
| `details[].items[].type` | "egift" | "physical" | "pln" | "pulsa" | … | `"physical"` | Kind: decides the block shown. egift: evoucher; pln / pulsa: token; physical: tracking. Others: label "Reward". |
| `details[].items[].quantity` | number | `1` | Quantity. |
| `details[].items[].status` | string | `"new"` | Item status; shown only when it differs from the order's. |
| `details[].items[].evoucher` | object or null | `null` | E-gift items only; null otherwise. Each item has at most one of evoucher, token, tracking. |
| `details[].items[].token` | object or null | `null` | PLN / mobile credit items only; null otherwise. |
| `details[].items[].tracking` | object or null | `null` | Physical goods only, once shipped; null otherwise. |
| `details[].items[].evoucher.code` | string or null |  | E-voucher code. Arrives in clear; hidden until Show, then copyable. |
| `details[].items[].evoucher.pin` | string or null |  | E-voucher PIN, same handling. |
| `details[].items[].evoucher.link` | string or null |  | Voucher link: "Open voucher" (intent `voucher`, data-url). |
| `details[].items[].evoucher.expiredDate` | ISO 8601 or null |  | "Valid until {date}". |
| `details[].items[].token.serialNumber` |  |  | PLN / mobile credit token. Hidden until Show, then copyable. |
| `details[].items[].token.message` |  |  | Message shown under it. |
| `details[].items[].tracking.awbNumber` |  |  | Physical goods: AWB number (copyable). |
| `details[].items[].tracking.shippingCompany` |  |  | Courier. |
| `details[].items[].tracking.trackingNumber` |  |  | Tracking number. |
| `details[].recipient.name` | string | `"Budi Santoso"` | Physical goods: "Delivery to". |
| `details[].recipient.address` | string | `"Jl. Sudirman No. 21, Kebayoran Baru, Jakar…` | Address. |
| `details[].recipient.postalCode` | string | `"12190"` | Postal code. |

## Reward Store and its reward page — `fetchPage('store')`: the whole catalog (spec §59)

Example file: `mock/store.json` (`default`)

| Field | Type | Example | Meaning |
|---|---|---|---|
| `rewards[].id` | string | `"101"` | As dashboard rewards[].id. reward.html?id= picks one. |
| `rewards[].name` | string | `"iPhone 16 Pro"` | As dashboard rewards[].name. |
| `rewards[].points` | number | `95000` | Price in coins; on a reward's page it is set against the user's balance. |
| `rewards[].image` | string | `"../assets/images/rewards/gift-01.webp"` | As dashboard rewards[].image. Tour & Travel rewards are shown cropped to a wide frame, so their picture should fill the square. |
| `rewards[].category` | string or null | `"gadget_electronics"` | As dashboard rewards[].category: places the reward in the store's sections and category tabs. |
| `rewards[].description` | string or null | `"256GB, Desert Titanium"` | As dashboard rewards[].description. |
| `rewards[].badge` | "hot" | "new" | null | `"hot"` | As dashboard rewards[].badge. |
| `rewards[].showOnHome` | boolean | `true` | As dashboard rewards[].showOnHome (not used by the store). |
