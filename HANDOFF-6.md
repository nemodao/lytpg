# Handoff 6 — what changed since handoff 4

**Who this is for:** developers (and their AI assistants) who have already applied handoff 4. Everything not named here
is unchanged. Behaviour: `spec.md` §49–§58. Exact line changes: `CHANGES-since-handoff-4.diff` in the package.

**Handoff 5 is replaced by this one.** Its package was sent but not converted; this handoff holds all of it plus the
later changes, each written once in its final form. Do not apply the handoff 5 package; read this file only.
(`HANDOFF-5.md` stays in the repository for the record.)

Phase 3 was asked for by business users: Home sells rewards instead of trading, Earn pushes users to a higher account
tier, a new page lets users follow their reward orders, and the pages work before sign-in.

---

## 1. Home: rewards grid instead of the Daily Trading card (spec §49)

**Removed from Home:** the whole Daily Trading card (today's figures, the live "Trader … just earned" line, `Trade now`,
`Details`, the capped message, "How to start", "This program has ended"), the dashed line under the balance, and the
three image tiles. Earn keeps all of the trading content.

**Added:**

- **Rewards grid** (`rewardsGrid`, `rewardCard`, `earnCard` in `pages/dashboard.js`): up to 10 cells, 2 per row, under
  "Redeem coins for rewards".
  - Reward card: square image on a soft purple backdrop (shown whole, centred), name (2 lines at most), price in coins
    and a small `Redeem` on one row at the bottom. The whole card is one button: intent `reward` with the reward's id in
    `data-reward`.
  - When one price is too long to share its row with `Redeem` (about 6 digits on a 375px screen), **every** card puts
    `Redeem` under its price, at the right, so the grid keeps one layout (`fitPrices`, measured after render, after the
    font loads and on width change). The number is never cut.
  - 3rd cell: the yellow "Earn more coins" card (`coin-cup.webp`, green plus signs that twinkle, `Start earning` →
    Earn). Its line reads "Trade and get up to {max} coins per lot" from `program.rateRange.max`
    (`rewards.earn.bodyNoRate` without it). It takes the height of the card next to it; its image scales into the space
    left. Hidden without a trading task or once the programme has ended; the grid then shows rewards only. With fewer
    than 2 rewards it moves up to the next free cell.
- **"Looking for something else?" card** under the grid: blue gift box, a line that names the user's balance (a plain
  line, `rewards.more.bodyNoCoins`, when it is 0, so always for guests), and a small `Explore all rewards` button
  (intent `redeem`).
- **Recent activity card** between the balance and the grid: see §3.
- **Tier label** next to "Coin Balance": see §5.

**API (settled 20 Oct 2026):** `GET /loyalty/catalog?clientId=…` (app token) or, for guests,
`GET /loyalty/catalog-guest` (app key); `result.rewards[] = { id, name, points, image }`, in display order: the grid
shows the first 9, or the first 10 when the "Earn more coins" card is hidden (`GRID_CELLS` = 10). `toRewards` in `shared/api-adapter.js`, `rewardsList` in `shared/data-source.js`; samples
`mock/api/loyalty-catalog.json`, `loyalty-catalog-guest.json`. `id` is HSB's key, **not** a Tada link: for now the
`reward` intent opens the Tada catalog like `redeem`. When the catalog fails or is empty, Home still opens: no title, no
grid, and the last card reads "Find rewards for your coins" (preview state `rewards-empty`). Show `name` as sent, even
with a denomination such as "Rp50.000" (HSB owns the wording; don't trim it).

**Opening Tada:** unchanged for the webview, which only sends the `redeem` / `reward` intent. The **app** calls
`POST /loyalty/redeem/session` (app token, no body) and opens `result.url` (Tada SSO link, valid about 300 s) in its
in-app webview. See `HANDOFF.md` §6.

## 2. Every Redeem asks for KYC and a first deposit first (spec §49)

Users who still need KYC or a first deposit no longer go to Tada from any Redeem (balance block on Home and Coins,
reward cards, `Explore all rewards`, and `Explore rewards` on the empty Redemption history). They get a bottom sheet: "Start earning to redeem", one line, then the same
"How to start" panel as on Earn (steps, rate line, button with the tapping finger).

- `shared/components.js`: `redeemAttrs(common, intent, from)` gives either the Tada intent or
  `data-action="join-sheet"`; `mountJoinSheet(ui, common, app)`, called once per page, opens the sheet on each tap of
  such a button (it does nothing for users who can redeem).
- `joinPanel(ui, common, { source, from })`: `source` is `card` on Earn and `redeem` in the sheet; in the sheet `from`
  names the button that opened it. Every button in the panel carries both (see §10).
- The sheet opens after the tap is tracked, so `loyalty_redeem_click` / `loyalty_reward_click` come before the view.

## 3. Recent activity card on Home and Earn (spec §50, §58)

One small card, the same on both pages: on Home between the balance and the rewards grid, on Earn right under the
Today card (not shown once the programme has ended). [icon] "Trader 95***442 just redeemed iPhone 16 Pro" [3d ago] /
[coin] "Trader 95***356 just earned 12 coins" [3m ago]. A new entry every 4 s. While a reward entry shows, the card
turns light purple.

- **Data:** a list from the backend, asked for **once per session** and kept in `sessionStorage` (`sessionCached` in
  `shared/data-source.js`). Shape in `DATA.md`: `common.activity[]` = `type` (`gift` | `coin`), `client` (masked by the
  backend), `reward` or `points`, `at`.
- **API (settled 20 Oct 2026):** `GET /loyalty/activity`, from HSB (the Tada integration): **no Authorization, no
  `clientId`**, only `x-auth-key`, the same call for guests and signed-in users. `{ success, result: { activity } }`;
  gift entries `{ type, client, reward, at }`, coin entries `{ type, client, points, at }`, `at` ISO 8601 UTC. The
  backend sends at most N of each kind, newest first (its config; 700 coin and 300 gift entries for now): coin entries
  are trading coins only, gift entries are one per redemption (first item's name) that still holds its coins. Adapter
  `toActivity` (`shared/api-adapter.js`; it drops entries of another type or missing `client`, `at`, `reward` or a
  positive `points`), sample `mock/api/loyalty-activity.json`. **No data, no card:** the call
  starts with the page's other calls and the page waits for it **at most 3 s** (`ACTIVITY_WAIT_MS` in
  `shared/data-source.js`). Failed, empty or not answered in time: the card is hidden, the rest of the page shows as
  usual. A late answer is still kept for the session (the next page shows the card); a failure is not kept (the next
  page asks again).
- **Order:** newest first within each kind; the kinds take turns in rounds of 1:1, 2:1, 3:1 and 3:2 (coin entries :
  rewards, rewards first), played in a shuffled order, then shuffled again. Each kind loops on its own.
- **Linked:** Home and Earn share the list and the place in the loop for the session (`sessionStorage`), so switching
  tabs goes on with the next entry. A re-render does not move it on (Earn re-renders on every tap). Storage keys:
  `hsb-loyalty-activity-api-v1` (the API list; `hsb-loyalty-activity-v3` for the mock) and
  `hsb-loyalty-activity-place-v2` (the place in the loop, `shared/activity-feed.js`).
- Time is worked out on screen from `at`: "Now", "3m ago", "2h ago", "3d ago".
- **Height:** the row always keeps the height of two lines of text (`.activity__row`, `min-height: 2lh` with the
  text's font), so the card never jumps; a one-line message sits in the middle, like the icon and the time.
- **Removed:** the live "Trader … just earned" line inside Earn's Today card, its generator `shared/live-feed.js`, the
  `common.liveFeed` settings and the preview state `market-closed`. New module: `shared/activity-feed.js`.

## 4. Earn: account tiers and the way up (spec §51, §55)

- **Tiers** live in the new `shared/tiers.js`, used by Earn, Home, Coins and the events. It exports `TIERS`,
  `sameGroup`, `tierIndex`, `highestTier`, `defaultAccountId`, `chosenAccountId(accounts, currentId, previewId)` and
  `rememberAccount`. The API sends the
  full MT5 group name; a tier only when it matches exactly (any case): `Direct\Mini400` Micro, `Direct\Mini10`
  Standard, `Direct\VIP1` VIP, `Direct\MIVIP` Platinum, with the order and the deposit thresholds 0 / 200 / 1,000 /
  5,000 USD fixed by product. Any other group, e.g. `1F\Direct\Mini10`: no label, no upgrade row.
- **Tier label** right after the account number (eligible accounts only), in the account field and the account sheet.
  One style for the four tiers, a tinted pill: grey Micro, blue Standard, purple VIP, gold Platinum. Colours are
  tokens, one opaque pair per tier and mode: `--ui-tier-micro-surface` / `--ui-tier-micro-text`, and the same for
  `standard`, `vip`, `platinum` (`.tier--*` in `shared/components.css`).
- **Which account Earn opens on:** no longer simply the app's account. The account is chosen once for the session
  (`chosenAccountId` in `shared/tiers.js`, sessionStorage key `hsb-loyalty-account-v1`): the one the user picked on
  Earn (`rememberAccount` on `select-account`), else the eligible account on the highest tier (several on that tier:
  the app's own account, `selectedAccountId`, if it is one of them, else the first in the API's order), else the app's
  account. Earn reads it as `page.selectedAccountId`, Home and Coins as `common.selectedAccountId`; both come from the
  same `tradingTask/get` field. Home and Coins show the same account's tier (§5).
- **Picking an account on Earn** only changes what the three pages show for the session. The app is not told; it
  switches account when the user taps the trade button (`trade-account` with `data-account`, as before). This replaces
  the `selectedAccountId` row of `HANDOFF.md` §5 ("tell the app which account to trade with").
- **Upgrade row** right under the account field: money bag, "Want more coins per lot?" / "Upgrade to {next} and earn up
  to {n} coins per lot". On Platinum it is quiet (crown, no border, grey): "{Platinum}: our highest rates". It opens the
  tier sheet.
- **Rates heading** now reads "Earning rates of {account}".
- **Tier sheet:** the account number; the four tiers as steps (only the account's tier ticked); below Platinum the
  lifetime deposit against the next threshold with a bar and "Deposit $X more to reach {next}"; a table of coins per
  lot on **every** tier, the account's column highlighted with a "Now" pill. When the table is too wide, the first
  column stays and the tier columns scroll sideways; the sheet opens with the "Now" column as near the middle as it
  goes. `Deposit now` (or, on Platinum, `Trade with account …`) stays visible at the sheet's bottom. Other cases:
  deposits already reach the next threshold but the group has not changed yet: "Your deposits already reach {tier}.
  Your account moves up soon." (`upgrade.reached`, state `tier-reached`); `lifetimeDeposit` null: no progress block;
  Platinum: title "You're on the top tier" and `upgrade.topBody`. Every case ends with the note `upgrade.note`.
- **`Deposit now` carries the amount:** intent `deposit` with `data-account` and `data-amount` (USD still needed,
  rounded up; absent when nothing is missing or the lifetime deposit is unknown), so the app's Deposit screen opens on that account with the amount filled
  in. **The parameter names on the app side are to be agreed with the app team.**
- A symbol row (e.g. XAUUSD) on a tier that does not list it shows "—": the page cannot tell which group a symbol is in.
- **`?focus=account`** (used by the tier label on Home and Coins) scrolls to the account card (`data-account-card`)
  after render, stopping below the sticky header (`scroll-margin-top` in `pages/trading-task.css`).
- **API (settled 20 Oct 2026, on UAT when the backend says so):** `tradingTask/get` adds `accounts[].group` (full
  name), `accounts[].lifetimeDeposit` (USD, 0 when none) and `tiers[]` = `{ group, rates }`, unsorted, no thresholds
  (`toAccounts(task)`, `toTiers(task)` in `shared/api-adapter.js`; sample `mock/api/tradingTask-get.json`). No separate
  tiers endpoint. A tier the API sends no rates for is left out of the table; the upgrade row then reads "Upgrade to
  {tier} to earn more coins per lot". `selectedAccountId` (the account the app trades with) is read into
  `common.selectedAccountId` (null for guests).

## 5. Tier label next to "Coin Balance" on Home and Coins (spec §55)

- **What:** the tier of the session's account (§4) as the same pill as on Earn, in the balance block
  (`balanceTier` in `balanceBlock`, `shared/components.js`). It links to `trading-task.html?focus=account`. Shown only
  when Earn would show a tier for that account: trading task on, programme running, no KYC or first deposit pending
  (Earn then shows no account), account eligible and on one of the four tiers; never for guests. New copy key `balance.tierLink` (its label for screen readers).
- **Home:** on the "Coin Balance" line. When the room left there is narrower than the pill, the whole pill (text,
  padding, shape) shrinks by the same ratio, down to 75% (`fitBalanceTier` sets `--tier-fit`, read by CSS `zoom`;
  `TIER_MIN_FIT`); narrower still, it wraps under the label. A `ResizeObserver` measures again on rotation and once the
  web font has loaded.
- **Coins** (`balanceBlock(…, { card: true })`): the pill hangs on the balance card's top edge, middle on the border,
  on the left above the coin (`.balance-tier--edge`). Opaque, so the border does not show through.
- **Event:** `loyalty_tier_badge_click` with `tier`; `page` tells Home from Coins.

## 6. New page: Redemption history (spec §52)

- **Way in:** Coins, a small `Redemption history ›` link under `Redeem` (`balanceBlock(…, { history })`).
- **Page:** `pages/redemptions.html` / `.js` / `.css`. No bottom bar; the header has a back button
  (`appHeader(ui, { back })`): list → Coins, order → list. **The app's Back must do the same on this page.**
- **List:** reward name, order date, order number, status badge, coins; newest first; 20 per page, the next page on
  scroll until `total`. Empty: "No redemptions yet" + `Explore rewards`.
- **Order** (`?order=<orderReference>`): status badge + "Updated {date}, {time}" (no step-by-step timeline: no data),
  order number (copy), order date, coins spent, a green note when refunded; each item by kind: e-voucher code and PIN
  hidden until `Show`, then `Copy`, `Open voucher` (new intent `voucher` with `data-url`, like `terms`), "Valid until";
  PLN / mobile credit serial number the same way; physical goods courier, AWB (copy), tracking number, and the
  recipient. Several items: the title reads "{n} items". An item's own status badge shows only when it differs from the
  order's. A physical item that is `new` or `on process` with no tracking yet shows `orders.noTracking`. `Copy` reads
  "Copied" for 1.5 s.
- **Statuses** (`ORDER_STATUSES` in `shared/api-adapter.js`, which also turns `onprocess` into `on process`): `new`
  "Order placed" blue, `on process` "Processing" yellow, `completed` green, `canceled` "Cancelled" grey, `failed` red
  (new `.badge--red`). Any other value shows as a grey badge with its raw text.
- **No IDR anywhere:** the backend strips every money value; the page shows coins only.
- **API (settled with the backend 20 Oct 2026):** `GET /loyalty/orders?clientId=…&page=…&pageSize=…` →
  `result = { orders: [...], page, pageSize, total }`, newest first, `page` from 1, `pageSize` 20 (max 100), summary
  field `firstItemName`; `GET /loyalty/orders/{orderReference}` → the order. Both `{ success, result }`, app token sent;
  403 when the order or the query's `clientId` is not the user's (show the error view). Adapter: `toOrdersPage`,
  `toOrder` (`toOrders` sorts newest first); data: `fetchPage('redemptions')`, `fetchMoreOrders(page)`,
  `fetchOrder(ref)`; samples `mock/api/loyalty-orders.json`, `loyalty-orders-detail.json`.

## 7. Guest mode: the pages before sign-in (spec §53)

- **Guest = no token:** when the app opens the webview without a token, set `common.guest = true` and
  `program.joinRequirement = "signup"`, balance 0, no accounts, and call only the guest APIs (rewards, trading task,
  recent activity). Never call an endpoint that needs a token. Preview: shared state `guest`.
- **Sign-up prompt:** the "How to start" sheet with a first step "Create your free account", `Sign up` (intent `signup`,
  app screen `/sign-up`) and "Already have an account? Log in" (intent `login`, `/login`). The app does not bring the
  user back afterwards. It opens from Redeem, the balance, reward cards, `Explore all rewards` and `Redemption history`
  (`redeemAttrs(common, intent, from)`; `from` goes with `loyalty_login_prompt_view`).
- **Home:** balance 0, rewards (guest API, same shape), recent activity, "Earn more coins" → Earn. No tier label.
- **Earn:** "How to start" (4 steps, rate line, "Coins per lot depend on your trading account type.", Sign up / Log
  in), the rules and Terms without tabs. No account, no History, no trade button, no tier table. The same sentence is
  added to the "no live account" card of signed-in users. The expiry rule is left out when `expiryDays` is null.
- **Coins:** balance 0 and a "Your coins will show up here" card with Sign up / Log in, in place of the tabs.
- **Tour:** runs for guests too, without step 5 (see §9).
- **API:** `POST /pointSys/app/point/guest/tradingTask/get` (name may change; on UAT when the backend says so): no
  Authorization, no `clientId`, still `x-auth-key`; same answer as `tradingTask/get` for a user with no live account,
  so `toProgram` / `toAccounts` read it. See `GUEST` / `TASK_ENDPOINT` in `shared/data-source.js` (demo:
  `?source=api&guest=1`); sample `mock/api/guest-tradingTask-get.json`.

## 8. Look and feel on every page

- **Sticky header** (spec §57). `appHeader(ui, { title, action, back })` takes a new optional `back` (a link: a back
  button on the left, `[data-back]`, label `orders.back`; §6); otherwise its markup is unchanged. `.app-header`
  (`shared/components.css`) is now `position: sticky` (`z-index: 30`, top = safe area + `--spacing-8`). At the top of
  the page the title is plain text, as before (white on Earn's night sky, `pages/trading-task.css`). `watchHeader()`
  (`shared/components.js`) runs on every scroll (once per frame) and on the next frame after each `appHeader` render,
  so a page that opens already scrolled starts stuck; keep an equivalent on mount in Next.js. Past 8px of scroll it
  sets `is-stuck`, and clears it back at 4px or less so it does not flicker: the title becomes a small pill with the look of the round header buttons
  (`--ui-surface-pure`, `--ui-stroke-soft`, height `--size-control-sm`, text in `--ui-icon-secondary`), and the pill
  and the buttons (help, back) shrink together (`--header-scale`); CSS transitions do the easing (none with reduced
  motion). On Earn the header
  moved out of `.hero` to just above it, so it can stay stuck; `.hero-bg` reaches further up to still cover it.
- **Close button in the bottom bar, dark mode** (spec §56): `.nav__exit` paints `--nav-exit-surface`: a small, very
  faint red sheen behind the X, fading out through several stops so it has no visible edge, over `--ui-nav-surface`.
  The button stays black; background only, no shadow. Token `--ui-nav-exit-glow` is transparent in light mode, so light
  mode is unchanged.
- **Bottom sheets** grow with their content, up to 80% of the screen: `size/sheet-max-height` is now `"80vh"` (was
  520px), then the sheet scrolls. The Terms & Conditions sheet keeps a fixed height, so it is now 80vh. **Token
  change:** this size token is now a string (`tokens/build.py` writes strings
  as they are). If your token script turns `tokens.json` into a theme, check it accepts a string size.
- **New tokens** (`tokens/tokens.json`, `tokens.css` rebuilt): `--ui-tier-<tier>-surface` / `-text` (§4),
  `--ui-nav-exit-glow` and the composed `--nav-exit-surface`.
- **New shared CSS:** `.sr-only` (`shared/base.css`), `.badge--red`, `button.card-link` (the guest balance is a button),
  `.join__login`, `.sheet--join`, `.balance-history`.
- **Images** (not in the diff file, which leaves out `assets/`): new `earn/money-bag.webp` and `earn/crown.webp`
  (upgrade row), `home/giftbox.webp` ("Looking for something else?"), `home/giftbox-gold.webp` (activity gift icon),
  `home/coin-cup.webp` ("Earn more coins"), `rewards/gift-01…09.webp` (mock only; real images come from HSB);
  removed `rewards/reward-1…3.webp`; `cups/purple.webp` is no longer used.
- **Copy** (`copy/en.json`): 91 new keys, in the groups `orders.*`, `upgrade.*`, `rewards.*`, `time.*`, `tier.*`,
  `redeemGate.*`, `activity.*`, `guest.*`, plus `join.signup`, `join.login`, `join.step.signup`,
  `join.ratesByAccount`, `money.usd`, `balance.tierLink`, `tour.finish`. Changed: `tt.rates` now takes `{account}`
  ("Earning rates of {account}"). Removed: `task.liveFeed`, `task.liveFeed.one`.

## 9. Guided tour: two fixes (spec §53, §57; the tour itself is §38)

The tour was reviewed against the new pages, signed in and as a guest; its steps stay as they are. In
`shared/tour.js`:

- **Guests skip step 5** ("Manage your coins"): they have no Available / Expired / History tabs. Their tour has 4 steps
  and step 4 ends it with `Finish tour` (new copy key `tour.finish`). Steps take a new flag `signedIn`.
- **Step 4's pop-up opens under the whole balance card**, not right under `Redeem`, so it no longer cuts through the
  "Redemption history" link. Steps take a new option `below` (a selector).
- The page scrolls each highlight to just below the sticky header.

## 10. Events (`TRACKING.md`): 34 events (spec §54, plus `loyalty_tier_badge_click` from §55)

`TRACKING.md` is the contract; every event was reviewed screen by screen. Event documentation for data and marketing:
https://nemodao.github.io/lytpg_events/ (the same 34 events, every parameter value explained; English, Chinese,
Vietnamese).

- **`shared/tracking.js`:**
  - Every push first clears every event parameter (`PARAMS`, set to `undefined`): GTM keeps the last value of each
    key, so without this an event without `source` was read with an earlier event's `source`. **Keep this in the
    Next.js version, and add any new parameter to `PARAMS`.**
  - Every value is sent as text (`has_task` was a boolean, the tour step a number), cut to 100 characters; null and
    undefined parameters are left out.
  - New common parameter `loyalty_tier` (`highestTier` in `shared/tiers.js`): `micro` | `standard` | `vip` |
    `platinum`, the highest tier among the user's eligible accounts, or `none`. GTM sets it as a GA4 user property.
    Not sent for guests.
  - `initTracking(page, common, extra)` takes extra common parameters (Redemption history: `view` = `list` | `empty`
    | `detail`). `page` adds `orders`.
- **New events:** `loyalty_rewards_view` (`reward_count`, `has_earn_card`; `watchRewards` in `pages/dashboard.js`:
  once, when the grid's first card is at least half on screen, or at once with `reward_count` 0 when there are no
  rewards), `loyalty_tier_badge_click` (`tier`), `loyalty_upgrade_row_view` (`tier`, `next_tier`; once per page load
  for each tier shown) and `loyalty_upgrade_open` (`tier`, `next_tier`), `loyalty_orders_open`,
  `loyalty_order_open` (`status`), `loyalty_code_reveal` / `loyalty_code_copy` (`kind`, `item_type`, `status`),
  `loyalty_voucher_open` (`item_type`, `status`); guests: `loyalty_login_prompt_view` (`from`), `loyalty_signup_click`,
  `loyalty_login_click` (`source`). `join_step` = `signup` marks every guest event.
- **Changed:**
  - `loyalty_reward_click`: `position` is the reward's rank among the rewards (the "Earn more coins" card is not
    counted); new `reward_id`, `reward_name`, `affordable` (`true` when the balance covers the price).
  - `loyalty_redeem_click`: also sent by `Explore rewards` on the empty Redemption history (intent `redeem`, gated like
    every Redeem; the sheet's `from` = `redeem`).
  - "How to start": every button carries `source` (`card` | `redeem`) and, in the sheet, `from`;
    `loyalty_join_card_view` is sent on every opening of the sheet, with `source` and `from`; `step` is gone from it.
  - `loyalty_deposit_click`: `source` = `upgrade` from the tier sheet, with `tier` and `next_tier`.
    `loyalty_trade_click`: `source` = `upgrade` (with `tier`, `next_tier` = `none`) from the tier sheet on Platinum;
    nothing new on the Trading account card's button. `tradeButton(source, tier)` in `pages/trading-task.js` adds
    `data-track-source`, `-tier` and `-next_tier="none"`; the sheet calls `tradeButton('upgrade', tier)`.
  - `loyalty_card_click`: `target` = `rewards`; guests' balance sends it with `coins`. Guests' `Redemption history`
    sends `loyalty_orders_open`; the Coins sign-up card sends `loyalty_join_card_view` (`source` = `card`).
  - `loyalty_error_view`: `error_scope` = `page`, `order` (an order could not be opened) or `more` (a "load more"
    failed on Coins or Redemption history; once per page load). `showStatus(ui, common, app, header, scope = 'page')`
    takes the scope.
  - Tour: `step` → `tour_step` on step view and skip; `loyalty_tour_finish` now also sends `tour_step` (the last step).
    All four tour events add `step_count` (5; 4 for guests or without a trading task; 3 when both). `tour_step` is the
    step's id, not its place in the run: without a trading task the second step shown is `3`.
- **No longer sent from Home:** `loyalty_trade_click`, `loyalty_daily_cap_view`, `loyalty_card_click` with `target` =
  `earn` from the old card (the "Earn more coins" card sends it now).
- **Check:** `tools/check-tracking.mjs` (in the package) runs the pages (Playwright) and checks every rule and
  scenario: serve the package folder on port 8000 (e.g. `python3 -m http.server 8000`), run
  `npm install --no-save playwright@1.64.0` once, then `node tools/check-tracking.mjs` (`BASE` points it elsewhere).
  It drives the installed Google Chrome; without Chrome, run `npx playwright install chromium` and set
  `CHROME_CHANNEL=` (empty). It works against the Next.js app only if that app keeps the page paths (or `BASE` maps
  them), the `?state=` preview states with the same mock data, `?tour=off`, and the class names and `data-*`
  attributes the scenarios tap; otherwise use its scenario list as a manual checklist.
- **GTM / GA4** (`TRACKING.md`, "Setting up GTM and GA4"): Data Layer Variables for the new parameters,
  `loyalty_tier` as a user property, custom dimensions, retention, key events, history-based page views off.

## 11. Data contract and states

- `DATA.md`: `common.guest`, `program.joinRequirement` may be `signup`, `common.activity[]`, `common.tiers[]`,
  `common.selectedAccountId`, `accounts[].group` and `lifetimeDeposit`, Home `rewards[]` (`id`, `name`, `points`,
  `image`), the new `redemptions` page; removed Home `task`, `rewards[].alt` and `common.liveFeed`.
- `STATES.md`: Home drops `capped`, `no-trades-today`, `market-closed`; adds `big-prices`, `rewards-empty`,
  `activity-empty`. Earn drops `market-closed`; adds `activity-empty`, `tier-micro`, `tier-standard`, `tier-top`,
  `tier-reached`, `tier-unknown`. Coins adds `needs-kyc`, `needs-deposit`. All three add `guest`. New page
  `redemptions`: `orders-empty`, `orders-more`, `loading`, `error`. Shared states (`SHARED_STATES` in `shared/app.js`)
  are now `guest`, `empty`, `needs-kyc`, `needs-deposit`, `expiring`, `activity-empty` (`market-closed` removed). On
  Home, `no-task-trading`, `ended`, `needs-kyc` and `needs-deposit` keep their names but now show the grid without the
  "Earn more coins" card, or the Redeem sheet.
- **Mock:** the default data has one account on every tier (50000387 Micro, 50000455 Standard, two VIP, 50000519
  Platinum) and one not eligible. Earn's tier states and `ineligible-selected` set `page.previewAccountId`
  (PREVIEW ONLY) to keep their account, as if the user had picked it.
- **Adapters:** `toDashboardPage(task, { rewards, checkIn })` no longer reads `task`; `mock/api/check.mjs` now also
  checks tiers, activity, rewards (signed in and guest), orders and the guest task.

## Waiting on others

The pages already read every API below from its sample answer in `mock/api/`; nothing in the UI waits on them.

- **Backend, settled, on UAT when the backend says so:** the tier fields in `tradingTask/get` (§4), the guest
  trading-task API (§7), the rewards catalog (§1), the recent activity API (§3), the orders API (§6).
- **Backend, later:** a Tada link per reward, so a reward card opens that reward rather than the catalog (§1);
  optionally an item count and an image per order in the Redemption history list (§6).
- **App team:**
  - `redeem` / `reward`: call `POST /loyalty/redeem/session` and open `result.url` in the in-app webview (§1).
  - Open the webview without a token for guests, and the `/sign-up` and `/login` screens for `signup` / `login` (§7).
  - The parameter names for the Deposit screen's account and amount (§4).
  - `voucher`: open `data-url` in the app's link viewer, like `terms` (§6).
  - Back on the Redemption history page: order → list, list → Coins (§6).
