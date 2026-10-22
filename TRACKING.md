# Event tracking

Every analytics event the pages send (the four Loyalty pages, and the Reward Store's two pages in Plan B), when it is
sent, and with which parameters.

- **Destination:** Google Tag Manager → GA4. The pages push `{ event: <name>, ...parameters }` onto `window.dataLayer`.
  The GTM container snippet is added by the host page; it is not part of this code.
- **Client id:** not sent by the pages. GTM sets it as the user property `client_id` at sign-in.
- **One place in the code:** `shared/tracking.js` (`track`, `trackView`, `initTracking`). Nothing else touches
  `dataLayer`.
- **Clicks need no code:** an element with `data-track="<event>"` is tracked by one listener; extra parameters are
  written as `data-track-<name>="<value>"`. Keep these attributes when converting the markup.
- **Views** are sent from code with `trackView`, once per page load, however often the page re-renders (the
  "How to start" sheet's view is the exception: one per opening).
- **Every value is text** (`"true"`, `"3"`), so a GA4 dimension never mixes types.
- **Each push clears every event parameter** (sets it to `undefined`) before adding its own. GTM keeps the last value
  of each key, so without this an event would be read with a parameter of an earlier one. A new parameter must be
  added to `PARAMS` in `shared/tracking.js`.
- **Check:** `node tools/check-tracking.mjs` uses the pages and fails on any break of these rules or of the table
  below.

## Parameters sent with every event

| Parameter | Values | Meaning |
|---|---|---|
| `page` | `home` \| `earn` \| `coins` \| `orders` \| `store` \| `reward` | Page the event happened on (`orders`: Redemption history; `store`: the Reward Store, both tabs; `reward`: one reward's page) |
| `theme` | `light` \| `dark` | Colour mode on screen |
| `has_task` | `true` \| `false` | Whether the user has a trading task |
| `join_step` | `signup` \| `kyc` \| `deposit` \| `none` | Step the user still has to take before earning; `signup` = guest, not signed in (spec §53) |
| `credit_mode` | `in-day` \| `delayed` \| `none` | How the programme credits coins |
| `balance_range` | `0` \| `1-999` \| `1000-4999` \| `5000+` | Available coins, as a range (the exact balance is never sent) |
| `loyalty_tier` | `micro` \| `standard` \| `vip` \| `platinum` \| `none` | The user's tier: the highest tier among their eligible trading accounts (`none`: no eligible account on one of the four tiers). Not sent for guests. **Set it in GTM as the GA4 user property `loyalty_tier`.** |
| `view` | Redemption history: `list` \| `empty` \| `detail`. Store: `home` \| `categories` \| `empty`. Reward page: `detail` \| `missing` | The view of the page on screen when the event happened. Redemption history: the order list, the empty list, or one order. Store: the Home Store tab, the Categories tab, or no rewards at all (catalog empty or failed). Reward page: the reward, or "This reward is no longer available". On the store it follows the tab; a click carries the view at the moment of the tap (so `loyalty_nav_click` carries the tab being left) |
| `redeem_mode` | `tada` \| `store` | Every page. `store` while the Reward Store stands in for Tada (Plan B, `common.rewardStore` on), else `tada`. The switch is the same for everyone: comparing the two is comparing periods, not an A/B test |
| `entry` | `home_redeem` \| `home_explore` \| `home_reward` \| `coins_redeem` \| `orders_redeem` \| `store` \| `return` \| `direct` | Store and reward page only: how the page was reached. `home_redeem`: Redeem on Home; `home_explore`: `Explore all rewards` on Home; `home_reward`: a reward card on Home (reward page); `coins_redeem`: Redeem on Coins; `orders_redeem`: `Explore rewards` on the empty Redemption history; `store`: a reward in the store (reward page); `return`: the same page again (Back from a reward page, the device's back, a reload); `direct`: a link from outside. Count store visits as page views with `entry` ≠ `return` |

Never sent: trading account numbers, exact balances, names, any personal data.

## Events

### A. From sign-up to trading

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_join_card_view` | "How to start" is shown: on the Today card on Earn and the guest card on Coins (once per page load), or in the sheet that Redeem, a reward, `Explore all rewards`, the guest balance or the guest `Redemption history` opens on Home, Coins and Redemption history (on every opening) | `source`: `card` \| `redeem` (the sheet); `from` (sheet only): `redeem` \| `balance` \| `reward` \| `explore` \| `history`, the button that opened it | `joinPanel`, `mountJoinSheet` in `shared/components.js`; `pages/point-balance.js` |
| `loyalty_kyc_click` | `Verify my account` is tapped | `source`, and `from` in the sheet, as on `loyalty_join_card_view` | button in `joinPanel` |
| `loyalty_deposit_click` | `Deposit now` is tapped | `source`: `card` \| `redeem` ("How to start", with `from` in the sheet) or `upgrade` (the tier sheet's button, with `tier` and `next_tier`) | button in `joinPanel`; tier sheet in `pages/trading-task.js` |
| `loyalty_open_account_click` | `Open a trading account` is tapped | | `pages/trading-task.js` |
| `loyalty_trade_click` | `Trade now` / `Trade with account …` is tapped | `capped`: `true` \| `false`; `source`: `upgrade` with `tier` = `platinum` and `next_tier` = `none` when it is the tier sheet's button on Platinum (none of these on the Trading account card) | `pages/trading-task.js` |

### B. Interest in rewards

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_redeem_click` | `Redeem` on the balance card is tapped (Home, Coins), or `Explore rewards` on the empty Redemption history; also when it opens the "How to start" sheet, and in Plan B when it opens the Reward Store | | `balanceBlock` in `shared/components.js`; `pages/redemptions.js` |
| `loyalty_rewards_view` | The rewards grid on Home is seen (its first card at least half on screen), once per page load; at once, with `reward_count` = `0`, when there are no rewards (empty or failed catalog) | `reward_count`: `0`–`10` (rewards in the grid); `has_earn_card`: `true` \| `false` | `pages/dashboard.js` |
| `loyalty_reward_click` | A reward is tapped: a card of the rewards grid on Home (also when it opens the "How to start" sheet; in Plan B it opens the reward's page), or a reward in the Reward Store (Popular card, F&B ticket, Tour & Travel card, a card in a Categories list) | `position` (rank within `section`, from 1; Home: 1–10 in the grid, the "earn coins" card not counted); `section`: `home` \| `popular` \| `fnb` \| `travel` \| `list`; `filter` (with `list` only); `reward_id`; `reward_name` (as HSB sends it, cut at 100 characters); `category`; `badge`; `price_range`; `affordable`: `true` \| `false` (the balance covers the price; no amount is sent; not sent for guests) (section H) | `pages/dashboard.js`, `pages/store.js` |
| `loyalty_expiring_notice_view` | The "coins expire within 10 days" warning is shown | | `balanceBlock` |

### C. Use of the pages

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_page_view` | A page opens (every load: the store's page view is sent again when the user comes back from a reward page; read visits with `entry`) | Reward page: its reward's parameters (as on `loyalty_checkout_click`) | `initTracking` |
| `loyalty_nav_click` | A tab of the bottom bar, or its exit button, is tapped. Store: a tab of its own bar when it changes the tab (the open tab sends nothing), its Back, or the reward page's Back. Back counts in-page Back only: the app's own back button is not tracked | `target`: `home` \| `earn` \| `coins` \| `exit` (Loyalty); `store_home` \| `categories` \| `back` (store, reward page) | `shared/nav.js`; `pages/store.js`, `storeHead` in `shared/store.js` |
| `loyalty_card_click` | On Home, the balance (goes to Coins; for guests it opens the sign-up sheet), the "earn coins" card of the rewards grid (goes to Earn) or `Explore all rewards` under the grid (goes to Tada, or opens the "How to start" sheet; with Plan B, `common.rewardStore`, it opens the Reward Store) is tapped | `target`: `coins` \| `earn` \| `rewards` | `balanceBlock`, `pages/dashboard.js` |
| `loyalty_tab_click` | A tab inside a page is tapped | `tab`: `rules` \| `history` (Earn); `available` \| `expired` \| `history` (Coins) | `pages/trading-task.js`, `pages/point-balance.js` |
| `loyalty_date_filter_apply` | A date range is chosen (a preset chip, or `Apply` in the calendar) | `tab`: `history` \| `expired`; `range`: `7` \| `30` \| `custom` | `shared/date-filter.js` |
| `loyalty_account_select` | A trading account is chosen in the account sheet | `eligible`: `true` \| `false` | `pages/trading-task.js` |
| `loyalty_tier_badge_click` | The tier label on the balance card is tapped (Home: next to "Coin Balance"; Coins: on the card's top edge) (goes to Earn, scrolled to the account field) | `tier`: `micro` \| `standard` \| `vip` \| `platinum` (the tier shown: the account chosen for the session, spec §55) | `balanceBlock` in `shared/components.js` |
| `loyalty_upgrade_row_view` | The upgrade row under the account field on Earn is shown, once per page load for each tier (it changes with the selected account) | `tier`, `next_tier`: as below | `pages/trading-task.js` |
| `loyalty_upgrade_open` | The upgrade row under the account field on Earn is tapped (opens the tier sheet) | `tier`: `micro` \| `standard` \| `vip` \| `platinum` (the selected account's); `next_tier`: the next one, or `none` on Platinum | `pages/trading-task.js` |
| `loyalty_terms_open` | `Terms & Conditions` is tapped | | `pages/trading-task.js` |
| `loyalty_daily_cap_view` | The "reached today's maximum" message is shown | | `pages/trading-task.js` |

### D. Guided tour

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_tour_start` | The tour starts from its first step | `trigger`: `auto` (first visit) \| `help_button`; `step_count` | `shared/tour.js` |
| `loyalty_tour_step_view` | A step is shown | `tour_step`: `1`–`5`; `step_count` | `shared/tour.js` |
| `loyalty_tour_skip` | `Skip tour` is tapped | `tour_step`: step it was skipped on; `step_count` | `shared/tour.js` |
| `loyalty_tour_finish` | `Finish tour` is tapped | `tour_step`: the last step; `step_count` | `shared/tour.js` |

`tour_step` is the step's id, not its place in this run: without a trading task step 2 is skipped, so the second
step shown is `tour_step` = `3`. `step_count` is how many steps this run has: `5`; `4` for guests (no step 5) or
without a trading task (no step 2); `3` when both.

### E. Guest mode (spec §53)

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_login_prompt_view` | A guest gets the sign-up sheet (on every opening), or taps `Checkout` on a reward's page | `from`: `redeem` \| `balance` \| `reward` \| `explore` \| `history` (the button tapped) \| `checkout` (Reward Store) | `mountJoinSheet` in `shared/components.js` |
| `loyalty_signup_click` | `Sign up` is tapped | `source`: `card` (Earn's "How to start", the Coins card) \| `redeem` (the sheet, with `from`) \| `checkout` (the reward page's sheet, with `from` = `checkout` and the reward's parameters) | `joinPanel`, `pages/point-balance.js` |
| `loyalty_login_click` | `Log in` is tapped | `source` and `from`: as above (including `checkout`) | `joinPanel`, `pages/point-balance.js` |

The guest sheet sends both `loyalty_login_prompt_view` and `loyalty_join_card_view` (`source` = `redeem`) on each
opening: count one or the other, never both added together. Guests' events carry `join_step` = `signup`.

### F. Redemption history (spec §52)

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_orders_open` | `Redemption history` under Redeem on Coins is tapped (for guests it opens the sign-up sheet) | | `balanceBlock` in `shared/components.js` |
| `loyalty_order_open` | An order in the list is tapped | `status`: `new` \| `on process` \| `completed` \| `canceled` \| `failed` | `pages/redemptions.js` |
| `loyalty_code_reveal` | `Show` is tapped on a hidden code | `kind`: `code` \| `pin` \| `serial`; `item_type`; `status` | `pages/redemptions.js` |
| `loyalty_code_copy` | `Copy` is tapped | `kind`: `code` \| `pin` \| `serial` \| `awb` \| `order`; `item_type` (not for `order`); `status` | `pages/redemptions.js` |
| `loyalty_voucher_open` | `Open voucher` is tapped | `item_type`; `status` | `pages/redemptions.js` |

`item_type`: `egift` \| `physical` \| `pln` \| `pulsa` \| `other`, the item's kind. `status`: the order's status, as on
`loyalty_order_open`.

### G. Problems

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_error_view` | Something could not be loaded | `error_scope`: `page` (the "Couldn’t load this page" card), `order` (one order could not be opened: unknown, or not the user's), `reward` (a reward's page for a reward not in the catalog, with `reward_count`: rewards in the catalog, `0` = catalog empty or failed), `more` (the next page of a list: "Couldn't load more. Try again"; once per page load, like every view) | `showStatus` in `shared/components.js`; `pages/point-balance.js`, `pages/redemptions.js` |
| `loyalty_retry_click` | `Try again` on that card is tapped | | `showStatus` |

38 events in all.

### H. Reward Store (Plan B, spec §59–§62)

Only while `redeem_mode` = `store`. Every event of the reward page carries its reward's parameters: `reward_id`,
`reward_name`, `category`, `badge`, `price_range`, `affordable` (signed in only). Loyalty events used by the store:
`loyalty_page_view` (`page` = `store` / `reward`), `loyalty_reward_click`, `loyalty_nav_click`,
`loyalty_login_prompt_view`, `loyalty_signup_click`, `loyalty_login_click`, `loyalty_error_view`.

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_store_section_view` | A section of Home Store is seen (its first card, Travel: its title, at least half on screen), once per section per page load | `section`: `popular` \| `fnb` \| `travel`; `reward_count`: rewards in the section (8 / 4 / 4 when the catalog has enough) | `pages/store.js` |
| `loyalty_category_view` | A list of rewards is shown on the Categories tab. `from` = `chip` or `see_all`: sent on every change (a choice); `tab` or `page_load`: once per category per page load (the list was only shown) | `category`: `all` \| `gadget_electronics` \| `tour_travel` \| `shopping_voucher` \| `fnb_voucher` \| `home_living` \| `more` (the "More categories" card); `from`: `chip` \| `see_all` (See all on Home Store: Popular → `all`) \| `tab` (the Categories tab, which shows the last category) \| `page_load` (the store opened on Categories, e.g. Back from a reward); `reward_count`: rewards in that list (`0` for `more` or an empty category) | `pages/store.js` |
| `loyalty_checkout_click` | `Checkout` is tapped on a reward's page (every tap: read demand by user) | `outcome`: `not_enough` (signed in, balance below the price: "Not enough coins yet") \| `coming_soon` (signed in with enough coins, also users who still need KYC or a deposit: "Checkout is coming soon") \| `guest` (not signed in: "coming soon" with Sign up / Log in); `short_range` (only with `not_enough`): coins still needed, `1-999` \| `1000-4999` \| `5000-19999` \| `20000+` | `pages/reward.js` |
| `loyalty_earn_more_click` | `Learn how to earn coins` is tapped in the "Not enough coins yet" sheet (goes to Earn; the button is absent without a trading task) | (the reward's parameters) | `pages/reward.js` |

Parameters of the store's events:

- `section` (`loyalty_reward_click`, `loyalty_store_section_view`): where the reward was tapped or the section seen:
  `home` (Home's rewards grid) | `popular` | `fnb` (F&B e-Vouchers) | `travel` (Tour & Travel) | `list` (a list on the
  Categories tab).
- `filter` (`loyalty_reward_click` with `section` = `list` only): the category chip of that list: `all` or a category
  key.
- `position` (`loyalty_reward_click`): the reward's rank, from 1, within its `section` (with `list`: within that
  filtered list). Home: 1–10 in the grid.
- `category`: the reward's own category: one of the five keys, or `none` (no category). On `loyalty_category_view`:
  the list shown (adds `all`, `more`).
- `badge`: the label the user saw on the tapped card: `hot` | `new` | `none`. F&B tickets, Tour & Travel cards and
  Home's grid show none, so they send `none`; the reward page sends the reward's own label. In Popular `hot` rewards come
  first, so read the label's effect together with `position`.
- `price_range`: the reward's price in coins, `1-4999` | `5000-19999` | `20000-49999` | `50000+` (cut-offs from the mock
  catalog: confirm them against the real one before launch).
- `affordable`: `true` | `false`, whether the balance covers the price. Not sent for guests (their balance is always 0),
  here and on Home (changed 23 Oct 2026; before, guests sent `false`).
- `short_range` together with the price narrows the balance to a range, never to an exact figure.

Funnels: Home reward card → reward page directly (`loyalty_reward_click` `page=home` → `loyalty_page_view`
`page=reward` `entry=home_reward`); Redeem / `Explore all rewards` → store (`loyalty_redeem_click` /
`loyalty_card_click` `target=rewards` → `loyalty_page_view` `page=store`) → `loyalty_reward_click` `page=store` →
`loyalty_page_view` `page=reward` `entry=store` → `loyalty_checkout_click` → (`not_enough`) `loyalty_earn_more_click` →
`loyalty_page_view` `page=earn` → `loyalty_trade_click`. A guest's Checkout also sends `loyalty_login_prompt_view`
(`from=checkout`): count it or `outcome=guest`, never both added together. The store pages have no events for closing a
sheet, the banner, the balance pill, or scrolling a row.

## Questions these events answer

| Question | Read it from |
|---|---|
| How many guests sign up, and from which button? | `loyalty_login_prompt_view` (by `from`) → `loyalty_signup_click`; any event split by `join_step` = `signup` |
| How many users who see "How to start" go on to KYC, and to deposit? From which button? | `loyalty_join_card_view` (by `join_step`, `source`, `from`) → `loyalty_kyc_click`, `loyalty_deposit_click` (same `source`, `from`) |
| Do the pages send users to trade? | `loyalty_page_view` → `loyalty_trade_click`, split by `page` |
| Does reaching the daily maximum stop users trading? | `loyalty_daily_cap_view` → `loyalty_trade_click` with `capped = true` |
| How strong is the interest in rewards, and from which balance? Which rewards? | `loyalty_rewards_view` → `loyalty_reward_click`, split by `balance_range`, `affordable`; `reward_id` / `reward_name` and `position`; `loyalty_redeem_click` |
| Does the expiry warning push users to redeem? | `loyalty_expiring_notice_view` → `loyalty_redeem_click` |
| Does showing the next tier push users to deposit? | `loyalty_upgrade_row_view` → `loyalty_upgrade_open` (by `tier`) → `loyalty_deposit_click` with `source` = `upgrade` (by `tier`); reports by user: `loyalty_tier` |
| Which pages and tabs are used? | `loyalty_page_view`, `loyalty_nav_click`, `loyalty_card_click`, `loyalty_tab_click`, `loyalty_date_filter_apply` |
| Do users finish the tour, and where do they leave it? | `loyalty_tour_start` → `loyalty_tour_step_view` by `tour_step` → `loyalty_tour_finish` / `loyalty_tour_skip`, split by `step_count` |
| Do users come back for their reward codes? | `loyalty_orders_open` → `loyalty_order_open` (by `status`) → `loyalty_code_reveal` / `loyalty_code_copy` / `loyalty_voucher_open` (by `item_type`) |
| How many users open the Reward Store, and from which button? | Store visits: `loyalty_page_view` `page=store` with `entry` ≠ `return`, by `entry`; or the clicks before it: `loyalty_redeem_click` (by `page`), `loyalty_card_click` `target=rewards`, `loyalty_reward_click` `page=home`. Count users or sessions, not page views |
| Which store sections and categories are used, and is "More categories" asked for? | `loyalty_store_section_view` (by `section`, as users) → `loyalty_reward_click` (same `section`); `loyalty_category_view` by `category` (choices: `from` = `chip` / `see_all`; `more` = the "More categories" card); `loyalty_nav_click` `target=categories` |
| Which rewards and price levels attract users, and which would they redeem? | `loyalty_reward_click` → `loyalty_page_view` `page=reward` → `loyalty_checkout_click`, by `reward_id` / `reward_name`, `category`, `price_range`, `section`, `position`, `badge`; split by `affordable`, `balance_range` |
| How much demand is waiting for checkout to launch? | Users with `loyalty_checkout_click` `outcome=coming_soon`, by `reward_name`, `category`, `price_range` |
| How far are users from the rewards they want? | `loyalty_checkout_click` `outcome=not_enough`, by `short_range` and `price_range` |
| Does the store push users to trade? | `loyalty_checkout_click` `outcome=not_enough` → `loyalty_earn_more_click` (by `reward_id`, `category`) → `loyalty_page_view` `page=earn` → `loyalty_trade_click`. Trades and coins actually earned are in the backend, joined on `client_id`: `loyalty_trade_click` is a tap, not a trade |
| Do guests who browse the store sign up, and for which rewards? | `loyalty_login_prompt_view` `from=checkout` → `loyalty_signup_click` / `loyalty_login_click` `from=checkout` (by `reward_id`, `category`) |
| Does Plan B cost KYC and deposits? (its Redeem no longer opens "How to start") | Users with `join_step` = `kyc` / `deposit`: `loyalty_kyc_click`, `loyalty_deposit_click`, split by `redeem_mode` (periods); the store's route: `loyalty_checkout_click` → `loyalty_earn_more_click` → `loyalty_join_card_view` `source=card` → `loyalty_kyc_click` / `loyalty_deposit_click` |
| How does Plan B change the use of the Loyalty pages? | Any event split by `redeem_mode` (before / after the switch, not an A/B test) |
| How often do pages fail to load? | `loyalty_error_view` (by `error_scope`; `reward` with `reward_count=0`: the store's catalog empty or failed) against `loyalty_page_view` |

## Setting up GTM and GA4

1. In GTM, one Custom Event trigger with the regular expression `^loyalty_` catches all of them.
2. One GA4 Event tag using that trigger, event name `{{Event}}`.
3. Create a Data Layer Variable for each parameter above and add them to the tag as event parameters, except
   `loyalty_tier`: add that one under the tag's User Properties.
4. In GA4, register the parameters you want to break reports down by as custom dimensions **before launch** (they do
   not apply to data collected earlier): event-scoped `page`, `has_task`, `join_step`, `credit_mode`, `balance_range`,
   `view`, `source`, `from`, `target`, `tab`, `range`, `trigger`, `capped`, `eligible`, `tier`, `next_tier`,
   `position`, `reward_id`, `reward_name`, `affordable`, `reward_count`, `has_earn_card`, `status`, `kind`,
   `item_type`, `error_scope`, `tour_step`, `step_count`; for the Reward Store (register them before Plan B is
   turned on, or its first days are lost) `redeem_mode`, `entry`, `section`, `filter`, `category`, `badge`, `outcome`,
   `price_range`, `short_range`; user-scoped `loyalty_tier`.
5. In GA4: set data retention to 14 months; turn off "Page changes based on browser history events" in the web
   stream's enhanced measurement (the tour changes the address without a new page); mark `loyalty_kyc_click`,
   `loyalty_deposit_click`, `loyalty_signup_click`, `loyalty_trade_click`, `loyalty_redeem_click`,
   `loyalty_checkout_click` and `loyalty_earn_more_click` as key events.

Notes:

- Several events are sent by a button that leaves the page (bottom bar, cards on Home, `Skip tour`, `Finish tour`).
  They are pushed before the navigation starts; GA4 sends them with its own "send on unload" transport.
- To add an event: for a click, add `data-track` to the element; otherwise call `track(name, parameters)`. Then add a
  row to this file.
