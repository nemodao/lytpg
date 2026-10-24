# Changelog

One entry per handoff to developers, newest first. Each entry says what changed for the user, which files changed,
and whether the data contract (`DATA.md`) or the states (`STATES.md`) changed.

## Handoff 8 — Three languages, a safe Plan B switch, fixes from the review (24 Oct 2026)

**Full description for developers: `HANDOFF-8.md`.** Spec §71–§75.

- The pages come in English, Indonesian and Chinese (Simplified), following the app's language; Indonesian numbers
  and dates (12.450, 19 Okt 2026), Chinese dates (2026年10月19日); times 14:12 everywhere. Reward names,
  descriptions and Terms stay as the backend sends them (Indonesian).
- Plan B switch in Firebase Remote Config: separate UAT and production, waits 3 s, keeps the last value fetched, and
  reads as on when a device has never fetched it (the launch runs Plan B).
- Guests have no trading task for now (no Earn tab, no "Earn more coins" card, a 3-step tour), until the backend's
  guest endpoint is on UAT.
- Reward Store and reward page: loading and error views, with Back always reachable.
- The coin balance shrinks to fit its column instead of running under Redeem.
- Fixes for the developer from the review of the handoff 7 conversion and the UAT check (`HANDOFF-8.md` §5).
- Files: new `copy/id.json`, `copy/zh.json`, `tools/check-copy.py`; changed `shared/app.js`, `shared/data-source.js`,
  `shared/components.js` / `.css`, `shared/store.js`, `shared/date-filter.js`, `pages/store.js`, `pages/reward.js`,
  `pages/redemptions.js`, `copy/en.json` (3 new keys), mock guest states; removed
  `mock/api/guest-tradingTask-get.json`. `DATA.md` unchanged; `STATES.md` changed (`big-balance`, store `loading` /
  `error`, guest descriptions).

## Handoff 7 — Reward Store (Plan B) and the /app/point API (23 Oct 2026)

**Full description for developers: `HANDOFF-7.md`.** Spec §59–§70.

- A browse-only Reward Store in the webview (Home Store and Categories tabs, one page per reward, Checkout "coming
  soon"), behind a switch `common.rewardStore` that is off by default (Plan B, if Tada is not ready).
- With the switch on, Redeem and reward cards open the store, and the recent activity shows coin entries only.
- Fixes for the developer from the review of the handoff 6 conversion: no mock data for real users, history paging,
  expiry rule, page parameters and page views in the single-page app (`HANDOFF-7.md` §10).
- Reward page: the balance bar's filled part is green (new token `--ui-progress-done`, spec §64).
- Images: reward pictures load lazily (the Categories tab fetched all ~50 at once); reward pictures re-encoded
  smaller; store icon resized (`HANDOFF-7.md` §7).
- Categories tab: a sort button at the end of the chips row (coins low to high / high to low; tap the chosen one again to undo; spec §63).
- The catalog sends every reward with `category`, `description`, `badge`, `showOnHome`.
- HSB's endpoints moved to `/app/point`, all POST, in the loyalty API's request envelope (`timestamp` required,
  `x-auth-key` on every call); guests send `clientId` 0; orders take `pageNo`; one order is `POST /app/point/order/detail`
  (Tada's order passed through, joined with its list row; field names to be checked once Tada is live). Settled after
  the backend's QA on UAT (`HANDOFF-7.md` §4, spec §65–§70).
- Redemption history: no amount when an order has no coin transaction yet, "Reward" when it has no item name, an
  "E-wallet top-up" label (`item_type` `ewallet`).
- `client_id` kept on every event of a signed-in user (`TRACKING.md`, spec §67).
- Events for the store: 4 new (38 in all), new parameters, `affordable` no longer sent for guests (`HANDOFF-7.md` §9).
  `DATA.md` and `STATES.md` changed (see `HANDOFF-7.md` §5).
- Files: new `pages/store.*`, `pages/reward.*`, `shared/store.js`, `mock/store.json`, images in `assets/images/store/`,
  `nav/` and `rewards/`; changed `shared/components.js`, `components.css` (`.option` / `.radio` moved from
  `pages/trading-task.css`), `icons.svg` (`sort`), `data-source.js`, `api-adapter.js`, `activity-feed.js`,
  `app.js`, `pages/dashboard.js`, `point-balance.js`, `redemptions.js`, every `mock/*.json`,
  `mock/api/loyalty-catalog*.json`, `mock/api/check.mjs`, `copy/en.json`, `tokens/`, `tools/check-tracking.mjs`,
  `HANDOFF.md`, `TRACKING.md`.

## Handoff 6 — phase 3, replaces handoff 5 (20 Oct 2026)

**Full description for developers: `HANDOFF-6.md`** (everything since handoff 4; exact changes in
`CHANGES-since-handoff-4.diff`). Spec §49–§58. Handoff 5 was sent but not converted: apply this one instead.

- Everything in handoff 5 below: rewards grid on Home, Redeem asks for KYC / first deposit first, recent activity card,
  account tiers on Earn, Redemption history, guest mode, taller sheets, tour fixes.
- Tier label next to "Coin Balance" on Home and Coins; Earn opens on the highest-tier account, and a pick is kept for
  the session. Tier colours are now tokens, one style for the four tiers.
- Sticky header: plain title at the top, a small pill once the page scrolls.
- Dark mode: a faint red sheen behind the bottom bar's Close.
- Recent activity: one-line messages centred.
- Events: 34 (12 new since handoff 4), reviewed screen by screen; `tools/check-tracking.mjs` in the package.
- `DATA.md` and `STATES.md` changed (see `HANDOFF-6.md` §11).

## Handoff 5 — phase 3: rewards on Home, account tiers, Redemption history, guest mode (20 Oct 2026)

**Sent but not converted; replaced by handoff 6** (`HANDOFF-6.md`; `HANDOFF-5.md` is not in the package). Spec §49–§53.

- Home: a rewards grid (with an "Earn more coins" card) replaces the Daily Trading card; a "Looking for something else?" card under it.
- Every Redeem asks users who still need KYC or a first deposit to do that first, in a bottom sheet.
- Recent activity card ("Trader … just redeemed / earned") on Home and Earn, from a new API; hidden when it has no data.
- Earn: account tier label, an upgrade row and a tier sheet with the deposit still needed and the rates of every tier.
- New page: Redemption history (list and order details), from Coins.
- Guest mode: the pages work without a token and ask the user to sign up or log in.
- Bottom sheets grow up to 80% of the screen; the tour skips the Coins tabs step for guests.
- Events: 31 (9 new). New intents for the app: `voucher`, `signup`, `login`; `deposit` carries an account and amount.
- `DATA.md` and `STATES.md` changed.

## Handoff 4 — fixes from the owner's manual test (14 Oct 2026)

**Full description for developers: `HANDOFF-4.md`.** Spec §48.

- Trade buttons open the market; `Open a trading account` opens KYC.
- Terms & Conditions opens in the bottom sheet inside the page (PDF viewer on Android).
- No text selection, long-press menu or link preview.
- The tapping finger stays above the next card.
- Coin glow drawn as a gradient, not a filter.
- Dates always show the year (replaces the handoff 3 rule).
- `DATA.md` and `STATES.md` unchanged.

## Handoff 3 — fixes from the QA with real UAT accounts (14 Oct 2026)

**Full description for developers: `HANDOFF-3.md`.** Spec §47.

- Delayed programme: no "after your first trade" line while coins wait.
- Singular wording: "1 day", "1 minute".
- Dates show the year when it is not the current year.
- Programme ended: only "This program has ended", nothing to tap, on Home and Earn.
- `DATA.md` unchanged. `STATES.md`: new Home state `ended`.

## Handoff 2 — UI changes, API mapping and event tracking (12 Oct 2026)

**Full description for developers: `HANDOFF-2.md`** (what changed since handoff 1, file by file, and the values to map from the API).

Summary:

- "How to start" on the Today card (Home and Earn) for users who still need KYC or a first deposit, with a finger that taps the button. Spec §39.
- `Terms & Conditions` text button under the rules on Earn; opens a PDF in a bottom sheet. Spec §40.
- Button wording: `Verify my account` / `Deposit now` (were `KYC to join` / `Deposit to join`).
- Rates belong to the selected trading account; users without an account see only `70–100 coins per lot` (no rates table, no `See rates`); new no-account card with `Open a trading account` (`data-intent="open-account"`). Spec §42. New preview state `no-account`.
- **Event tracking** (GTM → GA4): 22 events through `shared/tracking.js`; clicks tracked from `data-track` attributes. List in `TRACKING.md`. Spec §46.
- Loading placeholder, failed-to-load card with `Try again`, and 15-row pages with load-on-scroll on the Coins lists. Spec §44. New preview states `loading`, `error`, `more-error`.
- Coins history: one row per credit with its time, not merged; source labels; custom date ranges limited to 30 days. Spec §43.
- No pending coins anywhere; same-day crediting is the default; `Updates within 15 mins`. Spec §41. Preview states `has-pending` and `in-day` removed, `credited` and `delayed` added.
- Sample data: rates 70–100 coins per lot, daily maximum 2,000, all sample amounts rescaled.
- `DATA.md` and `STATES.md` changed: see `HANDOFF-2.md` §3 for the full list of fields and states added and removed.
- The programme fields `rateRange`, `termsUrl`, `minHoldSeconds` are on UAT (12 Oct 2026). Empty values are handled: `termsUrl` null, missing or `""` hides the Terms & Conditions button; `minHoldSeconds` = 0 hides the holding-time rule; `rateRange` null hides the rate range.
- **API mapping done:** `shared/api-adapter.js` (converter), `shared/data-source.js` (two sources; replace `request()` to go live), sample answers and a self-check in `mock/api/`. `?source=api` runs the pages on the samples. See `HANDOFF.md` §5 and `HANDOFF-2.md` §4.

## Handoff 1 — 7 Oct 2026

First handoff: display only, mock data, no API.

- Pages: Home (Dashboard), Earn (Daily Trading), Coins (Coin Balance), bottom bar, guided tour (5 steps).
- Data contract: `DATA.md` (first version). States: `STATES.md`.
- All data access is in `shared/data-source.js`; API mapping points are marked `API:` in the code (list in `HANDOFF.md` §5).
- Not wired: every button with `data-intent` (deeplinks, `HANDOFF.md` §6).
- Not in this phase: daily check-in card (present but off: `checkIn.enabled`), lot detail sheet (spec §18).
