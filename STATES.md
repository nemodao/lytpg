# Preview states

_Generated from `mock/*.json` by `tools/build-states.py`. Do not edit by hand: change the mock file, then run the script._

A state is a named override of the mock data that shows one situation of a page. Turn states on with
`?state=a,b` (they combine) or with the floating **States** button (demo only). Each page reads
`mock/common.json` plus its own `mock/<page>.json`; a state merges its `common` and `page` parts over the
default data (objects merge key by key, arrays and plain values replace).

**Shared states** mean the same thing on every page and carry over through links between pages: `guest`, `empty`, `needs-kyc`, `needs-deposit`, `expiring`, `activity-empty`.

Guided tour: `?tour=<step>` resumes a step, `?tour=off` keeps it closed (use it for screenshots).

Other URL parameters (demo aids): `?theme=light|dark`; Trading Task `?tab=history`; Coin Balance
`?tab=available|expired|history`; date filters `?range=30` or `?range=YYYY-MM-DD..YYYY-MM-DD`, `?cal=1` opens the calendar.

## Dashboard (Home tab)

File: `mock/dashboard.json` · page: `pages/dashboard.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Sign-in | `guest` ("Guest (not signed in)") · shared | Not signed in (the app opened the page without a token): balance 0; Redeem, the balance, reward cards and Explore all rewards open the sign-up sheet (“How to start” with “Create your free account” first, Sign up, Log in). Rewards and recent activity still show. | `common.guest = true`<br>`common.balance.available = 0`<br>`common.balance.expiring = null`<br>`common.program.joinRequirement = "signup"`<br>`common.accounts = []` |
| Page | `first-visit` ("First visit (tour)") | Treats this as the first time Home is opened on the device: the guided tour opens by itself. Without it, the tour opens only once per device, or from the help button in the header. | `common.tour.firstVisit = true` |
| Page | `no-task-trading` ("No Task: Trading") | The Trading Task is not shown to this user, because: (1) the Trading Task has been turned off; (2) the Trading Task has been blocked for this user (reason set in config, e.g. blacklist, A-Book); or (3) the Trading Task has been hidden from all users. The “earn coins” card in the rewards grid and the Earn tab are hidden. | `common.program.tradingTask = false` |
| Page | `ended` | The programme is over: the “earn coins” card in the rewards grid is hidden; the grid shows rewards only. | `common.program.ended = true` |
| Page | `loading` | The page is waiting for its data: the header and grey placeholder cards. | `common.view = "loading"` |
| Page | `error` | The data could not be loaded: a message and “Try again”. | `common.view = "error"` |
| Participation | `needs-kyc` · shared | User has not passed KYC yet. Redeem (balance and reward cards) opens a sheet with “How to start” (step 1 is the one to do, button “Verify my account”) instead of going to Tada. | `common.program.joinRequirement = "kyc"` |
| Participation | `needs-deposit` · shared | User passed KYC but has not made a first deposit. Redeem (balance and reward cards) opens a sheet with “How to start” (step 1 checked, step 2 is the one to do, button “Deposit now”) instead of going to Tada. | `common.program.joinRequirement = "deposit"` |
| Coin Balance | `empty` · shared | Balance is 0: no available, pending or expiring coins. | `common.balance.available = 0`<br>`common.balance.expiring = null` |
| Coin Balance | `expiring` · shared | 1,200 coins expire within 10 days: red warning under the balance. | `common.balance.expiring.points = 1200` |
| Activity | `activity-empty` · shared | The backend sent no recent activity: the “Trader … just redeemed / earned” card is hidden (Home and Earn). | `common.activity = []` |
| Rewards grid | `rewards-empty` ("No rewards") | The rewards API sent nothing, or failed (it is a different backend): the “Redeem coins for rewards” title and the grid (with its “Earn more coins” card) are left out; the rest of Home stays, including “Looking for something else?”. | `page.rewards = []` |
| Rewards grid | `big-prices` ("Big prices") | Some rewards cost a lot of coins (99,999 to 12,500,000). When one price and its Redeem do not fit on one row (about 6 digits and up), Redeem moves under the price, at the right, on every card of the grid; the number is never cut. | `page.rewards = [9 items]` |
| Daily check-in (future) | `check-in` | Shows the daily check-in card (future feature, not launched). | `page.checkIn.enabled = true` |

## Daily Trading (Earn tab)

File: `mock/trading-task.json` · page: `pages/trading-task.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Sign-in | `guest` ("Guest (not signed in)") · shared | Not signed in: “How to start” with four steps (Create your free account first), the rate line, “Coins per lot depend on your trading account type.” and Sign up / Log in in place of today's figures; then the rules and Terms; no account, no History tab, no trade button. | `common.guest = true`<br>`common.balance.available = 0`<br>`common.balance.expiring = null`<br>`common.program.joinRequirement = "signup"`<br>`common.accounts = []` |
| Page | `ended` | The programme is over: under the cup only “This program has ended”. No figures, no account, no rules or history, nothing to tap. | `common.program.ended = true`<br>`page.history = [9 items]`<br>`page.today.lots = 0`<br>`page.today.points = 0`<br>`page.today.status = "not_started"` |
| Page | `loading` | The page is waiting for its data: the header and grey placeholder cards. | `common.view = "loading"` |
| Page | `error` | The data could not be loaded: a message and “Try again”. | `common.view = "error"` |
| Participation | `needs-kyc` · shared | User has not passed KYC and has no trading account yet. The Today card shows “How to start” (step 1 is the one to do) with the rate range and “Verify my account”. No account picker and no rates table. | `common.program.joinRequirement = "kyc"` |
| Participation | `needs-deposit` · shared | User passed KYC but has not made a first deposit and has no trading account yet. The Today card shows “How to start” (step 1 checked, step 2 is the one to do) with the rate range and “Deposit now”. No account picker and no rates table. | `common.program.joinRequirement = "deposit"` |
| Today trading task | `first-trade` | The user has just closed the first trade of the day and its coins have not arrived yet: 0 lots and 0 coins, with “Coins are being credited to your balance”. Lasts up to 15 minutes. | `page.today.lots = 0`<br>`page.today.points = 0`<br>`page.today.status = "earning"`<br>`page.history = [9 items]` |
| Today trading task | `credited` | All of today's coins are in the balance: the Today card reads “Credited to your balance” instead of the earning line. | `page.today.status = "credited"`<br>`page.history = [10 items]` |
| Today trading task | `delayed` | Programme that credits coins some days after the trading day (not used at launch; not tuned yet). The rule reads “credited 1 day after the trading day”. The Today card shows 0 lots and 0 coins all day even after trading, with no line under the figures (not even “after your first trade”), and today has no row in History until its coins arrive. | `common.program.creditMode = "delayed"`<br>`common.program.creditDelayDays = 1`<br>`page.today.status = "pending"`<br>`page.today.points = 0`<br>`page.today.lots = 0`<br>`page.history = [10 items]` |
| Today trading task | `capped` | Today's max coins reached: capped message on the Today card, plain “Trade now” button. | `page.today.capped = true`<br>`page.today.lots = 23.8`<br>`page.today.points = 2000`<br>`page.today.status = "credited"`<br>`page.history = [10 items]` |
| Today trading task | `no-trades-today` | No trades yet today: 0 lots and 0 coins, with a hint to make the first trade. | `page.today.lots = 0`<br>`page.today.points = 0`<br>`page.today.status = "not_started"`<br>`page.history = [9 items]` |
| Activity | `activity-empty` · shared | The backend sent no recent activity: the “Trader … just redeemed / earned” card is hidden (Home and Earn). | `common.activity = []` |
| Trading account | `single-account` | User has only one trading account: a fixed field instead of the account picker. | `common.accounts = [1 items]` |
| Trading account | `ineligible-selected` | The selected trading account belongs to an MT5 group that cannot take part in the programme, for example an A-Book group or any group not listed in the programme config. Shows a warning and “Switch to an eligible account”. | `page.selectedAccountId = "50000871"`<br>`page.previewAccountId = "50000871"` |
| Trading account | `no-account` | User passed KYC and made a first deposit but has no live trading account (only demo accounts, or the live account was removed). Instead of the account picker and rates: a short message, the rate range and “Open a trading account”. | `common.accounts = []`<br>`page.selectedAccountId = null`<br>`page.today.lots = 0`<br>`page.today.points = 0`<br>`page.today.status = "not_started"`<br>`page.history = [9 items]` |
| Account tier | `tier-micro` ("Tier: Micro") | Selected account is Micro (MT5 group Direct\Mini400), $50 deposited: the upgrade row offers Standard; the sheet asks for $150 more. | `common.accounts = [4 items]`<br>`page.previewAccountId = "50000234"` |
| Account tier | `tier-standard` ("Tier: Standard") | Selected account is Standard (Direct\Mini10), $450 deposited: the upgrade row offers VIP; the sheet asks for $550 more. | `common.accounts = [4 items]`<br>`page.previewAccountId = "50000234"` |
| Account tier | `tier-top` ("Tier: Platinum (top)") | Selected account is Platinum (Direct\MIVIP), the top tier: a quiet row (crown, no border, grey) reads “Platinum: our highest rates”; the sheet says the account is on the top tier and offers to trade. | `page.selectedAccountId = "50000519"`<br>`page.previewAccountId = "50000519"` |
| Account tier | `tier-reached` ("Tier: deposit reached") | Selected account is still VIP (Direct\VIP1) but has $5,200 deposited, past Platinum's $5,000 (the dealing team changes groups by hand): the sheet says the upgrade is on its way instead of asking for more. | `common.accounts = [4 items]`<br>`page.previewAccountId = "50000234"` |
| Account tier | `tier-unknown` ("Tier: unknown group") | Selected account's MT5 group is not one of the four tiers (1F\Direct\Mini10, matched exactly): no tier label and no upgrade row. | `common.accounts = [4 items]`<br>`page.previewAccountId = "50000234"` |

## Coin Balance (Coins tab)

File: `mock/point-balance.json` · page: `pages/point-balance.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Sign-in | `guest` ("Guest (not signed in)") · shared | Not signed in: balance 0 and a card inviting the user to sign up or log in, in place of the tabs. Redeem and Redemption history open the sign-up sheet. | `common.guest = true`<br>`common.balance.available = 0`<br>`common.balance.expiring = null`<br>`common.program.joinRequirement = "signup"`<br>`common.accounts = []` |
| Page | `loading` | The page is waiting for its data: the header and grey placeholder cards. | `common.view = "loading"` |
| Page | `error` | The data could not be loaded: a message and “Try again”. | `common.view = "error"` |
| Participation | `needs-kyc` · shared | User has not passed KYC yet. Redeem opens a sheet with “How to start” (button “Verify my account”) instead of going to Tada. | `common.program.joinRequirement = "kyc"` |
| Participation | `needs-deposit` · shared | User passed KYC but has not made a first deposit. Redeem opens a sheet with “How to start” (button “Deposit now”) instead of going to Tada. | `common.program.joinRequirement = "deposit"` |
| Coin Balance | `empty` · shared | Balance is 0: no available, pending or expiring coins. Tabs still show their lists. | `common.balance.available = 0`<br>`common.balance.expiring = null` |
| Coin Balance | `expiring` · shared | 1,200 coins expire within 10 days: red warning under the balance; that lot is highlighted in Available. | `common.balance.expiring.points = 1200`<br>`page.items = [8 items]` |
| Tabs | `available-empty` | The Available tab has no lots: it shows “No available coins.” | `page.empty.available = true` |
| Tabs | `expired-empty` | The Expired tab has nothing: “No expired coins in this period.” | `page.empty.expired = true` |
| Tabs | `history-empty` | The History tab has nothing: “No activity in this period.” | `page.empty.history = true` |
| Tabs | `has-used` | Adds fully used lots: two still before expiry, shown muted in a “Fully used” section at the end of Available (Remain 0), and one used up and then expired, shown in Expired with “Expired 0” (inside Last 7 days). | `page.usedItems = [3 items]` |
| Tabs | `more-error` | The next page of a long list failed to load: “Couldn’t load more. Try again” at the end of the list (open the History tab with Last 30 days). | `page.loadMoreError = true` |

## Redemption history (from Coins)

File: `mock/redemptions.json` · page: `pages/redemptions.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Page | `orders-empty` | The user has not redeemed anything yet: “No redemptions yet” and a button to the rewards store. | `page.orders = []` |
| Page | `orders-more` | The backend says there are more orders than the first page (total 30): a spinner row at the end of the list loads the next page as the user scrolls. In this demo the next page is empty, so the row then goes away. | `page.total = 30` |
| Page | `loading` | The page is waiting for its data: the header and grey placeholder cards. | `common.view = "loading"` |
| Page | `error` | The data could not be loaded: a message and “Try again”. | `common.view = "error"` |

## Reward Store and its reward page (from Redeem)

File: `mock/store.json` · page: `pages/store.html`

| Group | State | What it shows | Data it changes |
|---|---|---|---|
| Sign-in | `guest` ("Guest (not signed in)") · shared | Not signed in: the store and its rewards show as usual, balance 0; a reward's page has no balance line, and its Checkout sheet adds Sign up. | `common.guest = true`<br>`common.balance.available = 0`<br>`common.balance.expiring = null`<br>`common.program.joinRequirement = "signup"`<br>`common.accounts = []` |
| Coin Balance | `empty` · shared | Balance is 0: the top bar shows 0; on a reward's page the user needs the full price. | `common.balance.available = 0`<br>`common.balance.expiring = null` |
| Catalog | `catalog-empty` | The catalog API sent nothing, or failed: no banner sections; a short message that rewards are on their way, on both tabs. | `page.rewards = []` |
| Catalog | `no-travel` | No reward in Tour & Travel: that section of Home Store is hidden; the Rewards tab's Tour & Travel chip shows only the “more coming soon” card. | `page.rewards = [41 items]` |
| Catalog | `few-rewards` | Only 6 rewards in the catalog: Home Store fills F&B and Travel first, then Popular gets what is left. | `page.rewards = [6 items]` |
| Background (review) | `bg-deep` ("Deep blue background") | PREVIEW ONLY, for review: solid deep brand blue behind the header, the banner and Popular Rewards' heading (white title and See all), fading to a light tint behind Popular's cards. Default: the lighter blue wash. | `page.look = "deep"` |
