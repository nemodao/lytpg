# Handoff 5 — what changed since handoff 4

> **Status: in progress.** Phase 3 is not finished: the guided tour still has to be reworked for the new Home and Earn
> (it runs, but steps 2 and 4 describe the old layout). This file grows until the round is handed off; read it again
> then.

**Who this is for:** developers (and their AI assistants) who have already applied handoff 4. Everything not named here
is unchanged. Behaviour: `spec.md` §49–§53. Exact line changes: `CHANGES-since-handoff-4.diff` in the package.

Phase 3 was asked for by business users: Home sells rewards instead of trading, Earn pushes users to a higher account
tier, and a new page lets users follow their reward orders.

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
    Earn). It takes the height of the card next to it; its image scales into the space left. Hidden without a trading
    task or once the programme has ended; the grid then shows rewards only.
- **"Looking for something else?" card** under the grid: blue gift box, a line that names the user's balance, and a
  small `Explore all rewards` button (intent `redeem`).
- **Recent activity card** between the balance and the grid: see item 3.

**API:** `rewards` will come from an HSB rewards API (a fixed list); fields and mapping to be agreed. Until then the
mock list (9 rewards, `assets/images/rewards/gift-01…09.webp`) stands in. The front end keeps the data shape in
`DATA.md` (`rewards[].id`, `name`, `points`, `image`).

## 2. Every Redeem asks for KYC and a first deposit first (spec §49)

Users who still need KYC or a first deposit no longer go to Tada from any Redeem (balance block on Home and Coins,
reward cards, `Explore all rewards`). They get a bottom sheet: "Start earning to redeem", one line, then the same
"How to start" panel as on Earn (steps, rate line, button with the tapping finger).

- `shared/components.js`: `redeemAttrs(common, intent)` gives either the Tada intent or `data-action="join-sheet"`;
  `mountJoinSheet(ui, common, app)` opens the sheet (once per page; nothing for users who can redeem).
- `joinPanel` takes `source` (`card` on Earn, `redeem` in the sheet), sent with `loyalty_join_card_view`.
- The sheet opens after the tap is tracked, so `loyalty_redeem_click` / `loyalty_reward_click` come before the view.

## 3. Recent activity card on Home and Earn (spec §50)

One small card, the same on both pages: [icon] "Trader 95***442 just redeemed iPhone 16 Pro" [3d ago] /
[coin] "Trader 95***356 just earned 12 coins" [3m ago]. A new entry every 4 s. While a reward entry shows, the card
turns light purple.

- **Data:** a list from the backend (endpoint to be defined), asked for **once per session** and kept in
  `sessionStorage` (`sessionCached` in `shared/data-source.js`). Shape in `DATA.md`: `common.activity[]` = `type`
  (`gift` | `coin`), `client` (masked by the backend), `reward` or `points`, `at`.
- **Order:** newest first within each kind; the kinds take turns in rounds of 1:1, 2:1, 3:1 and 3:2 (coin entries :
  rewards, rewards first), played in a shuffled order, then shuffled again. Each kind loops on its own.
- **Linked:** Home and Earn share the list and the place in the loop for the session (`sessionStorage`), so switching
  tabs goes on with the next entry. A re-render does not move it on (Earn re-renders on every tap).
- Time is worked out on screen from `at`: "Now", "3m ago", "2h ago", "3d ago".
- The card always keeps room for two lines, so its height never changes.
- **Removed:** the live "Trader … just earned" line inside Earn's Today card, its generator `shared/live-feed.js`, the
  `common.liveFeed` settings and the preview state `market-closed`. New module: `shared/activity-feed.js`.

## 4. Earn: account tiers and the way up (spec §51)

- **Tier label** right after the account number (eligible accounts only), in the account field and the account sheet.
  MT5 group → label, held by the front end: `Mini400` Micro, `Mini10` Standard, `VIP1` VIP, `MIVIP` Platinum. Any other
  group: no label, no upgrade row.
- **Upgrade row** right under the account field: money bag, "Want more coins per lot?" / "Upgrade to {next} and earn up
  to {n} coins per lot". On Platinum it is quiet (crown, no border, grey): "{Platinum}: our highest rates". It opens the
  tier sheet.
- **Rates heading** now reads "Earning rates of {account}".
- **Tier sheet:** the account number; the four tiers as steps (only the account's tier ticked); below Platinum the
  lifetime deposit against the next threshold with a bar and "Deposit $X more to reach {next}"; a table of coins per
  lot on **every** tier, the account's column highlighted with a "Now" pill. When the table is too wide, the first
  column stays and the tier columns scroll sideways; the sheet opens with the "Now" column as near the middle as it
  goes. `Deposit now` (or, on Platinum, `Trade with account …`) stays visible at the sheet's bottom.
- **`Deposit now` carries the amount:** intent `deposit` with `data-account` and `data-amount` (USD still needed,
  rounded up; absent when nothing is missing), so the app's Deposit screen opens on that account with the amount filled
  in. **The parameter names on the app side are to be agreed with the app team.**
- A symbol row (e.g. XAUUSD) on a tier that does not list it shows "—": the page cannot tell which group a symbol is in.
- **API (proposed, to agree with the backend):** `tradingTask/getTiers` → `common.tiers[]` (`group`, `minDeposit`,
  `rates`), and per account `group` and `lifetimeDeposit`, matched by id (`toTiers`, `toAccounts(task, tierInfo)` in
  `shared/api-adapter.js`; sample `mock/api/tradingTask-getTiers.json`).

## 5. New page: Redemption history (spec §52)

- **Way in:** Coins, a small `Redemption history ›` link under `Redeem` (`balanceBlock(…, { history })`).
- **Page:** `pages/redemptions.html` / `.js` / `.css`. No bottom bar; the header has a back button
  (`appHeader(ui, { back })`): list → Coins, order → list. **The app's Back must do the same on this page.**
- **List:** reward name, order date, order number, status badge, coins; newest first; 20 per page, the next page on
  scroll until `total`. Empty: "No redemptions yet" + `Explore rewards`.
- **Order** (`?order=<orderReference>`): status badge + "Updated {date}, {time}" (no step-by-step timeline: no data),
  order number (copy), order date, coins spent, a green note when refunded; each item by kind: e-voucher code and PIN
  hidden until `Show`, then `Copy`, `Open voucher` (new intent `voucher` with `data-url`, like `terms`), "Valid until";
  PLN / mobile credit serial number the same way; physical goods courier, AWB (copy), tracking number, and the
  recipient.
- **No IDR anywhere:** the backend strips every money value; the page shows coins only.
- **API (settled with the backend 20 Oct 2026):** `GET /loyalty/orders?clientId=…&page=…&pageSize=…` →
  `result = { orders: [...], page, pageSize, total }`, newest first, `page` from 1, `pageSize` 20 (max 100), summary
  field `firstItemName`; `GET /loyalty/orders/{orderReference}` → the order. Both `{ success, result }`, app token sent;
  403 when the order or the query's `clientId` is not the user's (show the error view). Adapter: `toOrdersPage`,
  `toOrder`; data: `fetchPage('redemptions')`, `fetchMoreOrders(page)`, `fetchOrder(ref)`.

## 6. Guest mode: the pages before sign-in (spec §53)

- **Guest = no token:** when the app opens the webview without a token, set `common.guest = true` and
  `program.joinRequirement = "signup"`, balance 0, no accounts, and call only the guest APIs (rewards, trading task,
  recent activity). Never call an endpoint that needs a token. Preview: shared state `guest`.
- **Sign-up prompt:** the "How to start" sheet with a first step "Create your free account", `Sign up` (intent `signup`,
  app screen `/sign-up`) and "Already have an account? Log in" (intent `login`, `/login`). The app does not bring the
  user back afterwards. It opens from Redeem, the balance, reward cards, `Explore all rewards` and `Redemption history`
  (`redeemAttrs(common, intent, from)`; `from` goes with `loyalty_login_prompt_view`).
- **Home:** balance 0, rewards (guest API, same shape), recent activity, "Earn more coins" → Earn.
- **Earn:** "How to start" (4 steps, rate line, Sign up / Log in), a card with the coins per lot of every tier
  (`tiersCard`, `tierTable()` without a "Now" column), the rules and Terms without tabs. No account, no History, no
  trade button.
- **Coins:** balance 0 and a "Your coins will show up here" card with Sign up / Log in, in place of the tabs.
- **Tour:** runs for guests too.
- **API:** the guest trading-task API is requested from the backend (see `shared/data-source.js`, `commonFromApi`);
  until it exists the mock's `guest` state stands in.

## 7. Bottom sheets grow with their content, up to 80% of the screen

`size/sheet-max-height` is now `"80vh"` (was 520px), for every sheet. A sheet is as tall as its content up to 80% of
the screen height, then scrolls. **Token change:** this size token is now a string (`tokens/build.py` writes strings as
they are). If your token script turns `tokens.json` into a theme, check it accepts a string size.

## 8. Events (`TRACKING.md`): 31 events

- New: `loyalty_upgrade_open` (`tier`, `next_tier`); `loyalty_orders_open`, `loyalty_order_open` (`status`),
  `loyalty_code_reveal` / `loyalty_code_copy` (`kind`), `loyalty_voucher_open`; guests: `loyalty_login_prompt_view`
  (`from`), `loyalty_signup_click`, `loyalty_login_click` (`source`). `join_step` = `signup` marks every guest event.
- New parameters: `reward_id` on `loyalty_reward_click` (`position` is now 1–10, the grid cell); `source` on
  `loyalty_join_card_view` (`card` | `redeem`) and on `loyalty_deposit_click` (`upgrade` from the tier sheet);
  `target` = `rewards` on `loyalty_card_click`; `page` = `orders`.
- No longer sent from Home: `loyalty_trade_click`, `loyalty_daily_cap_view`, `loyalty_card_click` with `target` = `earn`
  from the old card (the "Earn more coins" card sends it now).

## 9. Data contract and states

- `DATA.md`: `common.guest`, `program.joinRequirement` may be `signup`, `common.activity[]`, `common.tiers[]`, `accounts[].group` and `lifetimeDeposit`, Home `rewards[]` (`id`,
  `name`, `points`, `image`), the new `redemptions` page; removed Home `task`, `rewards[].alt` and `common.liveFeed`.
- `STATES.md`: Home drops `capped`, `no-trades-today`, `market-closed`; adds `big-prices`, `activity-empty`. Earn drops
  `market-closed`; adds `activity-empty`, `tier-micro`, `tier-standard`, `tier-top`, `tier-reached`, `tier-unknown`.
  Coins adds `needs-kyc`, `needs-deposit`. All three add `guest` (shared). New page `redemptions`: `orders-empty`, `orders-more`, `loading`, `error`.

## Waiting on others

- Backend: the rewards list API (guest and signed-in, same shape), the recent activity API (needs no token; not created
  yet), the tiers API, the guest trading-task API; for Redemption history, an item count and an image per order
  (optional).
- App team: the parameter names for the Deposit amount; Back on the Redemption history page.
