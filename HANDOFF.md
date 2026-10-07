# HSB Loyalty UI — developer handoff

Read this first. It is written for the developers (and their AI assistants) who convert these static pages into the
product's framework now, and who will receive updated drops later (API mapping, design changes).

## 1. What this is

Three mobile pages that run inside the app's webview, plus a bottom bar and a guided tour:

| Tab | Page | Files |
|---|---|---|
| Home | Dashboard | `pages/dashboard.html` `.js` `.css` |
| Earn | Daily Trading | `pages/trading-task.html` `.js` `.css` |
| Coins | Coin Balance | `pages/point-balance.html` `.js` `.css` |

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
- `ui` = helpers only, no data: `ui.t(key, vars)` text, `ui.md` text with bold, `ui.num` (12,450), `ui.lots` (3.5),
  `ui.date` (13 Oct), `ui.dateYear`, `ui.time`, `ui.daysUntil`, `ui.icon(name)` (sprite `shared/icons.svg`), `ui.href(file)`.
- Local UI state is a few `let` variables at the top of each page file (selected tab, open sheet, date range). Convert
  them to component state.

### Component map

| Piece | Where | Notes |
|---|---|---|
| Header, balance block, badge, notice, rules list, coin | `shared/components.js` + `shared/components.css` | Balance block is shared by Home (bare) and Coins (in a card). Rules list is shared by Earn and the tour |
| Bottom bar | `shared/nav.js` | Tabs declared in the `TABS` array |
| Date filter (chips + calendar sheet) | `shared/date-filter.js` | Used by Earn history and Coins Expired/History |
| Live activity line | `shared/live-feed.js` | See §5 |
| Guided tour | `shared/tour.js` | Steps declared in the `STEPS` array; spec §38 |
| Home | `pages/dashboard.js` | `taskCard`, `checkInCard` (future, off), `reward` tiles |
| Earn | `pages/trading-task.js` | `streakField` (decorative hero), `progressCard` / `endedCard`, `accountsCard`, `tradeButton`, `infoCard` (rules/history tabs), `sheet` (account picker) |
| Coins | `pages/point-balance.js` | `availableTab`, `expiredTab`, `historyTab`, `itemRow` |

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

## 5. Connecting the API later

All data enters through **`shared/data-source.js`**. Make `fetchCommon()` and `fetchPage(page)` return the shapes in
`DATA.md` and the pages work unchanged. Where the API's shape differs, adapt it inside `data-source.js` (or your
equivalent service layer), not in the components.

Other places marked `API:`:

| Where | Today (demo) | With the API |
|---|---|---|
| `shared/app.js` — `common.now` | The mock pins "now" so the demo never changes | Send the server time, or use the device clock |
| `shared/live-feed.js` — `entryAt` | Entries are invented from a clock-seeded generator | Replace with the server's feed; keep `isOpen` (window: Sunday 17:00 – Friday 17:00 UTC) and the markup |
| `shared/tour.js` — `seen` / `markSeen` | "Tour seen" kept in localStorage | Per-user flag from the app or API, if wanted |
| `shared/date-filter.js` — `includes` | Filters the full list in the browser | Ask the API by date range if lists get long |
| `pages/point-balance.js` — `items` | Lots split over `items`, `pendingItems`, `usedItems` for preview states | One `items` list from the API |
| `pages/trading-task.js` — `selectedAccountId` | Account switch is local to the page | Tell the app which account to trade with |

Rules that are computed in the page from data (not sent by the API): which tab a lot belongs to and "expiring soon"
(`pages/point-balance.js`, top of file; spec §17, §36), the highest rate for the tour, in-day history rows
(`pages/trading-task.js` `historyList`). If the API later sends these directly, simplify there.

## 6. Buttons that leave the pages (`data-intent`)

| `data-intent` | Destination |
|---|---|
| `redeem` | Tada (rewards store) |
| `reward` | That reward in Tada |
| `trade` | Market screen, current trading account |
| `trade-account` (+ `data-account`) | Market screen, switched to that account |
| `kyc` | KYC screen in the app |
| `deposit` | Deposit screen in the app |
| `checkin` | Check in (future feature) |
| `exit` | Close the webview |

## 7. Receiving the next drop

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
