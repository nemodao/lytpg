# Event tracking

Every analytics event the four pages send, when it is sent, and with which parameters.

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
| `page` | `home` \| `earn` \| `coins` \| `orders` | Page the event happened on (`orders`: Redemption history) |
| `theme` | `light` \| `dark` | Colour mode on screen |
| `has_task` | `true` \| `false` | Whether the user has a trading task |
| `join_step` | `signup` \| `kyc` \| `deposit` \| `none` | Step the user still has to take before earning; `signup` = guest, not signed in (spec §53) |
| `credit_mode` | `in-day` \| `delayed` \| `none` | How the programme credits coins |
| `balance_range` | `0` \| `1-999` \| `1000-4999` \| `5000+` | Available coins, as a range (the exact balance is never sent) |
| `loyalty_tier` | `micro` \| `standard` \| `vip` \| `platinum` \| `none` | The user's tier: the highest tier among their eligible trading accounts (`none`: no eligible account on one of the four tiers). Not sent for guests. **Set it in GTM as the GA4 user property `loyalty_tier`.** |
| `view` | `list` \| `empty` \| `detail` | Redemption history only: the order list, the empty list, or one order's details |

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
| `loyalty_redeem_click` | `Redeem` on the balance card is tapped (Home, Coins), or `Explore rewards` on the empty Redemption history; also when it opens the "How to start" sheet | | `balanceBlock` in `shared/components.js`; `pages/redemptions.js` |
| `loyalty_rewards_view` | The rewards grid on Home is seen (its first card at least half on screen), once per page load; at once, with `reward_count` = `0`, when there are no rewards (empty or failed catalog) | `reward_count`: `0`–`10` (rewards in the grid); `has_earn_card`: `true` \| `false` | `pages/dashboard.js` |
| `loyalty_reward_click` | A reward card in the rewards grid on Home is tapped (anywhere on the card); also when it opens the "How to start" sheet | `position`: `1`–`10`, the reward's rank among the rewards (the "earn coins" card is not counted); `reward_id`; `reward_name` (as HSB sends it, cut at 100 characters); `affordable`: `true` \| `false` (the balance covers the price; no amount is sent) | `pages/dashboard.js` |
| `loyalty_expiring_notice_view` | The "coins expire within 10 days" warning is shown | | `balanceBlock` |

### C. Use of the pages

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_page_view` | A page opens | | `initTracking` |
| `loyalty_nav_click` | A tab of the bottom bar, or its exit button, is tapped | `target`: `home` \| `earn` \| `coins` \| `exit` | `shared/nav.js` |
| `loyalty_card_click` | On Home, the balance (goes to Coins; for guests it opens the sign-up sheet), the "earn coins" card of the rewards grid (goes to Earn) or `Explore all rewards` under the grid (goes to Tada, or opens the "How to start" sheet) is tapped | `target`: `coins` \| `earn` \| `rewards` | `balanceBlock`, `pages/dashboard.js` |
| `loyalty_tab_click` | A tab inside a page is tapped | `tab`: `rules` \| `history` (Earn); `available` \| `expired` \| `history` (Coins) | `pages/trading-task.js`, `pages/point-balance.js` |
| `loyalty_date_filter_apply` | A date range is chosen (a preset chip, or `Apply` in the calendar) | `tab`: `history` \| `expired`; `range`: `7` \| `30` \| `custom` | `shared/date-filter.js` |
| `loyalty_account_select` | A trading account is chosen in the account sheet | `eligible`: `true` \| `false` | `pages/trading-task.js` |
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
| `loyalty_login_prompt_view` | A guest gets the sign-up sheet (on every opening) | `from`: `redeem` \| `balance` \| `reward` \| `explore` \| `history` (the button tapped) | `mountJoinSheet` in `shared/components.js` |
| `loyalty_signup_click` | `Sign up` is tapped | `source`: `card` (Earn's "How to start", the Coins card) \| `redeem` (the sheet, with `from`) | `joinPanel`, `pages/point-balance.js` |
| `loyalty_login_click` | `Log in` is tapped | `source` and `from`: as above | `joinPanel`, `pages/point-balance.js` |

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
| `loyalty_error_view` | Something could not be loaded | `error_scope`: `page` (the "Couldn’t load this page" card), `order` (one order could not be opened: unknown, or not the user's), `more` (the next page of a list: "Couldn't load more. Try again"; once per page load, like every view) | `showStatus` in `shared/components.js`; `pages/point-balance.js`, `pages/redemptions.js` |
| `loyalty_retry_click` | `Try again` on that card is tapped | | `showStatus` |

33 events in all.

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
| How often do pages fail to load? | `loyalty_error_view` (by `error_scope`) against `loyalty_page_view` |

## Setting up GTM and GA4

1. In GTM, one Custom Event trigger with the regular expression `^loyalty_` catches all of them.
2. One GA4 Event tag using that trigger, event name `{{Event}}`.
3. Create a Data Layer Variable for each parameter above and add them to the tag as event parameters, except
   `loyalty_tier`: add that one under the tag's User Properties.
4. In GA4, register the parameters you want to break reports down by as custom dimensions **before launch** (they do
   not apply to data collected earlier): event-scoped `page`, `has_task`, `join_step`, `credit_mode`, `balance_range`,
   `view`, `source`, `from`, `target`, `tab`, `range`, `trigger`, `capped`, `eligible`, `tier`, `next_tier`,
   `position`, `reward_id`, `reward_name`, `affordable`, `reward_count`, `has_earn_card`, `status`, `kind`,
   `item_type`, `error_scope`, `tour_step`, `step_count`; user-scoped `loyalty_tier`.
5. In GA4: set data retention to 14 months; turn off "Page changes based on browser history events" in the web
   stream's enhanced measurement (the tour changes the address without a new page); mark `loyalty_kyc_click`,
   `loyalty_deposit_click`, `loyalty_signup_click`, `loyalty_trade_click` and `loyalty_redeem_click` as key events.

Notes:

- Several events are sent by a button that leaves the page (bottom bar, cards on Home, `Skip tour`, `Finish tour`).
  They are pushed before the navigation starts; GA4 sends them with its own "send on unload" transport.
- To add an event: for a click, add `data-track` to the element; otherwise call `track(name, parameters)`. Then add a
  row to this file.
