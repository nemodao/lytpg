# Event tracking

Every analytics event the three pages send, when it is sent, and with which parameters.

- **Destination:** Google Tag Manager → GA4. The pages push `{ event: <name>, ...parameters }` onto `window.dataLayer`.
  The GTM container snippet is added by the host page; it is not part of this code.
- **Client id:** not sent by the pages. GTM sets it as the user property `client_id` at sign-in.
- **One place in the code:** `shared/tracking.js` (`track`, `trackView`, `initTracking`). Nothing else touches
  `dataLayer`.
- **Clicks need no code:** an element with `data-track="<event>"` is tracked by one listener; extra parameters are
  written as `data-track-<name>="<value>"`. Keep these attributes when converting the markup.
- **Views** are sent from code with `trackView`, once per page load, however often the page re-renders.

## Parameters sent with every event

| Parameter | Values | Meaning |
|---|---|---|
| `page` | `home` \| `earn` \| `coins` | Page the event happened on |
| `theme` | `light` \| `dark` | Colour mode on screen |
| `has_task` | `true` \| `false` | Whether the user has a trading task |
| `join_step` | `kyc` \| `deposit` \| `none` | Step the user still has to take before earning |
| `credit_mode` | `in-day` \| `delayed` \| `none` | How the programme credits coins |
| `balance_range` | `0` \| `1-999` \| `1000-4999` \| `5000+` | Available coins, as a range (the exact balance is never sent) |

Never sent: trading account numbers, exact balances, names, any personal data.

## Events

### A. From sign-up to trading

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_join_card_view` | The "How to start" card is shown | `step`: `kyc` \| `deposit` | `joinPanel` in `shared/components.js` |
| `loyalty_kyc_click` | `Verify my account` is tapped | | button in `joinPanel` |
| `loyalty_deposit_click` | `Deposit now` is tapped | | button in `joinPanel` |
| `loyalty_open_account_click` | `Open a trading account` is tapped | | `pages/trading-task.js` |
| `loyalty_trade_click` | `Trade now` / `Trade with account …` is tapped | `capped`: `true` \| `false` | `pages/dashboard.js`, `pages/trading-task.js` |

### B. Interest in rewards

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_redeem_click` | `Redeem` on the balance card is tapped | | `balanceBlock` in `shared/components.js` |
| `loyalty_reward_click` | A reward tile's `Redeem` on Home is tapped | `position`: `1` \| `2` \| `3` | `pages/dashboard.js` |
| `loyalty_expiring_notice_view` | The "coins expire within 10 days" warning is shown | | `balanceBlock` |

### C. Use of the pages

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_page_view` | A page opens | | `initTracking` |
| `loyalty_nav_click` | A tab of the bottom bar, or its exit button, is tapped | `target`: `home` \| `earn` \| `coins` \| `exit` | `shared/nav.js` |
| `loyalty_card_click` | On Home, the balance (goes to Coins) or the Daily Trading card / `Details` (goes to Earn) is tapped | `target`: `coins` \| `earn` | `balanceBlock`, `pages/dashboard.js` |
| `loyalty_tab_click` | A tab inside a page is tapped | `tab`: `rules` \| `history` (Earn); `available` \| `expired` \| `history` (Coins) | `pages/trading-task.js`, `pages/point-balance.js` |
| `loyalty_date_filter_apply` | A date range is chosen (a preset chip, or `Apply` in the calendar) | `tab`: `history` \| `expired`; `range`: `7` \| `30` \| `custom` | `shared/date-filter.js` |
| `loyalty_account_select` | A trading account is chosen in the account sheet | `eligible`: `true` \| `false` | `pages/trading-task.js` |
| `loyalty_terms_open` | `Terms & Conditions` is tapped | | `pages/trading-task.js` |
| `loyalty_daily_cap_view` | The "reached today's maximum" message is shown | | `pages/dashboard.js`, `pages/trading-task.js` |

### D. Guided tour

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_tour_start` | The tour starts from its first step | `trigger`: `auto` (first visit) \| `help_button` | `shared/tour.js` |
| `loyalty_tour_step_view` | A step is shown | `step`: `1`–`5` | `shared/tour.js` |
| `loyalty_tour_skip` | `Skip tour` is tapped | `step`: step it was skipped on | `shared/tour.js` |
| `loyalty_tour_finish` | `Finish tour` is tapped | | `shared/tour.js` |

### E. Problems

| Event | Sent when | Extra parameters | Where |
|---|---|---|---|
| `loyalty_error_view` | The "Couldn’t load this page" card is shown | | `showStatus` in `shared/components.js` |
| `loyalty_retry_click` | `Try again` on that card is tapped | | `showStatus` |

22 events in all.

## Questions these events answer

| Question | Read it from |
|---|---|
| How many users who see "How to start" go on to KYC, and to deposit? | `loyalty_join_card_view` (by `step`) → `loyalty_kyc_click`, `loyalty_deposit_click` |
| Do the pages send users to trade? | `loyalty_page_view` → `loyalty_trade_click`, split by `page` |
| Does reaching the daily maximum stop users trading? | `loyalty_daily_cap_view` → `loyalty_trade_click` with `capped = true` |
| How strong is the interest in rewards, and from which balance? | `loyalty_redeem_click`, `loyalty_reward_click`, split by `balance_range` |
| Does the expiry warning push users to redeem? | `loyalty_expiring_notice_view` → `loyalty_redeem_click` |
| Which pages and tabs are used? | `loyalty_page_view`, `loyalty_nav_click`, `loyalty_card_click`, `loyalty_tab_click`, `loyalty_date_filter_apply` |
| Do users finish the tour, and where do they leave it? | `loyalty_tour_start` → `loyalty_tour_step_view` by `step` → `loyalty_tour_finish` / `loyalty_tour_skip` |
| How often do pages fail to load? | `loyalty_error_view` against `loyalty_page_view` |

## Setting up GTM and GA4

1. In GTM, one Custom Event trigger with the regular expression `^loyalty_` catches all of them.
2. One GA4 Event tag using that trigger, event name `{{Event}}`.
3. Create a Data Layer Variable for each parameter above and add them to the tag as event parameters.
4. In GA4, register the parameters you want to break reports down by as custom dimensions (`page`, `join_step`,
   `step`, `target`, `tab`, `range`, `trigger`, `balance_range`, `capped`).

Notes:

- Several events are sent by a button that leaves the page (bottom bar, cards on Home, `Skip tour`, `Finish tour`).
  They are pushed before the navigation starts; GA4 sends them with its own "send on unload" transport.
- Parameter values read from `data-track-*` attributes are text (`"true"`, `"1"`); the tour's `step` is a number.
- To add an event: for a click, add `data-track` to the element; otherwise call `track(name, parameters)`. Then add a
  row to this file.
