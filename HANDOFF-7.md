# Handoff 7 — what changed since handoff 6

**Who this is for:** developers (and their AI assistants) who have already applied handoff 6, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §59–§61. Exact line changes: `CHANGES-since-handoff-6.diff`
in the package (images are not in it: see §7).

This is an **early handoff**: the Reward Store's UI is done, sent before the backend has delivered the API changes it
reads (§5). The pages already run on sample answers in `mock/api/`.

**In one line:** a browse-only Reward Store inside the webview ("Plan B", in case the Tada integration is not ready for
launch), behind a switch that is **off by default**; and HSB's own endpoints moved to `/app/point`, all POST.

---

## 1. Plan B is a switch: `common.rewardStore` (spec §61)

- **New field** `common.rewardStore` (boolean, **false by default**). It is a setting on HSB's side, not from the
  loyalty API: `REWARD_STORE` in `shared/data-source.js` (marked `API:`). Preview: shared state `plan-b` ("Plan B:
  Reward Store"), in every page's mock file.
- **Off (default):** nothing changes from handoff 6. Redeem buttons send the Tada intents (`redeem`, `reward`);
  users who still need KYC or a first deposit get the "How to start" sheet.
- **On:**
  - Redeem, `Explore all rewards` and the empty Redemption history's `Explore rewards` open `store.html`; a reward card
    on Home opens `reward.html?id=…`. For everyone: guests and users who still need KYC or a deposit can browse too.
    Only a guest's balance and `Redemption history` still open the sign-up sheet.
  - The recent activity card (Home, Earn) shows coin entries only: nothing can be redeemed yet
    (`createActivityFeed` in `shared/activity-feed.js` filters `type === 'coin'`).
- **Code:** `redeemAttrs(common, intent, from)` in `shared/components.js` now checks `common.rewardStore`; with it on it
  gives `data-action="store" data-store="redeem|reward"`. New `mountStoreLinks(ui, app)` (called once per page on Home,
  Coins and Redemption history, next to `mountJoinSheet`) does the navigation: it opens the store or the reward's page
  with `back=<this page and its query>`, so the store's Back returns here. In the app, the webview simply navigates; no
  deeplink is involved.

## 2. New pages: the Reward Store (spec §59)

`pages/store.html` / `.js` / `.css` (the store, two tabs) and `pages/reward.html` / `.js` / `.css` (one reward). New
shared module `shared/store.js` (`storeHead`, `rewardBadge`, `categoryName`, `backParam`, `withParams`,
`rewardHref`). Both pages read `fetchPage('store')` (§5).

**Addresses:** `store.html?tab=home|rewards&cat=<category>|all|more&back=<page>` and `reward.html?id=<id>&back=<page>`.
The store keeps its tab and category in the address (`history.replaceState`), so a reward's Back returns to the same
view. `back` always holds the page one step back (the store passes its own address on to the reward page).

**Top bar** (`storeHead`, both pages): the store's icon (a 3D gift box in a white round badge), "Reward Redemption" and
the balance in one pill with a thin line between the coin and the number. It sticks and shrinks on scroll like
Loyalty's header: `watchHeader()` in `shared/components.js` now also handles `.store-head` and is exported; once stuck
the badge melts away, the gift and title become one pill, and the three pills (back / title / balance) have the same
height. On the reward page a back button replaces the icon.

**Bottom bar** (built in `pages/store.js`, not `shared/nav.js`): Back on the left (where Loyalty has its Close; it goes
to `back`), then the tabs **Home Store** and **Categories**, with 3D artwork like Loyalty's tabs
(`assets/images/nav/store-*.png`, `rewards-*.png`: light, dark, on). The tabs switch in the page, without a reload.

**Home Store tab:**
- Banner (`assets/images/store/banner.webp`, decorative, deep navy) with two lines of text over it.
- **Popular Rewards:** 8 rewards in one row that scrolls sideways.
- **F&B e-Vouchers:** 4 rewards as tickets (picture, name, a dashed cut with two real round notches, made with a CSS
  mask, and the price).
- **Tour & Travel:** a promo panel on the tokens' purple blend (`.blend-pink`) with soft gold rays, an outlined title
  and a ribbon; 4 cards in a sideways row (about 1.7 on screen), each drawn tilted over a purple layer, with a
  "Special" sash (fixed in the front end) and the price under the name; `See all` on the panel's bottom edge.
- `See all` opens the Categories tab on that category (Popular: "All").
- **Filling the sections** (`arrange` in `pages/store.js`), from the one catalog list, no reward twice: F&B takes the
  first 4 `fnb_voucher` rewards in the API's order, Travel the first 4 `tour_travel`, then Popular 8 from the rest:
  `badge === 'hot'` first, then one from each category in turn. A section with no reward is hidden.

**Categories tab:** chips in one scrolling row (`All`, the five categories, `More categories`). Here the top bar scrolls
away and the chips row sticks to the top instead (`data-no-stick` on the header; `.is-stuck` on the chips row once at
the top, giving it a blurred blue band). A category shows its rewards (two per row), then a "More rewards coming soon"
card with a 3D clock. `More categories` shows one centred card: the pile of rewards from the banner
(`assets/images/store/more-rewards.webp`) and "2,000+ rewards on the way".

**Reward page:** one card: the picture, then parts split by thin lines: category, `Hot` / `New` before the name, the
price; the balance against the price (how many more, with a bar; or a green tick when enough); "About this reward"
(`description`). `Checkout` sticks to the bottom. Checkout is not live; it opens a sheet:
- signed in without enough coins: "Not enough coins yet", how many more, and `Learn how to earn coins` → Earn (left
  out when there is no trading task);
- otherwise "Checkout is coming soon" with the 3D clock; guests also get `Sign up` and, lighter, `Log in` (intents
  `signup`, `login`, as in handoff 5/6).
- A reward id not in the catalog shows "This reward is no longer available".

**Look:**
- Background: deep brand blue, solid at the top and fading down (`--store-bg` in `pages/store.css`); white title on it.
  On Home Store it scrolls with the page; on Categories and the reward page it stays put (`.store-look--fixed`: a
  `position: fixed` layer the width of the page frame).
- Dark mode, every store page: reward cards, tickets and the reward page's card are frosted glass; prices white, the coin
  with a soft glow.
- `Hot` / `New` label: in the picture's top-left corner, square where it touches the frame. `Hot` is drawn in the colours
  of the bottom bar's HOT badge (new tokens, §6).
- The classes on `<body>` that switch the look: `store-look`, `store-tab--home`, `store-tab--rewards`,
  `store-look--fixed` (set by `store.js` / `reward.js`).

**Events:** none for the store yet (a later round; spec §59). The existing `loyalty_redeem_click` and
`loyalty_reward_click` are still sent from Home and Coins when Plan B is on.

## 3. Catalog: more fields, all rewards (spec §59, §60)

`toRewards` in `shared/api-adapter.js` reads four new fields; `STORE_CATEGORIES` lists the category keys.

| Field | Type | Use |
|---|---|---|
| `category` | `gadget_electronics` \| `tour_travel` \| `shopping_voucher` \| `fnb_voucher` \| `home_living` \| other / null | Store sections and category tabs; any other value: shown under "All" only. Names are copy keys `store.cat.*` |
| `description` | string \| null | "About this reward" on the reward page (no section when null) |
| `badge` | `"hot"` \| `"new"` \| null | Label on the picture; `hot` rewards come first in Popular |
| `showOnHome` | boolean | Home's grid keeps only these (`toDashboardPage` filters) |

The catalog now sends **every** reward on show for the user's group (about 50), not only Home's. Home still shows the
first 9 (or 10) of those with `showOnHome`. No terms field and no money values. Front end: `fetchPage('store')` returns
`{ rewards }` (all of them); `DATA.md` documents `store.rewards[]` and the new dashboard fields.

## 4. HSB's endpoints: `/app/point`, all POST (spec §60)

Confirmed by the Tada integration backend on 22 Oct 2026. **This replaces the paths in `HANDOFF-6.md` §1, §3, §6 and
`HANDOFF.md` §6.** The answers' shapes are unchanged.

| Was (handoff 6) | Now |
|---|---|
| `GET /loyalty/catalog?clientId=…` and `GET /loyalty/catalog-guest` | `POST /app/point/catalog`, body `{ clientId }`, app token; **guests send `clientId` null** (one endpoint: the default group's rewards) |
| `GET /loyalty/activity` | `POST /app/point/activity`, `x-auth-key` header only (no token, no clientId) |
| `GET /loyalty/orders?clientId=…&page=…&pageSize=…` | `POST /app/point/orders`, body `{ clientId, page, pageSize }` |
| `GET /loyalty/orders/{orderReference}` | `POST /app/point/orders/detail`, body `{ orderReference }` |
| `POST /loyalty/redeem/session` (app) | `POST /app/point/redeem/session`, body `{ clientId }` (only when checkout goes live through Tada) |

In `shared/data-source.js`: `getOrders(path, body)` now takes the path and the body; `rewardsList()` serves Home and the
store. `mock/api/loyalty-catalog-guest.json` stays as the sample of the answer for `clientId` null.

## 5. Data contract and states

- `DATA.md`: `common.rewardStore`; dashboard `rewards[]` gains `category`, `description`, `badge`, `showOnHome`; new
  page `store` (`rewards[]`, the whole catalog).
- `STATES.md`: shared state `plan-b` on every page (`SHARED_STATES` in `shared/app.js`). New page `store` (also used by
  `reward.html`, through `data-mock="store"` on its `<body>`, read by the demo's state switcher only): `guest`, `empty`,
  `catalog-empty`, `no-travel`, `few-rewards`, `plan-b`.
- **Mock:** the catalog samples hold 51 rewards: Home's 9 (reward 104 is now "Da Nang 3D2N trip") and 42 more, one
  category each but one with none (reward 109, to show the "All only" case).

## 6. Tokens and copy

- **New tokens** (`tokens/tokens.json`, `tokens.css` rebuilt): `--ui-hot-deep`, `--ui-hot-red`, `--ui-hot-orange`,
  `--ui-hot-amber`, `--ui-hot-glow`, `--ui-hot-gloss` (the Hot label and the Special sash).
- **New copy** (`copy/en.json`): `store.*` (top bar, tabs, sections, categories `store.cat.*`, badges, notes) and
  `reward.*` (the reward page and its sheets). Nothing removed or renamed.

## 7. Images (not in the diff file)

- `assets/images/store/`: `banner.webp`, `store-icon.webp` (3D gift box), `clock.webp` (3D clock),
  `more-rewards.webp` (pile of rewards).
- `assets/images/nav/`: `store-light|dark|on.png`, `rewards-light|dark|on.png` (the store's tab artwork).
- `assets/images/rewards/gift-110` … `gift-159.webp`: mock pictures (Unsplash; sources in
  `assets/images/rewards/CREDITS.md`). `gift-04.webp` replaced (Golden Bridge, supplied by the owner; source not
  recorded). In production all reward pictures come from the catalog API.

## 8. Tools

- `mock/api/check.mjs` also checks `store.rewards` and Home's `showOnHome` filter.
- `tools/check-tracking.mjs`: the Home "gate sheet" scenario is unchanged (Plan B off); a new scenario checks Plan B
  (`needs-kyc,plan-b`: Redeem and a reward card still send their events and go to the store).
- `tools/build-offline.py` includes the two new pages.

## Left to the developer

- **Status bar colour in a mobile browser:** the strip with the time and signal stays white or black over the store's
  blue. Inside the app's webview the page draws under it (`viewport-fit=cover`), so it depends on how the app sets
  its status bar there. A first try with `theme-color` was dropped (see the reverted commit `78a10b4` for the idea).

## Waiting on others

- **Backend (Tada integration):** the catalog changes of §3 and the `/app/point` paths of §4, on UAT when the backend
  says so.
- **Product:** the switch `rewardStore` (where it lives, who turns it on); events for the store (a later round); final
  copy for the store; real banner and reward pictures if the mock ones are not kept.
