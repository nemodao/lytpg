# Handoff 10 — what changed since handoff 9 (in progress)

**Who this is for:** developers (and their AI assistants) who have already applied handoff 9, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §79 on. Exact line changes:
`CHANGES-since-handoff-9.diff` in the package.

---

## 1. Lots show up to 2 decimals (spec §79)

Found on UAT: a day of 11.02 lots read "11.0 lots". The backend sends the right figure; the page rounded every lot
figure to one decimal (a 0.01-lot trade read "0.0 lots").

- **Reference** (`shared/app.js`): `ui.lots` formats with `maximumFractionDigits: 2` and no minimum
  (`lotNumber`, in the copy's locale), replacing `oneDecimal`: `11.02`, `1.5`, `10`, `0.01`, `0`; Indonesian `11,02`.
  `ui.lotUnit` is unchanged (`lot` from above 0 to 1, `lots` otherwise).
- **Yours:** `core/format/index.ts`, the `oneDecimal` formatter used for lots: same change.
- Where: "You traded" on Earn's Today card and every row of the Earn history.
- Mock: the history has a day of 11.02 lots and one of 0.02 lot (`mock/trading-task.json`,
  `mock/api/tradingTask-getHistory.json`).

## 2. Tier sheet: the amount deposited rounds down (spec §79)

`usd()` in `pages/trading-task.js` takes the rounding: the amount still to deposit rounds up (as the Deposit
button's `data-amount` already did), the amount deposited in "$… of $… deposited" rounds down. Before, $999.50
deposited read "$1,000 of $1,000 deposited" next to "Deposit $1 more".

## 3. "You traded" shows the lots actually traded (spec §79)

Decided by the owner (26 Oct 2026). Found on UAT: a client who closed 31.02 lots on a capped day read 20.2.

- **Reference** (`shared/api-adapter.js`, `toToday`): `today.lots` (the API's `today.lots`: every valid position
  closed today, coins arrived or not, still rising after the daily maximum) instead of `today.lotsValid` (lots
  already turned into coins, which stops at the cap). `DATA.md` updated.
- **Yours:** `core/data-source/api-adapter.ts`, `toToday`: `lots: today.lots ?? 0`.
- What changes on screen: right after a trade the card reads its lots and 0 coins, with "Coins are being credited…",
  until the coins arrive; on a capped day the lots keep rising; a delayed programme shows the day's lots and 0 coins.
- Mock: `today.lots` 4.3 by default (the sample answer's `lots`), 0.5 in `first-trade`, 31.02 in `capped`, 2 in
  `delayed`.
- Not changed: the Earn history's rows still read `days[].lots`, the converted figure, until the backend sends the
  lots traded per day too; until then today's row can read fewer lots than the Today card.

## 4. Fixes from the review of your handoff 8 and 9 work

The owner's review of the `uat` branch (commit `d7c6d00`, 26 Oct 2026: code read, UAT opened as a guest and with test
clients K4, K5, K9 in three languages) found handoffs 8 and 9 faithful: guests' Earn, the tier target, the three
copies (identical to the reference, key by key), the language kept on every link, number and date formats, the
balance fit, the store's loading and error views, the Remote Config wait and fallback, one `tradingTask/get` per page.
To fix:

1. **UAT and production still share one Plan B switch** (`HANDOFF-8.md` §4.1, left for later in your `9ebe98d`).
   `.env.uat` and `.env.prod` use the same Firebase web app and `REWARD_STORE_KEY = 'reward_store'` is hard-coded,
   so turning Plan B off on UAT for a test sends real users' Redeem to Tada within 5 minutes. **Do this first:** the
   key name per environment (for example `NEXT_PUBLIC_REMOTE_CONFIG_KEY`: `reward_store_uat` in `.env.uat`,
   `reward_store` in `.env.prod`), read in `config/env.ts`, used in `core/remote-config/index.ts`; create the UAT key
   in the console (on) and tell the owner its name.
2. **Store tabs send `loyalty_nav_click` on the loading and error views.** `StoreNav.tsx` keeps `data-track` on the
   tab that is not open while `StoreContainer` passes `onTab={() => undefined}`: the tap does nothing but GA4 gets a
   tab click. In the reference these views carry no `data-track` on the tabs. Drop it while the store waits or failed.
3. **`<html lang>` is set after hydration** (`app/layout.tsx` renders `lang="en"`, `CopyProvider` corrects it in an
   effect). Chinese pages first paint as English, so the phone may start with another fallback font and swap. Set
   it before the first paint (an inline script in `<head>` reading `?lang`, or from the request in the root layout).
4. **The number and date locale is module state** (`core/format/index.ts`, set during render in `CopyProvider`). On
   the server it is shared between requests: if pages in two languages render at the same time, numbers or dates can
   come out in the other language (and mismatch on hydration). Pass the locale through context or arguments. (Not
   seen on UAT; matters only if numbers render on the server.)
5. Minor:
   - All three copies are in the client bundle (`CopyProvider.tsx` imports them statically); load only the user's
     language (`import()`), as `HANDOFF-8.md` §6 says.
   - HeroUI / react-aria's own accessibility text (spinner, dismiss) follows the phone's language, not `?lang`:
     wrap the app in `<I18nProvider locale={…}>`.
   - Remote Config: the 3-second wait also covers downloading the Firebase chunks; on a very slow first load it
     returns the default without reading the stored value. Harmless while the default and the console agree (both
     on); preload the chunk if you can.
   - `.env.example` still has `NEXT_PUBLIC_REWARD_STORE_DEFAULT=false`; the launch default is `true`.
   - Earn's 2-minute refresh can still ask `tradingTask/get` twice when the two timers drift apart (only the
     in-flight call is shared); a short cache (about 5 s) would fix it. Optional.
6. **Still to check on a phone** (from `HANDOFF-8.md` §5.2, untouched): a guest's Checkout must send
   `loyalty_checkout_click` before `loyalty_login_prompt_view` (`RewardContainer.tsx`, HeroUI `onPress` +
   `setTimeout`); Categories must not prefetch the ~50 reward links (`StoreCards.tsx`, `prefetch={false}`).

