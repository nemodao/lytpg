# Handoff 7 — what changed since handoff 6

**Who this is for:** developers (and their AI assistants) who have already applied handoff 6, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §59–§61. Exact line changes: `CHANGES-since-handoff-6.diff`
in the package (images are not in it: see §7).

This is an **early handoff**: the Reward Store's UI is done, sent before the backend has delivered the API changes it
reads (§3, §4). The pages already run on sample answers in `mock/api/`.

**In one line:** a browse-only Reward Store inside the webview ("Plan B", in case the Tada integration is not ready for
launch), behind a switch that is **off by default**; and HSB's own endpoints (the Tada integration backend: catalog,
activity, orders, redeem session; not the loyalty API under `/pointSys/app/point/`) moved to `/app/point`, all POST.

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

**Addresses:** `store.html?tab=rewards&cat=<category key>|more&back=<page>` (no `tab` = Home Store; no `cat` = All;
`tab=rewards` is the **Categories** tab: id `rewards` everywhere in code, copy key `store.tab.rewards`, artwork
`nav/rewards-*.png`, class `.store-tab--rewards`) and `reward.html?id=<id>&back=<page>`.
- The store keeps its tab and category in the address (`history.replaceState`), so a reward's Back returns to the
  same view. It rewrites only `tab`, `cat` and `back` and keeps every other parameter.
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

**No rewards at all** (catalog empty, or the call fails: `rewards = []`): both tabs show only the top bar and a
"Rewards are on their way" card (`store.empty.*`; state `catalog-empty`), and every reward page says "This reward is
no longer available". Neither store page has a loading or error view yet (the spec is silent; ask product); if
`fetchCommon` fails the page stays blank.

**Reward page:** one card: the picture, then parts split by thin lines: category, `Hot` / `New` before the name, the
price; for signed-in users, the balance against the price (how many more, with a bar; or a green tick when enough;
guests see none); "About this reward" (`description`). A Tour & Travel picture is shown 4:3 and cropped
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
  touches the frame; before the name on the reward page. F&B tickets and Tour & Travel cards have none (Travel has its
  Special sash). `Hot` is drawn in the colours of the bottom bar's HOT badge (new tokens, §6).
- The classes on `<body>` that switch the look: `store-look`, `store-tab--home`, `store-tab--rewards`,
  `store-look--fixed` (set by `store.js` / `reward.js`).

**Events:** `store.html` and `reward.html` send **no events at all**: they do not call `initTracking`, so no
`loyalty_page_view`, and the reward sheet's Sign up / Log in send no `loyalty_signup_click` / `loyalty_login_click`.
If your layout sends page views for every route, leave the store routes out until store events are specified (a later
round; spec §59). With Plan B on, the Loyalty pages still send what they did: `loyalty_redeem_click` (Redeem on Home
and Coins, `Explore rewards` on the empty Redemption history), `loyalty_reward_click` (Home's reward cards),
`loyalty_card_click` `target=rewards` (`Explore all rewards`), without the sheet's `source` / `from`; the "How to
start" sheet events are no longer sent from those buttons.

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
order). The answers' shapes are unchanged. These endpoints sit without the loyalty API's `/pointSys` prefix.

| Was (handoff 6) | Now |
|---|---|
| `GET /loyalty/catalog?clientId=…` and `GET /loyalty/catalog-guest` (app key) | `POST /app/point/catalog`, body `{ clientId }`; **guests send `clientId` null** (one endpoint: the default group's rewards). Signed in: app token. Guests have no token: which header they send is to be confirmed (see "Waiting on others") |
| `GET /loyalty/activity` | `POST /app/point/activity`, `x-auth-key` header only (no token, no clientId) |
| `GET /loyalty/orders?clientId=…&page=…&pageSize=…` | `POST /app/point/orders`, body `{ clientId, page, pageSize }` |
| `GET /loyalty/orders/{orderReference}` | `POST /app/point/orders/detail`, body `{ orderReference }` |
| `POST /loyalty/redeem/session` (app; app token, **no body**) | `POST /app/point/redeem/session`, now with a body `{ clientId }`: the app calls it for the `redeem` / `reward` intents, i.e. whenever Plan B is off |

In `shared/data-source.js`: `getOrders(path, body)` now takes the path and the body (the demo passes
`{ page, pageSize }` / `{ orderReference }`; the real call adds the user's `clientId` to the list's body);
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
  `--ui-hot-amber`, `--ui-hot-glow`, `--ui-hot-gloss` (the Hot label and the Special sash).
- **New copy** (`copy/en.json`): `store.*` (top bar, tabs, sections, categories `store.cat.*`, badges, notes) and
  `reward.*` (the reward page and its sheets). Nothing removed or renamed.

## 7. Images (not in the diff file)

- `assets/images/store/`: `banner.webp`, `store-icon.webp` (3D gift box), `clock.webp` (3D clock),
  `more-rewards.webp` (pile of rewards).
- `assets/images/nav/`: `store-light|dark|on.png`, `rewards-light|dark|on.png` (the store's tab artwork).
- `assets/images/rewards/`: 42 mock pictures numbered between `gift-110` and `gift-159.webp` (not every number;
  Unsplash; sources in `assets/images/rewards/CREDITS.md`, also outside the diff). `gift-04.webp` replaced (Golden Bridge, supplied by the owner; source not
  recorded). In production all reward pictures come from the catalog API.

## 8. Tools

- `mock/api/check.mjs` also checks `store.rewards` and Home's `showOnHome` filter.
- `tools/check-tracking.mjs`: the Home "gate sheet" scenario is unchanged (Plan B off); a new scenario
  (`needs-kyc,plan-b`, Home) checks that Redeem and a reward card still send `loyalty_redeem_click` /
  `loyalty_reward_click` without the sheet's `source` / `from` (links are held back, so the navigation itself is not
  checked). The existing "positions count rewards only" scenario gets a `stay` step, so its click does not navigate.

## Left to the developer

- **Status bar colour in a mobile browser:** the strip with the time and signal stays white or black over the store's
  blue. Inside the app's webview the page draws under it (`viewport-fit=cover`), so it depends on how the app sets
  its status bar there. A first try (a `<meta name="theme-color">` in the store's blue, `--accent-surface-brand`, plus
  a matching `html` background) was dropped: it made no visible difference on the owner's phone.

## Waiting on others

- **Backend (Tada integration):** the catalog changes of §3 and the `/app/point` paths of §4, on UAT when the backend
  says so. To confirm: which header guests send to `POST /app/point/catalog` (they have no app token); the base URL of
  the `/app/point` endpoints; whether their bodies take a `timestamp` like the loyalty API's.
- **Do not ship** the `/app/point` paths before the backend has them on UAT.
- **Product:** the switch `rewardStore` (where it lives, who turns it on); events for the store (a later round); a
  loading / error view for the store pages; final copy for the store; real banner and reward pictures if the mock ones
  are not kept.
