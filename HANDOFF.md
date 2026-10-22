# HSB Loyalty UI — developer handoff

Read this first. It is written for the developers (and their AI assistants) who convert these static pages into the
product's framework now, and who will receive updated drops later (API mapping, design changes).

## 1. What this is

Three mobile tab pages, one page opened from Coins and, in Plan B only, the Reward Store, inside the app's webview, plus a bottom bar and a guided tour:

| Tab | Page | Files |
|---|---|---|
| Home | Dashboard | `pages/dashboard.html` `.js` `.css` |
| Earn | Daily Trading | `pages/trading-task.html` `.js` `.css` |
| Coins | Coin Balance | `pages/point-balance.html` `.js` `.css` |
| (from Coins) | Redemption history | `pages/redemptions.html` `.js` `.css` (no bottom bar; back button in the header) |
| (from Redeem, Plan B only) | Reward Store, one reward | `pages/store.html` `.js` `.css`, `pages/reward.html` `.js` `.css` (own bottom bar; only when `common.rewardStore` is on, `HANDOFF-7.md`) |

No framework, no build step. Each HTML file is an empty shell (`<main id="app">`); the page's `.js` is an ES module that
loads data and renders HTML strings into it. This phase is **display only**: buttons that leave the pages are not wired.

Run it: `python3 -m http.server 8000` in this folder, then open `http://localhost:8000/pages/dashboard.html`
(ES modules and `fetch` need http; opening the file directly will not work).

## 2. Where everything lives

| Need | Look at |
|---|---|
| Product rules and decisions | `spec.md` — sections 1–8 are the original brief, later sections are dated decisions and **the later one wins**. Start with the "How to read this spec" note at the top. |
| Data shapes (the API contract) | `DATA.md` — every field, its type, an example and what it controls |
| Every UI situation to support | `STATES.md` — each named state, what it shows and exactly which data it changes |
| All on-screen text | `copy/en.json` — key → text. No text is written in the JS or HTML. `{name}` = placeholder, `**bold**` = bold |
| Design tokens | `tokens/tokens.json` (source) → `tokens/tokens.css` (generated). Light on `:root`, dark on `[data-theme="dark"]` |
| Images | `assets/images/` (pages), `assets/tour/` (tour). Already sized at 3x their display size |
| What changed since the last drop | `CHANGELOG.md`, `VERSION.txt`, and from the second drop on a `CHANGES-since-handoff-N.diff` |

## 3. How a page is built

```
pages/<page>.js
  load('<page>')                 shared/app.js      -> { common, page, ui }
    fetchCommon / fetchPage ...  shared/data-source.js   (the ONLY data access; mock today, API later)
  render functions               return HTML strings from `common` + `page` + `ui`
  app.innerHTML = ...            one render; pages with local UI state re-render on click
  mountNav / mountTour           shared/nav.js, shared/tour.js
```

- `common` = data shared by all pages; `page` = this page's data. Shapes: `DATA.md`.
- `ui` = helpers only, no data: `ui.t(key, vars)` text, `ui.md` text with bold, `ui.num` (3,100), `ui.lots` (3.5),
  `ui.date` (13 Oct), `ui.dateYear`, `ui.time`, `ui.daysUntil`, `ui.icon(name)` (sprite `shared/icons.svg`), `ui.href(file)`.
- Local UI state is a few `let` variables at the top of each page file (selected tab, open sheet, date range). Convert
  them to component state.

### Component map

| Piece | Where | Notes |
|---|---|---|
| Header, balance block, badge, notice, rules list, coin | `shared/components.js` + `shared/components.css` | Balance block is shared by Home (bare) and Coins (in a card). Rules list is shared by Earn and the tour |
| Bottom bar | `shared/nav.js` | Tabs declared in the `TABS` array |
| Date filter (chips + calendar sheet) | `shared/date-filter.js` | Used by Earn history and Coins Expired/History |
| Recent activity card | `shared/activity-feed.js` | Home and Earn; data from `activityList` in `shared/data-source.js` |
| Account tiers, session account | `shared/tiers.js` | `TIERS`, `chosenAccountId`, `highestTier`; used by Earn, the balance block and the events |
| "How to start" sheet before Redeem; Plan B links | `shared/components.js` | `redeemAttrs`, `mountJoinSheet`, `joinPanel`, `mountStoreLinks` (Plan B) |
| Reward Store top bar, badge, links | `shared/store.js` | `storeHead`, `rewardBadge`, `categoryName`, `backParam`, `withParams`, `rewardHref` |
| Reward Store / one reward | `pages/store.js` / `pages/reward.js` | `arrange`, `homeTab`, `rewardsTab`, `tripPanel`, `voucher`, `card`, own bottom bar / `balanceLine`, `openSheet`, `shortSheet` |
| Guided tour | `shared/tour.js` | Steps declared in the `STEPS` array; spec §38 |
| Home | `pages/dashboard.js` | `rewardsGrid` (`rewardCard`, `earnCard`), `checkInCard` (future, off) |
| Earn | `pages/trading-task.js` | `streakField` (decorative hero), `progressCard` / `endedCard`, `accountsCard`, `upgradeRow`, `upgradeSheet` (tier sheet, `tierTable`), `tradeButton`, `infoCard` (rules/history tabs), `sheet` (account picker) |
| Coins | `pages/point-balance.js` | `availableTab`, `expiredTab`, `historyTab`, `itemRow` |
| Redemption history | `pages/redemptions.js` | order list and one order (`?order=`) |

CSS: `shared/base.css` (frame, fonts, type classes), `shared/components.css` (shared pieces), `pages/<page>.css`
(page only). Every colour, size, radius and spacing is a token (`var(--…)`); keep the token names when converting.

## 4. Markers in the code

Search for these words; they are used consistently.

| Marker | Meaning | What to do |
|---|---|---|
| `API:` | A place that will change when the real API is connected | Convert as is now; revisit when mapping the API (list in §5) |
| `PREVIEW ONLY` | Exists only so states can be previewed (`?state=`) | Do not ship in production; keep in your dev build if useful |
| `DEMO ONLY` | Review aids: the state switcher and "Internal Explanation" pop-ups (`demo/` folder) | Already removed from this handoff package |
| `data-intent="…"` | A button that leaves these pages | Attach the deeplink (§6) |
| `data-tour="…"` | An element the guided tour highlights | Keep the attribute on the converted element |

## 5. Connecting the API (from handoff 2)

The mapping is written. Three pieces:

| Piece | File | What it is |
|---|---|---|
| Converter | `shared/api-adapter.js` | Pure functions that turn the answers of the loyalty endpoints (the six of handoff 2, the guest trading task, and HSB's catalog, activity and orders endpoints under `/app/point`; see `HANDOFF-6.md` and `HANDOFF-7.md` §3–§4) and the two sign-in fields into the shapes in `DATA.md`. No fetch, no DOM. Convert it once to your language and keep it as the single place that knows API field names |
| Data source | `shared/data-source.js` | Calls the endpoints through `request(endpoint, body)` and hands the results to the converter. With `?source=api` it runs on sample answers |
| Sample answers | `mock/api/*.json` | One file per endpoint, in the real response shape (`{ success, code, result, timestamp }`), plus `signin.json` with the two fields read from the app sign-in |

To go live: set `USE_API` to true in `shared/data-source.js` and replace the body of `request()` with the real POST
(the comment above it lists the body fields and the failure rule). Nothing in `pages/` changes.

Check after any change to the converter: `node mock/api/check.mjs` converts the samples and compares the result with
the UI-shaped mock files, key by key.

See the pages running on the API-shaped samples: add `?source=api` to any page address.

What the demo still does in the browser and the product must do with requests:

| Where | Demo | Product |
|---|---|---|
| `shared/data-source.js` — `request` | Reads a sample file, once | POST to the endpoint; throw unless `success === true` |
| `shared/components.js` — `showStatus` | `loading` / `error` come from preview states | Loading until every request of the page has answered; error when one fails; `Try again` repeats them |
| `shared/date-filter.js` — `includes` | Filters the full list in the browser | Send `from` / `to` to `tradingTask/getHistory`, `coin/listExpired`, `coin/ledger` when the range changes (always both; at most 30 days) |
| `pages/point-balance.js` — `loadMore` | Shows 15 more rows of a list it already has | Ask for `pageNo + 1` until the rows shown reach `total` |
| Refresh | None | Call `tradingTask/get` and `coin/summary` again every 2 minutes while Home or Earn is visible, and when the page becomes visible again |
| `shared/app.js` — `common.now` | The mock pins "now" | The converter takes it from the answer's `timestamp` (server time) |
| `shared/data-source.js` — `activityList` | Reads `mock/api/loyalty-activity.json` | `POST /app/point/activity`, asked once per session, waited for at most 3 s (`HANDOFF-6.md` §3) |
| `shared/data-source.js` — `rewardsList`, `fetchMoreOrders` | Read the samples | Catalog (`[]` on failure: Home still opens, the store shows "Rewards are on their way"); orders by `page` / `pageSize` (`HANDOFF-6.md` §1, §6; paths since `HANDOFF-7.md` §4) |
| `shared/data-source.js` — `REWARD_STORE` | `false` | Plan B switch, a setting on HSB's side (`HANDOFF-7.md` §1) |
| `shared/tour.js` — `seen` / `markSeen` | "Tour seen" kept in localStorage | Per-user flag from the app, if wanted |
| `pages/trading-task.js` — `selectedAccountId` | The tie-break for the account the pages open on (`shared/tiers.js`) | Unchanged: picking an account is kept for the session only; the app switches account on the trade button (`HANDOFF-6.md` §4) |

Not sent by the loyalty API, fixed in the UI (`UI_CONSTANTS` in the converter): 15 minutes for coins to arrive, the
10-day expiry warning, the 00:00 start of an earning day. Dates are formatted in GMT+7 (WIB), the programme's time
zone (`program.tzMinutes` = 420); if a programme ever uses another zone, change `WIB` in `shared/app.js` and the
`tz` copy key.

The programme fields `rateRange`, `termsUrl` and `minHoldSeconds` are on UAT since 12 Oct 2026. Each can be
empty: `rateRange` null (no rate range line), `termsUrl` null or an empty string (no Terms & Conditions button),
`minHoldSeconds` 0 (no holding-time rule).

## 6. Buttons that leave the pages (`data-intent`)

| `data-intent` | Destination |
|---|---|
| `redeem` | Tada (rewards store). Plan B off (`common.rewardStore` false, the default): the webview only tells the app; the **app** calls `POST /app/point/redeem/session` (body `{ clientId }`, app token) and opens `result.url` (a Tada SSO link, valid about 300 s) in its in-app webview, not an outside browser. Plan B on: not sent; Redeem opens `store.html` inside the webview (`HANDOFF-7.md` §1) |
| `reward` | Plan B off: the same as `redeem` (the Tada catalog): `data-reward` is HSB's own key for the card, not a Tada link. Plan B on: not sent; the card opens `reward.html?id=…` inside the webview |
| `trade` | Market screen, current trading account |
| `trade-account` (+ `data-account`) | Market screen, switched to that account |
| `kyc` | KYC screen in the app |
| `signup` | Guest mode (spec §53): the app's sign-up screen `/sign-up` |
| `login` | Guest mode: the app's log-in screen `/login` |
| `voucher` (+ `data-url`) | Redemption history (spec §52): opens the voucher's link, like `terms` (the app's link viewer) |
| `deposit` | Deposit screen in the app. From the tier sheet (spec §51) it also carries `data-account` (the account) and `data-amount` (USD still needed to reach the next tier, whole dollars, rounded up; absent when nothing is missing), so the Deposit screen opens on that account with the amount filled in. The parameter names on the app side are to be agreed with the app team |
| `open-account` (handoff 2) | The KYC screen of the app (since handoff 4: completing KYC creates the live account) |
| `checkin` | Check in (future feature) |
| `exit` | Close the webview |

## 7. Receiving the next drop

**Already converted an earlier handoff? Read the `HANDOFF-<n>.md` files after yours instead of this file:** each
lists only what changed since the handoff before it (`HANDOFF-2.md`, `HANDOFF-3.md`, `HANDOFF-4.md`), except
`HANDOFF-6.md`, which covers everything since handoff 4 (handoff 5 was folded into it and is not in the package), then
`HANDOFF-7.md`.

Each drop is a complete copy of this folder with a higher number in `VERSION.txt`.

1. Read the new entry in `CHANGELOG.md`: it lists what changed for the user, which files changed, and whether
   `DATA.md` or `STATES.md` changed.
2. Open `CHANGES-since-handoff-<N>.diff` (included from the second drop): the exact line changes since your last copy.
3. Apply those changes to the matching components. Keep a note of which of your components came from which file here;
   the component map in §3 is the starting point.
4. A drop that only maps the API is expected to touch `shared/data-source.js`, the places marked `API:` and `DATA.md`.
   Anything else it touches is listed in the changelog.

File names, function names, CSS class names, copy keys, `data-intent` and `data-tour` values are kept stable between
drops, so diffs stay small and searchable.
