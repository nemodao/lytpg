# Handoff 4 — what changed since handoff 3

**Who this is for:** developers (and their AI assistants) who have already applied handoff 3 (commits `dcd3a77`,
`61a36ba`, `0803bff`, `06d92c4`). Everything not named here is unchanged. Exact line changes in the reference:
`CHANGES-since-handoff-3.diff`. Behaviour: `spec.md` §48.

Six items from the project owner's manual test of the UAT app on real phones (14 Oct 2026). Items 1, 2, 3 and 5 are
fixes in your app only; items 2, 4 and 6 also changed the reference code.

---

## 1. Trade buttons do not open the market

**Seen:** `Trade now` (Home) and `Trade with account …` (Earn) do nothing in the app. `Verify my account` and
`Deposit now` work.

**Where:** `core/webview/intents.ts`: `trade` and `trade-account` send `navigate('TRADE')`.

**Fix:** send the screen name the app uses for its market screen. KYC and Deposit work with `KYC` and `DEPOSIT`, so
use the market screen's name in the same form (the owner refers to it as `/market`; confirm the exact value with the
app team). `trade-account` keeps sending the account (`login`) so the app switches to it.

**Check:** both buttons open the market; from Earn, the market is on the account written on the button.

---

## 2. `Open a trading account` must open KYC

**Seen:** K3, Earn: tapping `Open a trading account` does nothing.

**Decision:** a user who has completed KYC always has a live trading account (maybe not eligible, maybe blocked, but
it exists). Without one, the user has not completed KYC. So the button opens the **KYC screen**.

**Fix:** `core/webview/intents.ts`: `open-account` sends the same message as `kyc` (`navigate('KYC')`). Keep the
intent name `open-account` and the event `loyalty_open_account_click`.

**Reference:** `HANDOFF.md` §6 and `demo/intents.en.json` updated.

---

## 3. Terms & Conditions must open inside the page

**Seen:** the PDF opens in an external browser. Expected: the bottom sheet of spec §40, inside the webview.

**Where:** `features/TradingTask/components/InfoSection/TermsButton.tsx` (intent `terms` → `OPEN_LINK`).

**Fix:** open the bottom sheet as the reference does (`pages/trading-task.js`, `termsSheet`: title, round close
button, the document in a frame that scrolls by itself, `Loading…` until it shows). Android's webview cannot show a
PDF in an iframe: render the PDF inside the sheet with a viewer library (for example `pdfjs-dist`, one canvas per
page). Using the same viewer on iOS is fine. Keep `data-track="loyalty_terms_open"` on the button.

**Check:** K1–K6, K8, K10, Earn, How it works, `Terms & Conditions`: the sheet opens over the page and shows every page
of the PDF, on iPhone **and** Android. The close button, a tap outside and Back close it.

---

## 4. The pages must feel like the app

**Seen:** text can be selected; a long press on text or a link shows a menu or a link preview.

**Reference change:**

- `shared/base.css`: `html { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }`, fields
  (`input`, `textarea`, `[contenteditable]`) stay selectable, `img { -webkit-user-drag: none; }`.
- `shared/app.js`: `contextmenu` is prevented (Android long-press menu).

**Fix:** the same in your global styles and root layout. **App side** (pass to the app team): turn off link previews in
the webview (iOS `WKWebView.allowsLinkPreview = false`) and long-press handling on Android
(`webView.setOnLongClickListener { true }` or equivalent).

**Check:** long press on any text, link, card or image: nothing is selected, no menu, no preview.

---

## 5. The finger is hidden behind the next card

**Seen:** K1, Earn: the tapping finger under `Verify my account` disappears behind the How it works / History card.

**Why (likely):** the card that holds the "How to start" panel creates its own stacking context (for example a
`backdrop-filter`, `transform`, `isolate` or `z-index` on it or on a wrapper), so the finger's `z-index` only counts
inside that card, and the next card paints over it.

**Fix:** make the "How to start" card sit above the cards after it (for example `position: relative; z-index: 1` on
that card, keeping its sky layer behind its content), or remove the stacking context so the finger's `z-index: 1`
applies in the page. Same on Home (the finger reaches below the Daily Trading card).

**Check:** K1 and K2, Home and Earn: 3 s after opening, the whole finger is visible over the next card, tapping.

---

## 6. The coin glow sometimes shows as a square

**Seen:** K7, Home: the glow around the large balance coin sometimes renders as a square box instead of a soft
glow, even after reloading. Intermittent.

**Why:** the glow is a CSS `filter: drop-shadow(...)` on the image; some mobile webviews paint it as a box.

**Reference change** (`shared/components.css`, `shared/components.js`, `balanceBlock`): no filter. The coin is wrapped
in `<span class="coin-glow">`, and `.coin-glow::before` draws the glow as
`radial-gradient(closest-side, color-mix(in srgb, var(--bg-blend) 60%, transparent), transparent)` behind it.

**Fix:** the same in `components/atoms/Coin/Coin.tsx` (size `lg`) or wherever the large coin is drawn.

**Check:** Home and Coins, light and dark, reload several times on both phones: always a soft round glow.

---

## Not a change: K9 and K10 during this test

- **K9** showed `90 seconds`, no daily-maximum rule, rates with XAUUSD 120 and `Earn up to 120`: that is the
  programme's **state A**, which is correct for state A. The UAT data was reloaded during the day and K9 went back
  to state A.
- **K10** still showed today's figures on Home: the UAT build did not yet include the handoff 3 fixes. The code is
  correct (checked on a local UAT build).

## Data contract and states

`DATA.md` and `STATES.md` unchanged.
