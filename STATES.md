# Preview states

_Generated from `mock/*.json` by `tools/build-states.py`. Do not edit by hand: change the mock file, then run the script._

A state is a named override of the mock data that shows one situation of a page. Turn states on with
`?state=a,b` (they combine) or with the floating **States** button (demo only). Each page reads
`mock/common.json` plus its own `mock/<page>.json`; a state merges its `common` and `page` parts over the
default data (objects merge key by key, arrays and plain values replace).

**Shared states** mean the same thing on every page and carry over through links between pages: `empty`, `market-closed`, `needs-kyc`, `needs-deposit`, `has-pending`, `expiring`.

Other URL parameters (demo aids): `?theme=light|dark`; Trading Task `?tab=history`; Coin Balance
`?tab=available|expired|history`; date filters `?range=30` or `?range=YYYY-MM-DD..YYYY-MM-DD`, `?cal=1` opens the calendar.

## Dashboard (Home tab)

File: `mock/dashboard.json` · page: `pages/dashboard.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Page | `no-task-trading` ("No Task: Trading") | The Trading Task is not shown to this user, because: (1) the Trading Task has been turned off; (2) the Trading Task has been blocked for this user (reason set in config, e.g. blacklist, A-Book); or (3) the Trading Task has been hidden from all users. The Daily Trading card and the Earn tab are hidden. | `common.program.tradingTask = false` |
| Participation | `needs-kyc` · shared | User must pass KYC to take part. Everything shows as usual; the trade button reads “KYC to join”. | `common.program.joinRequirement = "kyc"` |
| Participation | `needs-deposit` · shared | User must make a first deposit to take part. Everything shows as usual; the trade button reads “Deposit to join”. | `common.program.joinRequirement = "deposit"` |
| Coin Balance | `empty` · shared | Balance is 0: no available, pending or expiring coins. | `common.balance.available = 0`<br>`common.balance.pending = 0`<br>`common.balance.expiring = null` |
| Coin Balance | `has-pending` · shared | 850 coins are waiting to be credited: “+850 pending” shows under the balance. May be used when applying the T+1 rule to release coins. | `common.balance.pending = 850` |
| Coin Balance | `expiring` · shared | 1,200 coins expire within 10 days: red warning under the balance. | `common.balance.expiring.points = 1200`<br>`common.balance.expiring.date = "2026-10-20"` |
| Today trading task | `capped` | Today's max coins reached: the countdown is replaced by the capped message. | `page.task.capped = true`<br>`page.task.lotsToday = 14.2`<br>`page.task.pointsToday = 10000` |
| Today trading task | `no-trades-today` | No trades yet today: 0 lots and 0 coins. | `page.task.lotsToday = 0`<br>`page.task.pointsToday = 0` |
| Today trading task | `market-closed` · shared | Weekend (markets closed): the live “Trader … just earned … coins” line is hidden. It runs Sunday 17:00 to Friday 17:00 UTC (Monday to Friday, GMT+7). | `common.liveFeed.clock = "2026-10-17T10:00:00+07:00"` |
| Daily check-in (future) | `check-in` | Shows the daily check-in card (future feature, not launched). | `page.checkIn.enabled = true` |

## Daily Trading (Earn tab)

File: `mock/trading-task.json` · page: `pages/trading-task.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Page | `ended` | The programme has ended: end message on the yellow card, no HOT badge, no trade button. | `common.program.ended = true` |
| Participation | `needs-kyc` · shared | User must pass KYC and has no trading account yet: no account picker, only earning rates and “KYC to join”. | `common.program.joinRequirement = "kyc"` |
| Participation | `needs-deposit` · shared | User must make a first deposit and has no trading account yet: no account picker, only earning rates and “Deposit to join”. | `common.program.joinRequirement = "deposit"` |
| Today trading task | `in-day` | Coins are credited during the day instead of 3 days later; today shows as credited and appears in History as Earning. | `common.program.creditMode = "in-day"`<br>`page.today.status = "credited"` |
| Today trading task | `capped` | Today's max coins reached: capped message on the Today card, plain “Trade now” button. | `page.today.capped = true`<br>`page.today.lots = 14.2`<br>`page.today.points = 10000` |
| Today trading task | `no-trades-today` | No trades yet today: 0 lots and 0 coins, with a hint to make the first trade. | `page.today.lots = 0`<br>`page.today.points = 0` |
| Today trading task | `market-closed` · shared | Weekend (markets closed): the live “Trader … just earned … coins” line is hidden. It runs Sunday 17:00 to Friday 17:00 UTC (Monday to Friday, GMT+7). | `common.liveFeed.clock = "2026-10-17T10:00:00+07:00"` |
| Trading account | `single-account` | User has only one trading account: a fixed field instead of the account picker. | `common.accounts = [{"id": "50000234", "eligible": true}]` |
| Trading account | `ineligible-selected` | The selected trading account belongs to an MT5 group that cannot take part in the programme, for example an A-Book group or any group not listed in the programme config. Shows a warning and “Switch to an eligible account”. | `page.selectedAccountId = "50000871"` |

## Coin Balance (Coins tab)

File: `mock/point-balance.json` · page: `pages/point-balance.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Coin Balance | `empty` · shared | Balance is 0: no available, pending or expiring coins. Tabs still show their lists. | `common.balance.available = 0`<br>`common.balance.pending = 0`<br>`common.balance.expiring = null` |
| Coin Balance | `has-pending` · shared | 850 coins are waiting to be credited: “+850 pending” under the balance and a Pending lot in Available. May be used when applying the T+1 rule to release coins. | `common.balance.pending = 850`<br>`page.pendingItems = [1 items]` |
| Coin Balance | `expiring` · shared | 1,200 coins expire within 10 days: red warning under the balance; that lot is highlighted in Available. | `common.balance.expiring.points = 1200`<br>`common.balance.expiring.date = "2026-10-20"`<br>`page.items = [9 items]` |
| Tabs | `available-empty` | The Available tab has no lots: it shows “No available coins.” | `page.empty.available = true` |
| Tabs | `expired-empty` | The Expired tab has nothing: “No expired coins in this period.” | `page.empty.expired = true` |
| Tabs | `history-empty` | The History tab has nothing: “No activity in this period.” | `page.empty.history = true` |
