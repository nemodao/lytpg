# Handoff 8 — what changed since handoff 7 (in progress)

**Who this is for:** developers (and their AI assistants) who have already applied handoff 7, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §71 on. Exact line changes:
`CHANGES-since-handoff-7.diff` in the package.

---

## 1. The coin balance shrinks to fit (spec §71)

The balance number in the balance block (Home, and the card on Coins) stays on one line in the room its column leaves
next to `Redeem`. When the number is wider than that room (a very large balance, a narrow screen, or Coins, where the
"Redemption history" link makes the right side wider), the whole number shrinks by the ratio that makes it fit, with
no lower limit. It never wraps, is never cut and never runs under `Redeem`. Normal balances are unchanged.

- **Code:** `watchBalanceNumber` / `fitBalanceNumber` in `shared/components.js`, called from `balanceBlock` on the
  next frame. `fitBalanceNumber` clears `--balance-fit`, measures `clientWidth / scrollWidth` of `.balance-number`
  and, below 1, sets `--balance-fit` (rounded down to 0.01). CSS (`shared/components.css`): `.balance-number` has
  `white-space: nowrap; zoom: var(--balance-fit, 1)`, the same technique as the tier label (`--tier-fit`).
- **Measured again** when the column changes size (a `ResizeObserver` on the number's column: rotation), once the web
  font has loaded (`document.fonts.ready`), and whenever the number's text changes (a `MutationObserver`: the guided
  tour's step 3 counts the balance up). In React, a `useLayoutEffect` keyed on the value plus a `ResizeObserver` on
  the column does the same.
- **Preview:** new shared state `big-balance` (balance 9,876,543,210) on Home and Coins (`SHARED_STATES` in
  `shared/app.js`).
- Not changed: the small balance pill at the top of the Reward Store.

## 2. Guests have no trading task, for now (spec §72)

This is what your commit `bf4222e` already does; the reference now matches it. Keep it as it is, with one fix:

- **Reference:** `shared/data-source.js` no longer calls `guest/tradingTask/get`; a guest's programme is
  `{ ...toProgram(null, null), joinRequirement: 'signup' }`, `accounts` [], `now` from the device.
  `mock/api/guest-tradingTask-get.json` is gone. The `guest` preview state on every page now carries the programme a
  guest gets (`tradingTask: false`, every programme field null), so the mock looks like the API.
- **Rules list** (`rulesList` in `shared/components.js`): the crediting rule is left out when `program.creditMode` is
  missing. Before, a programme without a trading task read "Coins are credited null days after the trading day" on
  Earn opened directly. In yours, `toProgram(null, null)` fills in made-up values (credit in-day within 15 minutes):
  leave the rule out instead, as here.
- `TRACKING.md`: `has_task` is always `false` for guests for now.

## 3. The Reward Store and a reward's page: loading and failed to load (spec §73)

You already added these two views (`StoreContainer.tsx`, `RewardContainer.tsx`); the reference now has them too.
What to change in yours: **Back must stay.**

- **Store:** the bottom bar stays under the placeholder or the error card, with Back (to the `back` page) and the two
  tabs; the open tab is marked, the tabs do nothing until the data is there. Yours has no bottom bar on these views,
  so a user on the error card cannot leave except with the device's back, which goes to `/home`.
- **A reward's page:** no bottom bar, so Back is in the top bar (as on an order's details).
- The top bar leaves out the balance pill on both views (`storeHead(ui, common, { balance: false })` in
  `shared/store.js`).
- Error card and events as on the other pages (§44): `loyalty_error_view` with `error_scope` = `page`; the reward's
  own `error_scope` = `reward` (unknown id) is not sent on these views.
- **Rule for any page:** Back goes in the bottom bar only when the page has one, otherwise at the top left.
- Preview: states `loading` and `error` in `mock/store.json` (both pages).

## 4. The Plan B switch in Firebase Remote Config (spec §74)

Firebase Remote Config for the switch is accepted. Three changes in `core/remote-config/index.ts`:

1. **Separate UAT and production.** `.env.uat` and `.env.prod` point at the same Firebase project and app, and both
   read `reward_store`, so turning Plan B on to test it on UAT turns it on for real users. Give UAT its own switch
   (for example the key `reward_store_uat`, the key name set per environment in `.env.*`, or a separate Firebase
   project), and tell the owner which one to use for testing.
2. **Wait 3 seconds** (`REMOTE_CONFIG_WAIT_MS` 1500 → 3000, and `fetchTimeoutMillis`).
3. **On a timeout or an error, use the last value the device fetched,** not `false`: the SDK keeps the last activated
   values in IndexedDB (`await ensureInitialized(config)`, then `getValue`). `false` only when nothing has ever been
   fetched. Today a slow network turns Plan B off for that visit and sends Redeem to Tada, even when the device
   already has `true`.

Also correct the comment at the top of the file: a change on the console reaches a user on the next full open of the
pages after the fetch interval, not "within that time".

## 5. Fixes from the review of your handoff 7 work

The owner's review of the `uat` branch (commit `bf4222e`, 24 Oct 2026, code read only) found the store, the reward
page, the `/app/point` endpoints and the fixes of `HANDOFF-7.md` §10 faithful. Besides §2–§4 above:

1. **`loyalty_category_view` is sent again without a tap** (`features/Store/components/StoreContainer.tsx`, the
   effect that sends it). Its dependencies include `data`; SWR refetches when the webview comes back to the
   foreground (`revalidateOnFocus` in `core/network/swr.ts`), and in API mode each answer is a new object (the
   server time, the activity), so the effect runs again and sends a duplicate for `from` = `chip` or `see_all` (the
   two that are not deduped). In the reference it is sent only after a chip, See all or tab tap. Depend on
   `Boolean(data)` instead of `data`.
2. **To check on a phone** (not confirmed by reading the code):
   - A guest's Checkout on a reward's page: `loyalty_login_prompt_view` must come after `loyalty_checkout_click`.
     The sheet opens from HeroUI `onPress` (+ `setTimeout`), the click is tracked on the native `click`; on a touch
     screen the order may flip. If it does, open the sheet from a native `onClick`, as the reward cards do.
   - Categories lists about 50 `next/link`s to `/reward?id=…`: check in a production build that they are not all
     prefetched (if they are, `prefetch={false}`).

## 6. Indonesian and Chinese (spec §75)

The pages now come in three languages and follow the app's: Indonesian → Indonesian, Chinese → Chinese (Simplified),
anything else → English.

- **Copy:** `copy/id.json` and `copy/zh.json` next to `copy/en.json`, the same 295 keys in the same order. Three new
  keys in all three: `date.format` and `cal.month` (the order of day, month and year differs: `2026年10月19日`) and
  `orders.dateTime` (the order's date and time, was `${date}, ${time}` in `pages/redemptions.js`).
  `python3 tools/check-copy.py` checks that every file has every key, the same `{placeholders}` and the same `**`
  marks; run it (or its port) whenever a key changes. Load only the user's language.
- **Choosing the language** (`shared/app.js`): `pickLanguage(code)` maps `id` and Android's old `in` to `id`, any
  `zh…` to `zh`, anything else (or nothing) to `en`; `LANG` is passed to `fetchCopy(lang)` (`shared/data-source.js`)
  and sets `<html lang>` (`en`, `id`, `zh-CN`), which also makes the phone use its Chinese font (Inter has none).
  In your app: read it from the app when it opens the page (`initWebview`, with the token and theme). **Agree the
  field's name and values with the app team** and tell the owner. Preview: `?lang=id|zh`, kept on every link by
  `ui.href` like `theme`.
- **Numbers:** `ui.num` / `ui.lots` / `ui.signed` format with `copy.locale` (`en-GB`, `id-ID`, `zh-CN`) instead of
  the fixed `en-US`: Indonesian reads 12.450 and 3,5. **Dates:** `ui.date` / `ui.dateYear` fill `date.format`
  with the copy's `months`. **Times:** always `HH:mm` with a colon (`en-GB`), in every language.
- **Calendar** (`shared/date-filter.js`): the month header is `cal.month`.
- Not translated, by design: `HSB Loyalty`, tier names, `WIB`, `PIN`, the "HOT" artwork, and everything the backend
  sends (reward names, descriptions, order item names).
- Events are unchanged (no event value is on-screen text).
- Checked on every page, sheet and tour step in both languages at 375px: no text cut or overflowing; Indonesian is
  longer (a few titles take two lines, as designed).
- Preview panel (demo only): a Language choice under Theme.
