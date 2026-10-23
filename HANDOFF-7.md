# Handoff 7 — what changed since handoff 6

**Who this is for:** developers (and their AI assistants) who have already applied handoff 6, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §59–§62. Exact line changes: `CHANGES-since-handoff-6.diff`
in the package (images are not in it: see §7).

This is an **early handoff**: the Reward Store's UI is done, sent before the backend has delivered the API changes it
reads (§3, §4). The pages already run on sample answers in `mock/api/`.

**In one line:** a browse-only Reward Store inside the webview ("Plan B", in case the Tada integration is not ready for
launch), behind a switch that is **off by default**; and HSB's own endpoints (the Tada integration backend: catalog,
activity, orders, redeem session) moved from `/loyalty/…` to `/app/point/…`, all POST, on the same host and base as
the loyalty API (`{host}/pointSys/app/point/…`). It also lists fixes from the review of your handoff 6 work (§10).

---

## 1. Plan B is a switch: `common.rewardStore` (spec §61)

- **New field** `common.rewardStore` (boolean, **false by default**). It is a setting on HSB's side, not from the
  loyalty API: `REWARD_STORE` in `shared/data-source.js` (marked `API:`). Preview: shared state `plan-b` ("Plan B:
  Reward Store"), in every page's mock file.
- **Off (default):** Redeem buttons and the activity card behave as in handoff 6. Redeem buttons send the Tada
  intents (`redeem`, `reward`; `HANDOFF.md` §6); users who still need KYC or a first deposit get the "How to start"
  sheet.
- **On:**
  - Redeem, `Explore all rewards` and the empty Redemption history's `Explore rewards` open `store.html`; a reward card
    on Home opens `reward.html?id=…`. For everyone: guests and users who still need KYC or a deposit can browse too.
    Only a guest's balance and `Redemption history` still open the sign-up sheet.
  - The recent activity card (Home, Earn) shows coin entries only: nothing can be redeemed yet
    (`createActivityFeed` in `shared/activity-feed.js` filters `type === 'coin'`).
- **Code:** `redeemAttrs(common, intent, from)` in `shared/components.js` now checks `common.rewardStore`; with it on it
  gives `data-action="store" data-store="redeem|reward"`. New `mountStoreLinks(ui, app)` (called once per page on Home,
  Coins and Redemption history, next to `mountJoinSheet`) does the navigation: it opens the store or the reward's page
  with `back=<this page and its query>`, so the store's Back returns here.
- **In the app:** the webview loads `store.html` / `reward.html` like any Loyalty page, in the same webview (no
  deeplink; keep them on the webview's allowed list). The store's Back is a link to `back`, so each Back adds a history
  entry: either make the app's back button follow the same `back` link, or in Next.js implement Back as `router.back()`
  when the previous entry is `back`, else `router.replace(back)`.

## 2. New pages: the Reward Store (spec §59)

`pages/store.html` / `.js` / `.css` (the store, two tabs) and `pages/reward.html` / `.js` / `.css` (one reward;
`reward.html` also loads `store.css`, which holds the top bar, the badge, the background and dark mode). New shared
module `shared/store.js` (`storeHead`, `rewardBadge`, `categoryName`, `backParam`, `withParams`, `rewardHref`). Both
pages read `fetchCommon()` (balance, guest flag) and `fetchPage('store')` (§3).

**Addresses:** `store.html?tab=rewards&cat=<category key>|more&sort=price_asc|price_desc&back=<page>` (no `tab` = Home Store; no `cat` = All; no `sort` = the catalog's order;
`tab=rewards` is the **Categories** tab: id `rewards` everywhere in code, copy key `store.tab.rewards`, artwork
`nav/rewards-*.png`, class `.store-tab--rewards`) and `reward.html?id=<id>&back=<page>`.
- The store keeps its tab, category and sort in the address (`history.replaceState`), so a reward's Back returns to the
  same view. It rewrites only `tab`, `cat`, `sort` and `back` and keeps every other parameter.
- `back` = the path and query of the page to return to, URL-encoded (nested once for a reward opened from the
  store). Only one of our own pages is accepted (`backParam`: a file name such as `dashboard.html?…`, never a scheme or
  a host); anything else, or no `back`: the store returns to Home, a reward page to the store. In Next.js put your own
  route there, or keep the return target in router state, and keep that check.

**Top bar** (`storeHead`, both pages): the store's icon (a 3D gift box in a white round badge), "Reward Redemption" and
the balance in one pill with a thin line between the coin and the number. It sticks and shrinks on scroll like
Loyalty's header: `watchHeader()` in `shared/components.js` now also handles `.store-head` and is exported; once stuck
the badge melts away, the gift and title become one pill, and the three pills (back / title / balance) have the same
height. On the reward page a back button replaces the icon.

**Bottom bar** (built in `pages/store.js`, not `shared/nav.js`): Back on the left (where Loyalty has its Close; it goes
to `back`), then the tabs **Home Store** and **Categories**, with 3D artwork like Loyalty's tabs
(`assets/images/nav/store-*.png` for Home Store, `rewards-*.png` for Categories: light, dark, on). The tabs switch in
the page, without a reload. It reuses Loyalty's bar classes from `components.css` (`.nav`, `.nav__exit`, `.nav__tabs`,
`.nav__tab`, `.nav__art`, `.nav__image--on-light|dark`, body `has-nav`); new: `.nav__back`, `.store-nav__on|off`.

**Home Store tab:**
- Banner (`assets/images/store/banner.webp`, decorative, deep navy) with two lines of text over it.
- **Popular Rewards:** 8 rewards in one row that scrolls sideways.
- **F&B e-Vouchers:** 4 rewards as tickets (picture, an "e-Voucher" line and the name, a dashed cut with two real
  round notches, made with a CSS mask, and the price).
- **Tour & Travel:** a promo panel on the tokens' purple blend (`.blend-pink`) with soft gold rays, an outlined title
  and a ribbon; 4 cards in a sideways row (about 1.7 on screen), each drawn tilted over a purple layer, with a
  "Special" sash (fixed in the front end) and the price under the name; `See all` on the panel's bottom edge. The
  panel keeps its light colours in dark mode (`data-theme="light"` on `.trip-promo`).
- `See all` opens the Categories tab on that category (Popular: "All").
- **Filling the sections** (`arrange` in `pages/store.js`), from the one catalog list, no reward twice: F&B takes the
  first 4 `fnb_voucher` rewards in the API's order, Travel the first 4 `tour_travel`, then Popular up to 8 from the
  rest: `badge === 'hot'` first, then one from each category in turn, rewards without a known category last. A section
  with no reward is hidden.

**Categories tab:** chips in one scrolling row (`All`, the five categories, `More categories`). Here the top bar scrolls
away and the chips row sticks to the top instead (`data-no-stick` on the header; `.is-stuck` on the chips row once at
the top, giving it a blurred blue band). A category shows its rewards (two per row), then a "More rewards coming soon"
card with a 3D clock. `More categories` shows one centred card: the pile of rewards from the banner
(`assets/images/store/more-rewards.webp`) and "2,000+ rewards on the way".

**Sort** (spec §63): a round button at the right end of the chips row (`.store-sort`, icon `sort` in `icons.svg`); the
chips scroll under a short fade before it, and the whole row (`.store-filters`, which now holds `.store-chips` and the
button) is what sticks. It opens a bottom sheet "Sort by": Coins: low to high, Coins: high to low (none chosen at
first = the catalog's order); tapping one applies it and closes the sheet, tapping the chosen one again takes it off
(back to the catalog's order). Sorting is done in the page on the catalog list
(stable: same price keeps the API's order), for every category; the button is solid once sorted (`.is-on`) and
disabled on More categories. The sheet's rows are the account sheet's `.option` / `.radio`, moved from
`trading-task.css` to `components.css` (same class names, nothing else changes on Earn). Not tracked, by decision.

**No rewards at all** (catalog empty, or the call fails: `rewards = []`): both tabs show only the top bar and a
"Rewards are on their way" card (`store.empty.*`; state `catalog-empty`), and every reward page says "This reward is
no longer available". Neither store page has a loading or error view yet (the spec is silent; ask product); if
`fetchCommon` fails the page stays blank.

**Reward page:** one card: the picture, then parts split by thin lines: category, `Hot` / `New` before the name, the
price; for signed-in users, the balance against the price (how many more, with a bar; or a green tick when enough;
guests see none; the bar's filled part is green, `--ui-progress-done`); "About this reward" (`description`). A Tour & Travel picture is shown 4:3 and cropped
(`.reward-art--trip`). `Checkout` sticks to the bottom. Checkout is not live; it opens a sheet:
- signed in without enough coins: "Not enough coins yet", how many more, and `Learn how to earn coins` → Earn (left
  out when there is no trading task);
- otherwise "Checkout is coming soon" with the 3D clock; guests also get `Sign up` and, lighter, `Log in` (intents
  `signup`, `login`, as in handoff 6).
- A reward id not in the catalog shows "This reward is no longer available".

**Look:**
- Background: deep brand blue, solid at the top and fading down (`--store-bg` in `pages/store.css`); white title on it.
  On Home Store it scrolls with the page; on Categories and the reward page it stays put (`.store-look--fixed`: a
  `position: fixed` layer the width of the page frame).
- Dark mode, every store page (this replaces spec §59's earlier "Home Store only"): square cards, tickets and the
  reward page's card are frosted glass; prices white, with a soft glow behind the coin on cards and tickets.
- `Hot` / `New` label: on the square cards (Popular, Categories) in the picture's top-left corner, square where it
  touches the frame; before the name on the reward page. F&B tickets and Tour & Travel cards have none, on purpose (Travel has
  its Special sash). `Hot` is drawn in the colours of the bottom bar's HOT badge (new tokens, §6).
- The classes on `<body>` that switch the look: `store-look`, `store-tab--home`, `store-tab--rewards`,
  `store-look--fixed` (set by `store.js` / `reward.js`).

**Events:** see §9 (spec §62).

## 3. Catalog: more fields, all rewards (spec §59, §60)

`toRewards` in `shared/api-adapter.js` reads four new fields; `STORE_CATEGORIES` lists the category keys.

| Field | Type | Use |
|---|---|---|
| `category` | `gadget_electronics` \| `tour_travel` \| `shopping_voucher` \| `fnb_voucher` \| `home_living` \| other / null | Store sections and category chips; any other value: in no chip and not in F&B or Travel, shown under "All" and possibly in Popular. Names are copy keys `store.cat.*`. Tour & Travel pictures are cropped (`cover`; 4:3 on the reward page), so they should fill the square; others are shown whole |
| `description` | string \| null | "About this reward" on the reward page (no section when null) |
| `badge` | `"hot"` \| `"new"` \| null | Label on the picture; `hot` rewards come first in Popular |
| `showOnHome` | boolean | Home's grid keeps only these (`toDashboardPage` filters). A reward without the field counts as on Home, so Home keeps working before the backend sends it |

The catalog now sends **every** reward on show for the user's group (about 50), not only Home's. Home still shows the
first 9 rewards with `showOnHome`, or 10 when the "Earn more coins" card is hidden (`GRID_CELLS`, as in handoff 6). No terms field and no money values. Front end: `fetchPage('store')` returns
`{ rewards }` (all of them); `DATA.md` documents `store.rewards[]` and the new dashboard fields.

## 4. HSB's endpoints: `/app/point`, all POST (spec §60)

Confirmed by the Tada integration backend on 22 Oct 2026. **This replaces the paths in `HANDOFF-6.md` §1, §3, §6 and
"Waiting on others".** `HANDOFF.md` in this package is already updated (§5 rows, §6 `redeem` / `reward`, §7 reading
order). The answers' shapes are unchanged.

**Base:** the same host and the same `/pointSys` context path as the loyalty API, so the full address is
`{host}/pointSys/app/point/catalog` (and `/activity`, `/orders`, `/order/detail`, `/redeem/session`).
**Request: exactly like the loyalty API you already call** (corrected 23 Oct 2026 from the backend's delivered code,
spec §65; this replaces "no timestamp"): the same envelope (signed body with `timestamp` in seconds, **required**, and
refused outside a 24-hour window), the same headers: `x-auth-key` (the same static value as the loyalty API's no-login
calls) on every call, without it the answer is `ERROR_EMPTY_AUTH`; signed in, also `authorization` = the app's JWT.
Only the path and the business fields inside the payload differ (table below). `clientId` as in your loyalty
envelope; **guests send `clientId` 0** (null is read the same). QA'd by the Tada integration backend on UAT, 23 Oct
2026 (spec §69).

| Was (handoff 6) | Now |
|---|---|
| `GET /loyalty/catalog?clientId=…` and `GET /loyalty/catalog-guest` (app key) | `POST /app/point/catalog`, `{ clientId }`; **guests send `clientId` 0** (one endpoint: the default group's rewards) |
| `GET /loyalty/activity` | `POST /app/point/activity`, body `{}` (no business field, no clientId, no token needed): a public feed, guests included |
| `GET /loyalty/orders?clientId=…&page=…&pageSize=…` | `POST /app/point/orders`, `{ clientId, pageNo, pageSize }` (**`pageNo`**, from 1; `pageSize` 20 by default, at most 100); only that client's orders |
| `GET /loyalty/orders/{orderReference}` | `POST /app/point/order/detail` (**`order`**, singular), `{ orderReference }` (with `clientId` as in the envelope) |
| `POST /loyalty/redeem/session` (app; app token, **no body**) | `POST /app/point/redeem/session`, `{ clientId }` in the same envelope: the app calls it for the `redeem` / `reward` intents, i.e. whenever Plan B is off |

**Answers, from the backend's DTOs (23 Oct 2026):** every answer is `{ success, code, message, result }`.
- Catalog: as in the samples (§3): exactly `id`, `name`, `points`, `image`, `category`, `description`, `badge`,
  `showOnHome`; no money value. Every enabled reward comes back; `showOnHome` is only for the front end to pick Home's
  rewards. A client group with no programme gets `rewards: []` (Home shows "Find rewards for your coins", the store
  "Rewards are on their way").
- Orders list: `{ orders, page, pageSize, total }`: the **request** says `pageNo`, the **answer** `page`. Each order has
  exactly `orderReference`, `orderNumber`, `status`, `orderDate`, `firstItemName`, `coinSpent`. `coinSpent` is null
  until the order has a coin transaction: no amount is shown (row and detail). `firstItemName` is null when the order
  has no items: the row reads "Reward".
- Dates of the order endpoints (`orderDate`): ISO 8601 UTC, e.g. `"2026-10-23T03:00:00Z"` (confirmed after the
  backend's QA). `apiTime()` in `shared/api-adapter.js` passes ISO through and still reads an older
  `"YYYY-MM-DD HH:mm:ss"` form (as WIB) in case it comes back; Safari cannot parse that form on its own.
- Activity: coin entries `{ type, client, points, at }`, gift entries `{ type, client, reward, at }` (the field that does
  not apply is left out). `client` is always sent, masked (2 first + `***` + 3 last; `***` for ids of 5 characters or
  fewer); the adapter keeps an entry without it and shows `***`, rather than losing it.
- **Order detail** (`order/detail`, spec §66): HSB reads Tada's order live and passes it through:
  `{ status, orderReference, orderNumber, recipient, orderItems, payment, fees }`. `toOrder(detail, summary)` in
  `shared/api-adapter.js` reads it: items from `orderItems` (`itemName`, `itemType`, `quantity`, `status`;
  `egiftDetail` → code / PIN / link / valid until, `vendorDetail.serialNumber` and `vendorMessage` → the PLN or credit
  serial, `tracking` as before; `itemType` `ewallet` is a new kind: label "E-wallet top-up", `item_type` = `ewallet`,
  spec §68); the recipient's name, address and postal code. **Never read** `price`, `fees` or
  `payment` (IDR). The coins, order date and status come from the order's row of `/orders` (`summary`):
  `fetchOrder(ref)` in `shared/data-source.js` keeps the rows shown this session (`rememberOrders`, sessionStorage
  `hsb-loyalty-orders-v1`) and, for an order opened from elsewhere, looks it up in the list (100 a page). No endpoint
  sends when the status last changed or whether coins were refunded: `lastStatusAt` is null and the "Updated …" line
  is hidden; `refunded` is false (no green note). The sample `loyalty-orders-detail.json` now has Tada's shape (with an
  IDR price, to show it is ignored); field names follow Tada's documentation, to be checked on a real order.

In `shared/data-source.js`: `getOrders(path, body)` now takes the path and the body (the demo passes
`{ pageNo, pageSize }` / `{ orderReference }`; the real call wraps it in the loyalty envelope, which adds `clientId` and
`timestamp`);
`rewardsList()` serves Home and the store. The samples keep their old names (`mock/api/loyalty-catalog.json`,
`loyalty-catalog-guest.json` for `clientId` null, `loyalty-orders*.json`, `loyalty-activity.json`).

## 5. Data contract and states

- `DATA.md`: `common.rewardStore`; dashboard `rewards[]` gains `category`, `description`, `badge`, `showOnHome`; new
  page `store` (`rewards[]`, the whole catalog).
- `STATES.md`: shared state `plan-b` on every page (`SHARED_STATES` in `shared/app.js`). New page `store` (also used by
  `reward.html`, through `data-mock="store"` on its `<body>`, read by the demo's state switcher only): `guest`, `empty`,
  `catalog-empty`, `no-travel`, `few-rewards`, `plan-b`.
- **Mock:** the catalog samples hold 51 rewards: Home's 9 (`showOnHome` true, ids 101–109; 104 is now "Da Nang 3D2N
  trip"; 109 has no category, to show the "All only" case) and 42 store-only ones (ids between 110 and 159, not every
  number), each with a category. The guest sample is the same list.

## 6. Tokens and copy

- **New tokens** (`tokens/tokens.json`, `tokens.css` rebuilt): `--ui-hot-deep`, `--ui-hot-red`, `--ui-hot-orange`,
  `--ui-hot-amber`, `--ui-hot-glow`, `--ui-hot-gloss` (the Hot label and the Special sash); `--ui-progress-done`
  (the green filled part of the reward page's balance bar: `#29896e` light, `#37b793` dark).
- **New copy** (`copy/en.json`): `store.*` (top bar, tabs, sections, categories `store.cat.*`, badges, notes, sort
  `store.sort.*`) and
  `reward.*` (the reward page and its sheets), `orders.type.ewallet` ("E-wallet top-up", spec §68). Nothing removed or renamed.

## 7. Images (not in the diff file)

- `assets/images/store/`: `banner.webp`, `store-icon.webp` (3D gift box), `clock.webp` (3D clock),
  `more-rewards.webp` (pile of rewards).
- `assets/images/nav/`: `store-light|dark|on.png`, `rewards-light|dark|on.png` (the store's tab artwork).
- `assets/images/rewards/`: 42 mock pictures numbered between `gift-110` and `gift-159.webp` (not every number;
  Unsplash; sources in `assets/images/rewards/CREDITS.md`, also outside the diff). `gift-04.webp` replaced (Golden Bridge, supplied by the owner; source not
  recorded). In production all reward pictures come from the catalog API.
- **Image weight review (23 Oct 2026).** Every image was measured against its largest size on screen (430px wide
  phone, 3x). Changes:
  - **Reward pictures load lazily:** `loading="lazy" decoding="async"` on the reward `<img>` of the store's cards,
    tickets and trip cards (`pages/store.js`) and of Home's reward cards (`pages/dashboard.js`). Categories used to
    fetch all ~50 pictures at once (about 1 MB); it now fetches the ones near the screen (about 300 KB with the page's
    other images). Keep this in the Next.js version (`next/image` is lazy by default; do not set `priority` on list
    pictures). The reward page's own picture stays eager (it is the page).
  - `assets/images/rewards/*.webp` re-encoded at WebP quality 75 (same size in pixels, no visible change): about
    500 KB less; `assets/images` 2.5 MB → 2.0 MB.
  - `store-icon.webp`: 144px → 72px (it is never shown larger than 24px).
  - Unchanged on purpose: the PNG icons (already small; renaming them would change paths in the code) and two pictures
    a little under 3x because their source files are no bigger (`home/coin-cup.webp`, `store/more-rewards.webp`).
  - **For the catalog API's pictures** (production): a square WebP or JPEG about 600×600px, under about 60 KB each, is
    enough for the cards (shown about 175px wide) and acceptable on the reward page (about 380px wide). Pass this on
    to whoever uploads the catalog pictures.

## 8. Tools

- `mock/api/check.mjs` also checks `store.rewards` and Home's `showOnHome` filter.
- `tools/check-tracking.mjs`: the Home "gate sheet" scenario is unchanged (Plan B off); a new scenario
  (`needs-kyc,plan-b`, Home) checks that Redeem and a reward card still send `loyalty_redeem_click` /
  `loyalty_reward_click` without the sheet's `source` / `from` (links are held back, so the navigation itself is not
  checked). The existing "positions count rewards only" scenario gets a `stay` step, so its click does not navigate.

## 9. Events for the store (spec §62): 38 events

`TRACKING.md` is the contract (new section H, and changed rows); the event documentation for data and marketing is
updated too. `tools/check-tracking.mjs` covers every point below (17 new scenarios).

- **`shared/tracking.js`:**
  - New common parameter `redeem_mode` = `store` | `tada` (from `common.rewardStore`) on every page.
  - New `setPageParams(params)`: changes the page's base parameters after `initTracking` (the store's `view` when the
    tab changes).
  - The click listener now runs in the **capture phase**, so a click carries the page as it was when tapped, before
    the page's own handler changes it. Side effect: on Earn `loyalty_account_select` now comes before the
    `loyalty_upgrade_row_view` it causes. Keep this in the Next.js version.
  - New `priceRange(points)`, `shortRange(coins)` (cut-offs to confirm against the real catalog); new `PARAMS`:
    `section`, `filter`, `category`, `badge`, `outcome`, `price_range`, `short_range`.
- **Pages:** `initTracking('store', …)` with `view` (`home` | `categories` | `empty`) and `entry`;
  `initTracking('reward', …)` with `view` (`detail` | `missing`), `entry` and the reward's parameters (`reward_id`,
  `reward_name`, `category`, `badge`, `price_range`, `affordable` for signed-in users), which every event of the page
  then carries.
- **`entry`** (how the page was reached): `mountStoreLinks` adds `via=<page>_<button>` to the store's and reward page's
  address (`redeemAttrs` now puts `data-from` on store links), and the store's reward links add `via=store`.
  `readEntry()` in `shared/store.js` reads it once and **removes it from the address** (`history.replaceState`), so
  Back from a reward page, the device's back and a reload read `return`; `direct` without a valid `back`. The store's
  `selfHref` drops `via` too.
- **New events:** `loyalty_store_section_view` (`section`, `reward_count`; IntersectionObserver on each section's first
  card, Travel's title; watched again after each render), `loyalty_category_view` (`category`, `from`: `chip` |
  `see_all` sent on every change, `tab` | `page_load` once per category per load; `reward_count`),
  `loyalty_checkout_click` (`outcome`: `not_enough` | `coming_soon` | `guest`, from the same test as the sheets;
  `short_range` with `not_enough`), `loyalty_earn_more_click`.
- **Reused:** `loyalty_reward_click` (store cards, tickets, trip cards: `section`, `filter` on lists, `position` within
  the section, `category`, `badge` = the label the user saw, `price_range`, `affordable`); `loyalty_nav_click` (store bar:
  `store_home` | `categories`, only when the tab changes: the open tab's button has no `data-track`, set in `render()`;
  `back` on the bar and on the reward page's top Back); `loyalty_login_prompt_view`, `loyalty_signup_click`,
  `loyalty_login_click` with `from` / `source` = `checkout` (guests' Checkout); `loyalty_error_view` `error_scope=reward`
  with `reward_count` (missing reward; `0` = catalog empty or failed).
- **Changed on Home:** `loyalty_reward_click` adds `section=home`, `category`, `badge=none`, `price_range`, and **no longer
  sends `affordable` for guests** (it was always `false`). Tracking was not live yet, so no report breaks.
- **GA4, before Plan B is turned on:** register 9 new event-scoped custom dimensions (`redeem_mode`, `entry`, `section`,
  `filter`, `category`, `badge`, `outcome`, `price_range`, `short_range`); mark `loyalty_checkout_click` and
  `loyalty_earn_more_click` as key events. GTM: Data Layer Variables for them; the `^loyalty_` trigger is unchanged.
- **Check tool:** `loyalty_login_prompt_view` and `loyalty_category_view` are now allowed to repeat in one page load
  (an existing bug for the first); new step `scroll-slowly` (screen by screen, so views of middle sections are seen).

## 10. Fixes from the review of your handoff 6 work

The owner's review of the `uat` branch (commit `f63deec`, 21 Oct 2026; code read, UAT opened as a guest) found the
port close to complete and faithful. These need fixing in this round. Paths are in your repository.

1. **No mock data for real users.** `core/data-source/api.ts` hard-codes `LOYALTY_API = { deployed: false }` and
   `GUEST_TASK_FROM_API = false`, so in API mode Home's rewards, the recent activity, the Redemption history (list and
   order details, with sample voucher codes and PINs) and the guests' programme all come from the mock JSON. With the
   `/app/point` endpoints of §4 (and `guest/tradingTask/get` once the backend has it on UAT), call the real APIs and
   remove both switches. Until an endpoint is live, treat it as a failed call, as the reference does: Home's rewards
   empty (the "Find rewards" card), the activity card hidden, the Redemption history's error view. Never show mock
   orders or codes to a real user.
2. **Redemption history loads only one more page** (`HANDOFF-6.md` §6: "the next page on scroll, until `total`").
   `components/molecules/LoadMoreRow/LoadMoreRow.tsx` disconnects its observer after the first hit, and in
   `features/Redemptions/components/OrdersSection/OrdersSection.tsx` the row has no `key`, so it is never attached
   again: page 2 loads, page 3 and later never do (users with more than 40 orders). Key the row on the number of
   orders shown, as Coins already does (`CoinTabs.tsx`: `key={`${tab}-${paging.shown[tab]}`}`).
3. **The expiry rule is always shown** (`HANDOFF-6.md` §7: "left out when `expiryDays` is null").
   `components/molecules/RulesList/RulesList.tsx` renders it unconditionally and `TProgram.expiryDays` is typed
   `number`. Show it only when `expiryDays != null` (type `number | null`), keep the API's null in the adapter, and
   do not fill in 0 when there is no trading task (`core/data-source/api-adapter.ts`).
4. **Page parameters leak between pages in the single-page app** (`TRACKING.md`: parameters are cleared on every
   push). The reference opens each page with a page load, so a page's own base parameters (`view` on Redemption
   history; from this handoff also `view`, `entry` and the reward's parameters on the store and the reward page,
   §9) never reach another page. In your app `view` is not in `PARAMS` (`core/tracking/index.ts`) and GTM's data
   layer keeps the last value: after Redemption history, Coins and Home events still carry `view=list` / `detail`.
   On every route change, clear the previous page's base parameters (push them as `undefined`, or add them to the
   list cleared on every push and send them again with the new page's base).
5. **A page view for each view** (`TRACKING.md`: `loyalty_page_view` once per page load). Opening an order from the
   Redemption history list (and going back) is a new page load in the reference, so it sends `loyalty_page_view`
   with `view=detail` (then `list`). In your app it stays on one route and `useTracking.ts` sends the page view only
   once. Send it on each change between list and detail. The same applies to the store (§9): store → reward page is
   a new page view; the store's own tab switch is not (it only changes `view`, as the reference does with
   `setPageParams`).

**Kept as you did it:** `client_id` with every event of a signed-in user (read from the token, none for guests).
`TRACKING.md` now documents it (spec §67); keep it in the base sent with every push, and clear it when a guest
follows a signed-in session, as you do now.

**To check on a real device (GTM preview), not a confirmed bug:** the Redeem button on the balance card, the "Find
rewards" card and the empty history's Explore use HeroUI `onPress` (fires on pointer up, then `setTimeout(0)` in
`core/redeem-gate/index.ts`), while the tap itself is tracked on the later `click`. On a touch webview the sheet's
`loyalty_login_prompt_view` / `loyalty_join_card_view` could come before `loyalty_redeem_click`; `HANDOFF-6.md` §2 says
the tap is tracked first. Reward cards use a native `onClick` and are fine.

## Left to the developer

- **Status bar colour in a mobile browser:** the strip with the time and signal stays white or black over the store's
  blue. Inside the app's webview the page draws under it (`viewport-fit=cover`), so it depends on how the app sets
  its status bar there. A first try (a `<meta name="theme-color">` in the store's blue, `--accent-surface-brand`, plus
  a matching `html` background) was dropped: it made no visible difference on the owner's phone.

## Waiting on others

- **Backend (Tada integration):** the catalog changes of §3 and the `/app/point` paths of §4, on UAT when the backend
  says so. Headers, envelope and answers are settled (§4). Still open: the order detail's field names checked on a
  real Tada order; the guests' access to `/activity` (being opened by the backend).
- **Do not ship** the `/app/point` paths before the backend has them on UAT.
- **App team, to confirm (from the review, §10):** the app calls `initWebview` also when there is no token (guests);
  otherwise the pages stay on their loading view (seen on UAT opened outside the app). The Deposit intent's
  parameter names (`loginId`, `amount` in `core/webview/intents.ts`) are agreed with them.
- **Product:** the switch `rewardStore` (where it lives, who turns it on); the price / shortfall cut-offs against the
  real catalog; a
  loading / error view for the store pages; final copy for the store; real banner and reward pictures if the mock ones
  are not kept.
