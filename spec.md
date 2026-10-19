# Loyalty Program UI — Phase 1 Spec

> **How to read this spec.** Sections 1–8 are the original brief. Sections 9 onwards are decisions taken during design, in date order; when two sections disagree, **the later one wins**. Main overrides: number format (§2 → comma thousands, dot decimals); "points" are now **coins** in all on-screen text (§32); the `locked`/KYC state is gone (§24, replacing §9, §14, §23 locked parts); Point Balance tabs (§5.2 → §17); the lot detail sheet is out of this phase (§18); no back buttons (§29); the Daily Trading card is the pale theme card, not yellow (§37); fully used lots now show on Coin Balance (§17 → §36). Current states: [STATES.md](STATES.md).

Goal of this spec: build a good-looking, content-correct mobile UI where every state can be previewed. This is NOT a technical/dev handoff document.

## 1. Context

Users earn points by completing tasks (phase 1: trading only) and redeem points for rewards through a partner (Tada). Rewards are redeemed inside Tada's own webview — we only show the "Redeem" button.

Phase 1 has 3 pages:
1. **Dashboard** — overview
2. **Trading Task** — rules, today's progress, history
3. **Point Balance** — balance details and history

## 2. General rules

- Mobile only, 375px width, runs inside an in-app webview. Respect safe areas.
- Use only values from `tokens.css`. No hard-coded colors, fonts, spacing or radius.
- All sample data lives in `mock/*.json`, never hard-coded in HTML.
- Each page must allow switching between its states for preview (e.g. `?state=capped`).
- Times are shown in WIB (GMT+7). Days reset at 00:00 WIB.
- Numbers use a comma for thousands and a dot for decimals: `12,450`, `3.5` (changed 2 Oct 2026; previously Indonesian format).
- Copy below is a draft in English. Final UI language is TBD — keep all text in one place so it can be swapped later.
- If something is not covered here, ask. Do not invent features.

## 3. Dashboard

Blocks, top to bottom:

**3.1 Balance card**
- Available balance: `12,450 points`
- Pending line: `+850 pending`
- Expiry warning (only when points expire within 7 days): `1,200 points expire on 12 Oct`
- Button: `Redeem`
- Tapping the card opens Point Balance.

**3.2 Trading task card**
- Title: `Daily Trading`
- Today: `3.5 lots · 2,100 points`
- Small text: `Updated 14:35 · refreshes every 5 min`
- Button: `Trade now`
- Tapping the card opens Trading Task.
- Design it as one item of a task list (more task types will come later), but make it feel prominent since it is the only task now.

**3.3 Rewards banner**
- A carousel of reward images (vouchers, gadgets, e-wallet credit). No point prices shown.
- Should look premium and enticing.

**States**
- `default`
- `has-pending` / `no-pending`
- `expiring` (expiry warning visible)
- `locked` — user hasn't completed KYC: task card replaced by `Complete KYC to unlock rewards` + button
- `capped` — task card shows `You've earned today's max points. Come back tomorrow!`
- `empty` — new user, 0 points, no activity

## 4. Trading Task

Blocks, top to bottom:

**4.1 Header**
- Title: `Daily Trading`

**4.2 Today's progress**
- Lots traded today: `3.5 lots`
- Points today: `2,100 points`
- Status line, one of:
  - `Pending · will be credited on 15 Oct, 01:00 WIB`
  - `Credited to your balance`
- `Updated 14:35 · refreshes every 5 min`
- No progress bar. Do not show the daily max as a goal.

**4.3 Account selector + earning rates**
- Summary line: `2 of 3 accounts are eligible`
- Selector opens a bottom sheet listing accounts:
  - Eligible accounts first: `50000234` with `Eligible` badge
  - Ineligible accounts greyed out: `50000871` with `Not eligible` badge; selecting one shows `This account is not part of the program.`
  - If the user has only 1 account, show a static label, no selector.
- Rates table for the selected account:
  - `Forex — 5 pts / lot`
  - `Metal — 10 pts / lot`
  - `Indices — 3 pts / lot`
  - `Other symbols — 1 pt / lot` (hide row if 0)
- Above the rates: `Trade with this account and earn points on every lot you trade. Rates depend on the symbol group:`. Below them: `Small trades earn too, even 0.01 lot earns points at the same rate.`
- Rates are per symbol group only. Per-symbol rates are not set at this stage.
- Rate values show the coin icon instead of `pts` (`[coin] 5 / lot`). No chevron on the rows.

**4.4 Trade button** (sits inside the trading account card, below the rates; the rates list is framed in its own inner card)
- `Trade with account 50000234`
- If the selected account is not eligible: `Switch to an eligible account`

**4.5 How it works (rules)**
Short, scannable list:
- Hold each position at least **3 minutes** — shorter trades earn 0 points.
- Points are credited **3 days** after the trading day.
- Points expire **30 days** after being credited.
- A new earning day starts every day at 00:00 WIB. Your earned points are kept.
- Max **10,000 points per day**.

**4.6 History**
- One row per day: date with the year (`13 Oct 2026`), then `4.2 lots` and `[coin] 2,520` in fixed columns so they line up down the list, plus a status badge (`Pending` / `Credited`).
- On capped days, `Reached Max Points` is written next to the points in a light highlight colour (no separate badge).
- Rows do not expand: there is no per-deal report.
- Time filter above the list (chips): `Last 7 days` (default), `Last 30 days`, `Custom`. `Custom` opens a bottom sheet with a date-range calendar (review mockup G5); future days cannot be picked. After applying, the chip shows the chosen range (`1 Oct – 10 Oct`). If no day falls in the range: `No trading days in this period.`

**States**
- `default` (pending mode, points credited after 3 days)
- `in-day` (points credited during the day)
- `capped` — progress shows `You've earned today's max points. Come back tomorrow!`; button text changes to plain `Trade now` (no "earn points" wording anywhere)
- `ineligible-selected`
- `single-account`
- `no-trades-today` — friendly empty state + trade button
- `ended` — program ended: `This program has ended. Pending points will still be credited.` History still visible, no trade button
- `locked` — KYC not completed

## 5. Point Balance

Blocks, top to bottom:

**5.1 Header**
- Available balance: `12,450 points`
- `+850 pending`
- Expiry warning (within 7 days): `1,200 points expire on 12 Oct`
- Button: `Redeem`

**5.2 Tabs** (superseded by §17: `Available` | `Expired` | `History`)

**My points**
- Note at top: `Points expiring soonest are used first.`
- Pending items on top: `Trading · 13 Oct · 850 points · Pending, credited 16 Oct`
- Then active items sorted by expiry (soonest first):
  `Trading · 10 Oct · 1,200 / 2,000 left · Expires 9 Nov`
- Toggle: `Show used & expired` reveals items that are fully used or expired (greyed).

**History**
- Grouped by date, newest first. Row types:
  - Earned: `Trading 12 Oct · +2,520`
  - Earning in progress: `Trading today · +2,100 · Earning`
  - Redeemed: `Redeemed reward · −5,000` (reward name: TODO, show generic for now)
  - Refunded: `Refund · +5,000`
  - Expired: `Expired · −300`
  - Adjusted: `Adjustment · +100` (reason: TODO)

**States**
- `default`
- `expiring`
- `no-pending`
- `empty` — 0 points: friendly empty state pointing to the Trading Task
- `all-expired` — balance 0 but has history

## 6. Navigation

- Dashboard → Trading Task (tap task card)
- Dashboard → Point Balance (tap balance card)
- `Redeem` → opens Tada (out of scope; just a button)
- `Trade` buttons → open the app's trading screen (out of scope; just a button)
- Sub-pages are reached through the bottom navigation (§19); they have no back button.

## 7. Never show

- Points the user lost due to the daily max (only show the points actually earned)
- Cash value of points
- Internal account group names (use display names like `Standard`, `Mini`)
- Blacklist status

## 8. TODO (leave placeholders, don't invent)

- Reward name/image in redeem history
- Reason text for manual adjustments
- Expiry warning threshold (7 days is temporary)
- Final UI language

## 9. Clarifications (decided 1 Oct 2026)

- **States combine.** `?state=` accepts a comma-separated list, e.g. `?state=expiring,no-pending`. Every page also has a small floating state switcher panel (preview only, easy to remove).
- **Theme.** Follow the device setting by default; `?theme=dark|light` overrides it.
- **Locked (KYC not done).**
  - Dashboard balance card: show 0 points; hide the pending line, the expiry line and the Redeem button.
  - KYC button text: `Complete verification`.
  - Point Balance is still reachable; it shows its `empty` state.
  - Trading Task: show the rules and rates; replace the trade button with `Complete verification`.
- **Reward images.** Neutral placeholders with one consistent aspect ratio until real images are generated.
- **Fonts.** Bundled locally (woff2, Latin subset). No Google Fonts.
- **In-day mode.**
  - Today's history row shows `Earning` and becomes `Credited` after the day closes. Past days show `Credited`.
  - The credit rule line becomes: `Points are credited to your balance throughout the day (every 5 min).`

## 10. Dashboard layout (wireframe, 2 Oct 2026)

The Dashboard follows the wireframe `Frame 1 (1).pdf`, which replaces the block layout in §3 where they differ:

- Header with a back button and the title `HSB Loyalty`.
- Balance block: icon, `Point Balance` label, balance, pending line; on the right a `Details` link and the `Redeem` button; expiry banner underneath.
- Daily Trading card: icon overlapping the top-left corner, title, `Details` link, a one-line description; an inner panel with `Today`, `You traded`, `Points earned` and the update note; a countdown to the daily reset; a centred `Trade Now` button.
- Rewards: title and subtitle, then a mosaic of three tiles (one tall tile on the left, two stacked on the right) instead of a carousel.

Data rules in §2 and §3 (number format, refresh interval, expiry wording, states) still apply until decided otherwise.

## 11. Refresh interval (decided 2 Oct 2026)

Data refreshes every **30 minutes** everywhere. This replaces every "5 min" in §3.2, §4.2 and §9 (including the in-day rule line, now "every 30 min"). On the Dashboard the note reads `Update every 30 mins` and sits on the `Today` row.

## 12. Expiry warning (decided 2 Oct 2026)

The warning reads `1,200 points expire within 10 days`: the window is **10 days** (replaces the temporary 7 days in §3.1, §5.1 and §8).

## 13. Dashboard design decisions (final, 2 Oct 2026)

- Daily Trading card: vivid **yellow** blend; trophy icon: **purple** cup.
- Redeem button (balance): **mono** (black in light, white in dark), small, with gift icon.
- Point coin: **round** coin.
- Reward tiles: vivid **pink** blend, with a small glass Redeem button on each tile.
- A dashed divider sits between the balance block and the Daily Trading card.

## 14. Locked state on the Dashboard (decided 2 Oct 2026)

Replaces the Dashboard lines of §9 "Locked":

- The Redeem buttons stay visible when locked: the one beside the balance and the small one on each reward tile.
- The balance still shows 0 points, with the pending and expiry lines hidden.
- The task card is the Daily Trading card style (yellow blend) with the cup centred inside, the text `Complete KYC to unlock rewards` and the button `Complete verification`. No title.

## 15. Trading Task changes (decided 2 Oct 2026)

- No program period in the header: the `Ends in … days` line and the program end date setting are removed.
- Accounts are shown by account number only, with no account type name.
- The `Trade with account …` / `Switch to an eligible account` button sits inside the trading account card.
- Earning rates are shown per symbol group only; per-symbol rates come later if needed.
- `How it works` and `History` share one card, switched by segmented tabs (review mockup D4, option 1). `How it works` is shown first.
- Header matches the Dashboard: round back button and centred title.
- Today's progress uses the Dashboard's Today panel on the vivid yellow blend: `Today` + `Update every 30 mins`, `You traded` / `Points earned` (with the coin), the purple cup centred above the card (outside it) as the programme's icon, and a footer line carrying the credit status, the capped message, or the no-trades hint.
- Behind the top of the page: a dark sky that ends in a clean edge halfway down the Today card (no fade). The sky is identical in light and dark mode.
- A "HOT" badge floats at the cup's top-right in the hero: at the top of its drift it is clear of the cup, at the bottom it covers the corner of the rim (no motion when the device prefers reduced motion).
- Sky (final): diagonal light streaks in the theme blue; the cup has one wide dark shadow.
- The reset rule reads: `A new earning day starts every day at 00:00 WIB. Your earned points are kept.`

## 16. Point Balance changes (decided 2 Oct 2026)

- Header matches the other two pages: round back button and centred title.
- The balance card uses the pale theme card and carries the same content as the Dashboard's balance block: coin, `Point Balance`, the number, pending, the mono `Redeem` button with the gift icon, and the expiry warning.
- Active items show two right-aligned lines, `Earned 2,000` over `Remain 1,200` (replaces `1,200 / 2,000 left`); the words and the earned number are lighter; only the remaining number is in the main text colour. The remaining number is followed by the coin icon.
- Pending items show the coin icon followed by the number (`[coin] 850`) instead of `850 points`.
- Used and expired items (under `Show used & expired`) show the same `Earned` / `Remain` lines as active items. Their coin icon is muted like the text. An expired item can have `Remain` above 0: the points that were still unspent when it expired.

## 17. Point Balance tabs (decided 2 Oct 2026, replaces §5.2 and the item rules in §16)

Three tabs side by side, no nested tabs: `Available` | `Expired` | `History`. Default: `Available`.

**Available**
- Everything is shown: no filter, no paging.
- Order: earning and pending items first, then active lots, soonest expiry first.
- Each row: source · date earned, expiry underneath, and on the right `Earned 2,000` over `Remain [coin] 1,200`. Earning and pending rows show the amount with the coin and a badge.
- Lots expiring within the warning window (`expiryWarningDays`, 10 days) are highlighted: the expiry line turns red with a clock icon.
- Note at the top: `Points expiring soonest are used first.`
- The `Show used & expired` toggle is removed.
- No active, pending or earning items: an empty state inviting the user to the Trading Task.

**Expired**
- Only lots that expired with points still unspent.
- Time filter by expiry date, the same as the Trading Task history: `Last 7 days` (default), `Last 30 days`, `Custom` (date-range calendar).
- Each row: source · date earned, `Expired 4 Oct` underneath, and on the right `Earned 2,000` over `Expired [coin] 300`.
- Empty: `No expired points in this period.`

**History**
- Every movement in or out, newest first, grouped by date, with the same time filter (`Last 7 days` by default). Empty: `No activity in this period.`

**Rules**
- A fully used lot (nothing expired) appears in neither `Available` nor `Expired`; it is only visible through its redemption rows in `History`. *(Replaced by §36.)*
- State `all-expired`: `Available` is empty with the invitation; `Expired` has data.

## 18. Lot detail bottom sheet (not in this stage)

A bottom sheet with the details of one lot was built and then removed on 2 Oct 2026: it is out of scope for this stage. Rows in `Available` and `Expired` are not tappable.

## 19. Bottom navigation (decided 2 Oct 2026)

A floating bar shared by all three pages: `[ Exit ]   [ Home | Earn | Points ]`.

- `Exit` is a separate block with the X icon only (no label), drawn in red with a slightly heavier stroke, with a clear gap before the tab block. It runs flush to the left screen edge (square on that side, rounded on the right); the tab block keeps its margin from the right edge. It leaves the webview (placeholder handler for now).
- Tabs: `Home` (Dashboard), `Earn` (Trading Task), `Points` (Point Balance), each with an icon and a label. The current tab is highlighted.
- The bar floats: it keeps a gap from the left and right edges and from the bottom (`safe-area-inset-bottom` + gap). Page content has enough bottom padding that the last item is never covered.
- No back button in the header of `Earn` and `Points`. Cards on `Home` still link to their page.
- The trade button on `Earn` stays in the content (not sticky). Bottom sheets open above the bar.
- The bar follows the theme (light in light mode, dark in dark mode) but in a deeper tone than the page's cards and tabs, so it does not blend into them. Colours come from the tokens `--ui-nav-surface`, `--ui-nav-stroke` and `--ui-nav-tab-active`.
- Each tab uses glass artwork (house, money bag, wallet) from `Design Elements/General/Bottom Main Menu`: silver glass when not selected in light mode, dark glass when not selected in dark mode, blue glass when selected in both.
- The `Earn` tab carries a small "HOT" badge on the top-right of its icon to highlight it, only while `Earn` is not selected. The badge floats gently up and down in code (no motion when the device prefers reduced motion).
- When `Earn` is not selected, its icon turns orange and grows by a quarter every 6.5 seconds (0.5 s in, about 1 s hold, 0.6 s out), to back up the "HOT" badge. No change when the device prefers reduced motion.
- The bar is one shared component (`shared/nav.js`); tabs are declared in a config array (id, icon, label, page).

## 20. Daily check-in (mock only, not in this phase)

A check-in card for a future phase, mocked so it can be reviewed. Hidden by default; the `check-in` state shows it.

- Place: on the Dashboard, under the balance block and its dashed divider, above the Daily Trading card.
- Style: the "Keep it up" streak card from the review mockup (white to light blue blend, faint calendar in the corner).
- Content: `Checked in 3 days`, `Check in every day for points, up to [coin] 100 a day.`, seven day tiles (`[coin] 10 · Day 1` … `[coin] 100 · Day 7`) where checked days are filled deep blue (so the coin stands out), today is outlined, later days are plain, and a `Check in` button (`Checked in today`, disabled, once done).
- Hidden for locked users (KYC not done).
- Rewards per day, days checked and whether today is done come from `mock/dashboard.json` (`checkIn`).

## 21. Coin icon position (decided 3 Oct 2026)

Wherever the coin icon stands for points, it comes before the number: `[coin] 2,100`, `[coin] 5 / lot`, `Remain [coin] 1,200`.

## 22. Preview states, grouped (decided 4 Oct 2026)

States are listed in the switcher by the part of the page they change (`stateGroups` in each mock file). States with the same name mean the same thing on every page and carry over when you move between pages.

**The full, current list of states lives in [STATES.md](STATES.md)**, generated from the mock files by `tools/build-states.py`. Do not keep a second copy here.

## 23. Trading Task: ended and locked (decided 4 Oct 2026)

The hero (sky with streaks and the cup) stays in every state; only the yellow card under the cup changes.

- `ended`: the card carries `This program has ended` / `Pending points will still be credited.` in place of today's progress. No HOT badge. The rest of the page (account and rates without a trade button, how it works, history) stays.

## 24. No locked state; `no-task` (decided 4 Oct 2026)

- The `locked` state (KYC not done) is removed from every page, together with the KYC card, its copy and the `kycCompleted` flag. Earlier rules about locked users (§9, §14, §23) no longer apply.
- New state `no-task`: the programme runs no trading task (`program.tradingTask: false`). The Dashboard shows only the balance block and the rewards banner (the Daily Trading card is hidden), and the `Earn` tab is left out of the bottom bar. The state is shared, so it stays on when moving to Point Balance.

## 25. Participation requirement (decided 4 Oct 2026)

Some users must pass KYC or make a first deposit (FTD) before they can take part in the trading task (`program.joinRequirement`: `kyc` | `deposit` | null).

- Everything shows as usual, including the yellow Daily Trading card. Only the trade button text changes: `KYC to join` or `Deposit to join`.
- Where: the `Trade now` button on the Dashboard's Daily Trading card, and the trade button in the Trading Task's account card.
- States `needs-kyc` and `needs-deposit` (group "Participation"), shared between pages.

## 26. State clean-up (decided 4 Oct 2026)

- `no-task` is renamed `no-task-trading` and shown in the switcher as "No Task: Trading". It covers three cases: the Trading Task is turned off; it is blocked for this user (reason set in config, e.g. blacklist, A-Book); or it is hidden from all users.
- `empty` now only means the balance is 0 (no available, pending or expiring points). It sits in the Point Balance group on the Dashboard and on Point Balance. It no longer hides anything: the Daily Trading card and the Point Balance tabs show as usual. The full-page "No points yet" empty state is removed.
- Trading Task with `needs-kyc` / `needs-deposit`: the user has no trading account yet, so the card shows only the earning rates (intro `Earn points on every lot you trade. Rates depend on the symbol group:`, the rates, the small-trades note) and the join button. No account selector.
- Point Balance tab states `available-empty`, `expired-empty`, `history-empty` empty one tab each. Without them, every tab has data under both `Last 7 days` and `Last 30 days`.

## 27. Point Balance follow-up (decided 4 Oct 2026)

- `available-empty` (and any time the Available tab has nothing): the tab shows only `No available points.` No call to action.
- `no-task-trading` is removed from Point Balance and is no longer carried between pages; it stays on the Dashboard only.

## 28. Pending points off by default (decided 4 Oct 2026)

- By default there are no pending points. The `has-pending` state (replacing `no-pending`) adds them: `+850 pending` under the balance, and the pending lot in the Point Balance `Available` tab.
- `all-expired` is removed: a zero balance is covered by `empty`.
- Point Balance groups are now `empty`, `has-pending`, `expiring` on both the Dashboard and Point Balance.

## 29. No back button (decided 5 Oct 2026)

The Dashboard header has no back button any more; no page has one. Leaving the webview is the X on the bottom bar.

## 30. Where buttons lead (decided 5 Oct 2026)

Buttons that leave these pages are not wired to the app yet. Tapping one shows a message in the middle of the screen: a blue `Internal Explanation` label, a short title, and `Clicking this button will …` saying where it goes and what happens. No icon, no button; it hides itself after 3 seconds (or earlier on a tap outside or Escape).

| Button | Message |
|---|---|
| `Redeem` (balance) | Opens Tada, the rewards store |
| `Redeem` on a reward tile | Opens that reward's page in Tada |
| `Trade now` (Dashboard) | Opens the market screen with the current trading account |
| `Trade with account 50000234` / `Trade now` (Trading Task) | Opens the market screen and switches to that account |
| `KYC to join` | Opens the KYC screen in the app |
| `Deposit to join` | Opens the Deposit screen in the app |
| `Check in` (future) | Marks today as checked in and adds the day's points |
| X on the bottom bar | Closes the loyalty pages and returns to the app |

`ineligible-selected`: the selected account belongs to an MT5 group that cannot take part (for example an A-Book group, or any group not listed in the programme config).

**Demo only.** The message is a review aid and is never handed to front-end developers. It lives in `demo/` and is loaded only from the DEMO ONLY block of each page; `tools/build-handoff.py` strips it. In the product each button opens its deeplink; the button's `data-intent` names which one:

| `data-intent` | Destination |
|---|---|
| `redeem` | Tada (rewards store) |
| `reward` | That reward in Tada |
| `trade` | Market screen, current trading account |
| `trade-account` (+ `data-account`) | Market screen, switched to that account |
| `kyc` | KYC screen in the app |
| `deposit` | Deposit screen in the app |
| `checkin` | Check in (future) |
| `exit` | Close the webview |

## 31. Live activity line on the Dashboard (decided 5 Oct 2026)

Above `Trade now` on the Dashboard's Daily Trading card, and on the Trading Task under the credit status line (`Pending · will be credited …`) of the yellow Today card: `Trader 95***356 just earned 12 points`, with a green "live" dot.

- Points: random whole numbers from 1 to 700 (step 1), weighted by range: 1–29 → 70% of entries, 30–99 → 23%, 100–200 → 4%, 201–700 → 3% (config `points.bands`).
- The line sits in a small pill: a dark, translucent fill over the yellow card, so it reads as a slightly deeper yellow.
- Client ID: first digits fixed (`95`, config `clientIdPrefix`), then `***`, then 3 random digits.
- A new entry every 1, 2, 3, 4, 5 or 6 seconds, chosen at random each time.
- Home and Earn show the same feed: at any moment both pages (and every device) show the same entry and change at the same instant, so switching tabs does not change it. In the demo this comes from a generator seeded by the clock; in production the feed comes from one shared server stream.
- Only while markets are open, Monday to Friday GMT+7. **In UTC: from Sunday 17:00 to Friday 17:00 UTC.** Outside that window the line is hidden (markets closed); it also hides itself when the window ends while the page is open.
- Config lives in `mock/common.json` → `liveFeed` (`openUtc`, `closeUtc`, `clientIdPrefix`, `points`, `intervalSeconds`). The shared preview state `market-closed` (both pages) sets the clock to a Saturday. Hidden in the Trading Task `ended` state.
- The entries are made up in the demo; in production they would come from real trades.

## 32. "Point" becomes "Coin" (decided 5 Oct 2026)

The programme's unit is now called **coin**. Every on-screen text says coin / coins instead of point / points: `Coin Balance`, `Coins earned`, `Redeem coins for rewards`, the `Coins` tab, `Reached Max Coins`, `1,200 coins expire within 10 days`, `Trader 95***356 just earned 12 coins` (`1 coin` when it is one), and so on. Examples elsewhere in this spec that still say points read as coins.

Code names (file `point-balance.html`, ids, data fields such as `points`) are unchanged, so links and data stay the same.

## 33. Full width on phones (decided 5 Oct 2026)

The layout is designed at 375px but fills the whole screen on any phone (up to 600px wide): no side margins on 390px or 430px phones. On a computer the page stays a centred 375px column.

## 34. No drop shadows (decided 5 Oct 2026)

Buttons (primary, stroke) and the bottom bar have no drop shadow, matching the flat cards. Effects that stay on purpose: the light rim on blend cards, the glow behind the balance coin, the soft shadow under reward images and the cup, the glow on bright sky streaks, the ring around the live dot.

## 35. No countdown; calmer gold card (decided 5 Oct 2026)

- The countdown to the daily reset on the Dashboard's Today panel is removed. The panel has a footer only when today's max is reached (capped message).
- The Daily Trading cards (Dashboard task card, Trading Task Today / ended card) keep the **vivid yellow** blend by default (the muted gold tried on 5 Oct was dropped). Under review, switchable with the states in "Trading card colour (review)":
  - `card-pale-theme`: the pale theme card from the review mockup ("Theme · pale").
  - `card-pale-yellow`: the same pale card in yellow, no blue (new tokens `--surface-yellow-soft`, `--stroke-yellow-soft`).
  - `card-indigo`: the vivid indigo blend.
  Only one colour at a time: in the switcher this group is a single choice, with "Trading card: Yellow (default)" first.
  Pale cards follow the page theme (light / dark). Config `program.taskCardColour`: yellow | pale-theme | pale-yellow | indigo.

## 36. Fully used lots on Coin Balance (decided 5 Oct 2026, replaces the fully used rule in §17)

§17 said "A fully used lot appears in neither Available nor Expired". That rule is replaced:

- **Available:** a fully used lot (status `used`, remaining 0, not yet expired) still shows, at the end of the tab, in its own section titled `Fully used`. Order of the whole tab: pending → earning → active (soonest expiry first) → `Fully used` (soonest expiry first).
- A `Fully used` row has the same layout as an active row (source · date earned, expiry underneath, `Earned 5,000` over `Remain [coin] 0` on the right), but all text and the coin are muted. It is never highlighted as expiring soon.
- No fully used lots: no `Fully used` section.
- **Expired:** a lot used up before its expiry date shows there as usual once it expires, with `Expired [coin] 0`. No special style.
- **History:** unchanged; there is no "Expired 0" row.
- Preview state `has-used` (group "Tabs"): adds two fully used lots to Available and one used-then-expired lot to Expired (within Last 7 days). Without it there are no fully used lots.

## 37. Daily Trading card colour: final (decided 7 Oct 2026)

The Daily Trading cards (Dashboard task card, Trading Task Today / ended card) use the **pale theme card** from the review mockup ("Theme · pale": soft blue fill `--surface-brand-soft`, soft blue stroke `--stroke-brand-soft`, page text colours, mono `Trade now` button). The card follows the page theme (light / dark). This replaces the vivid yellow and closes the colour review in §35: the other options (vivid yellow, pale yellow, indigo) and their preview states are removed. Wherever earlier sections say "yellow card", read "Daily Trading card".

## 38. Guided tour (decided 7 Oct 2026)

A five-step tour that explains how to earn coins and redeem gifts. Steps 1–2 run on Home and steps 3–5 on Coins (the Earn page is not visited: step 2 only shows the rules). Earning rates live in `mock/common.json` (`rates`) so Home can read the highest rate. It is a product feature (not demo): code in `shared/tour.js`, copy under `tour.*`.

| Step | Page | Highlight | Text | Button |
|---|---|---|---|---|
| 1 | Home | none (pop-up in the middle) | `Welcome to HSB Loyalty` / `Take a quick tour to learn how to earn coins and redeem them for gifts.` | `Start tour` |
| 2 | Home | none (pop-up in the middle) | `Earn coins when you trade` / `Earn up to 10 coins per lot. Here’s how it works:` (10 = the highest rate in the rates list), then the **same rules list as the How it works tab** (one shared component: change the rules once and both change), inside a quiet borderless inner card | `See my coins` |
| 3 | Coins | the Coin Balance card | `Coins added to your balance` / `Coins you earn from trading are added to your balance.` / `This balance animation is only a simulation.` | `Next` |
| 4 | Coins | the `Redeem` button | `Redeem gifts with coins` / `Use Redeem to exchange your coins for gifts. You can explore the rewards after the tour.` | `Continue` |
| 5 | Coins | the three tabs | `Manage your coins` / Available: coins you can spend · Expired: coins that have expired · History: coins added to or taken from your balance | `Finish tour` |

Copy revised on 7 Oct 2026 (final wording from the content review). The "How it works" rules now read: `Hold each position for at least 3 minutes. Shorter trades earn 0 coins.` · `Coins are credited 3 days after the trading day.` (in-day: `Coins are credited throughout the day, every 30 minutes.`) · `Coins expire 30 days after they are credited.` · `A new earning day starts at 00:00 WIB. Coins you’ve already earned are kept.` · `Earn up to 10,000 coins per day.` This replaces the rule wording in §4.5 and §15.

- **Step 1 animation:** above the title, a looping carousel: coin → crown → gift box → cup travel right to left on an ellipse. Only the front item is visible: it shrinks and fades out as it moves off to the left edge, while the next one fades in from the right edge. The coin opens the loop and rests 2 s, every other item rests 4 s; each change takes 1.2 s. Shown 230px wide. It is animated in code from still images (`assets/tour/step-1-<n>.webp`, 400px each), so it stays sharp on every screen and is light (about 150 KB for the four); an animated-file version was dropped because it looked pixelated on phones. `tools/build-tour-animation.py` exports the stills from `Design Elements/Tutorial/Animation/Step 1` and can render the same motion as a transparent WebM (`--video`) for use elsewhere. With reduced motion the first item stays still.
- **Step 2 artwork:** above the title, `[candles] → [coin] +`. It plays once and then stays still, so it does not distract from the rules: the candles appear, then the arrow, then the coin pops in and a green `+` pops onto it (two small plus signs float up and vanish). About 2.5 s in total. Built in code from two still images (`assets/tour/step-2-candles.webp`, `step-2-coin.webp`), not a video file. With reduced motion everything is simply shown.
- **Step 4 animation:** above the title, the same carousel with five rewards (`assets/tour/step-4-<n>.webp`, artwork from `Design Elements/Tutorial/Animation/Step 4`): phone → earbuds → laptop → suitcase and plane → foldable phone. Each rests 2.5 s, each change takes 1.2 s. The rewards are shown larger than the step 1 items (about 130px against 96px). The animation area spans the pop-up's full width, so items are not clipped at the sides while they move.
- **Step 4 effect:** when the step opens, eight small gift boxes (the gift from the step 1 artwork, `assets/tour/gift.webp`) pop up one after another around the `Redeem` button, drift up and fade. It plays once, about 2 s. None with reduced motion.
- **Step 1 sparkles:** before the finger arrives, fourteen gold sparkles (`assets/tour/sparkle.webp`), large and small (6–17px), pop at random spots around the `Start tour` button (four of them always above it) in random order, from 2 s to about 4.1 s; the finger sits above them; the finger comes in together with the first sparkles, at 2 s. Step 1 only; none with reduced motion.
- **Finger hint:** on every step a finger appears just under the main (blue) button, pointing up at it, then taps gently: after 2 s on step 1 (together with the sparkles) after 7 s on step 2 (it has the rules to read), and after 4 s on the other steps. It grows in softly from its fingertip over 0.8 s, the way the sparkles pop in. It never blocks taps. Artwork (final, 7 Oct 2026): the skin-tone 3D hand, `assets/tour/finger.webp`; the blue glass and peach glass options were dropped.
- **Step 5 icons:** each of the three lines sits in its own small borderless card and starts with a small coin icon from `Design Elements/Tutorial/Animation/Step 5` (16px): a blue coin for Available, a silver coin for Expired, a blue coin with plus and minus marks for History.
- **Loading:** a step opens only after all of its images are loaded (2.5 s limit on a slow connection), so the pop-up and its artwork appear together and timed effects always play in order. While a step is on screen, the next step's images are loaded in the background. Tour images are exported at 3x their display size; all of them together weigh about 250 KB.
- **When it opens:** by itself the first time Home is opened on a device (remembered on the device), and whenever the user taps the help button (round `?`) at the right of the Home header.
- **Blocking:** while the tour runs nothing but the pop-up can be tapped; the page does not scroll; the bottom bar is covered. The highlighted part is visible but not tappable (so `Redeem` cannot be pressed in step 4).
- The step counter (`2 of 5`) shows from step 2 on; the welcome step has none.
- **Buttons** in the pop-up are the small size (36px), as wide as their text, aligned to the right; no focus ring is shown when a step opens. Every step after the first has `Back` (it goes back across pages too). Every step except the last has `Skip tour`, which closes the tour on the current page. `Finish tour` returns to Home. Skipping or finishing both count as "seen".
- **Step 3 effect (temporary, simulated):** the balance counts up from the user's real balance to 12,890; if the user already has 12,890 coins or more, nothing moves and the simulation note is hidden. Otherwise the balance counts up to 12,890 (`tour.simulatedBalance`) in about 1.5 s, with green plus signs and small coins popping around it. The simulated number stays through steps 4 and 5 and is gone when the tour ends. With reduced motion the number just changes.
- **No trading task:** step 2 is skipped and the tour has four steps.
- **Progress** travels between pages in the URL (`?tour=<step>`); `?tour=off` never opens the tour. Preview state `first-visit` (Dashboard, group Page) acts as a first visit.


## 39. "How to start" for users who cannot earn yet (decided 8 Oct 2026, phase 2)

Replaces the rule in §25 that only the button text changes, and moves the Earn button described in §26.

While the user still needs KYC or a first deposit (`program.joinRequirement` = `kyc` or `deposit`), the Today card shows how to start instead of today's figures. This applies to the Daily Trading card on Home and the Today card on Earn; both use one shared component.

- **Panel `HOW TO START`** with three steps:
  1. `Verify your account`
  2. `Make your first deposit`
  3. `Trade — coins are credited automatically`
- **Not yet KYC:** step 1 is the step to do now (solid number, bold text); steps 2 and 3 are muted.
- **KYC done, no first deposit:** step 1 shows a green check and reads `Account verified`; step 2 is the step to do now; step 3 is muted.
- **Rates line** under the panel: `70–100 coins per lot · up to 2,000 a day`. The range is the lowest and highest rate of the symbol groups that earn; the cap is the daily maximum. If all groups share one rate it reads `100 coins per lot`.
- **`See rates`** at the right of that line: on Home it opens the Earn page; on Earn it scrolls to the Earning rates card.
- **Button** (full width, blue): `Verify my account` opens KYC; `Deposit now` opens Deposit. These replace `KYC to join` and `Deposit to join` everywhere.
- Today's figures, the "Update every 30 mins" note and the live activity line are not shown in these two cases.
- On Earn, the button now sits on the Today card; the Earning rates card below keeps the rates and has no button.

Decided 8 Oct 2026 that these users see the full Earning rates table; **reversed on 12 Oct 2026, see §42:** they see only the rate range.

**Sample rates and daily maximum changed (8 Oct 2026):** the sample data now uses Forex 80, Metal 100, Indices 90 and Other symbols 70 coins per lot, with a daily maximum of 2,000 coins (was 5 / 10 / 3 / 1 and 10,000). Every text that reads these values follows: the rates table, the rule `Earn up to 2,000 coins per day.`, and tour step 2 `Earn up to 100 coins per lot.` Earlier sections that quote 10 coins per lot or 10,000 a day are superseded.

**Sample figures brought in line with the 2,000 daily maximum (8 Oct 2026).** Sample amounts quoted in earlier sections are superseded by these:

| Figure | Now | Was |
|---|---|---|
| Available balance | 3,100 | 12,450 |
| Today | 3.5 lots · 310 coins | 3.5 lots · 2,100 |
| Pending (state `has-pending`) | +120 pending | +850 |
| Capped day | 2,000 coins (about 24 lots) | 10,000 |
| Tour step 3 simulated balance | 3,410 (balance + today's 310) | 12,890 |

Every daily amount is between 70 and 100 coins per lot and never above 2,000. On Coins, the lots and the history use the same amounts as the Earn history; redemptions and the refund are 1,000 coins each. The expiring warning stays at 1,200 coins.

**Nudge on the button (8 Oct 2026, revised the same day).** In both cases (`Verify my account`, `Deposit now`), on Home and on Earn:

- 3 seconds after the page shows, the finger from the guided tour (the 3D hand) grows in just under the button, pointing up at it;
- it then double-taps the button, waits 4 seconds, and double-taps again, for as long as the card is on screen (4 s gap set on 8 Oct 2026; the first version repeated every 1.8 s, which felt too busy);
- on each tap the button answers as if it were pressed: it sinks slightly (to 97%) and takes its pressed colour, then springs back. Finger and button move in step.

- during the 4-second wait only the finger floats gently: it drifts 4px away from the button and back, twice. The button stands still while waiting.

This replaces the single pop of the first version. The finger never blocks taps. It reaches a little below the card and overlaps the top of what follows. On Earn, switching the `How it works` / `History` tab does not replay the entrance: the finger stays and goes on tapping. With reduced motion the finger just appears; nothing taps or flashes.

## 40. Terms & Conditions (decided 8 Oct 2026, phase 2)

- **Where:** on Earn, in the `How it works` tab, after the last rule: a text button `Terms & Conditions ›` (brand colour, no background). It is not shown in the guided tour, which reuses the same rules list.
- **Tap:** opens a bottom sheet titled `Terms & Conditions` with a round close button. The sheet closes with that button, a tap outside it, or Escape.
- **Content:** the sheet shows the document found at the address the backend sends (`program.termsUrl`), inside a frame that scrolls by itself. `Loading…` shows until the document appears. The document keeps its own look (white page) in both light and dark mode.
- **No address:** if the backend sends none, the button is not shown.
- **Sample:** the mock points at a placeholder PDF (`assets/docs/terms-sample.pdf`); its wording is not the real terms.

Decided 8 Oct 2026: the document is a **PDF**; the backend sends its address. Known risk, accepted for speed: an in-app webview may not display a PDF inside a page (Android shows nothing, iOS may show only the first page). The developer must check this in the real app; if the PDF does not display, the fallback is to draw it with a PDF viewer library or to have the app open the PDF in its own viewer when `Terms & Conditions` is tapped.

## 41. Coins that are not credited yet are never shown; same-day crediting is the default (decided 12 Oct 2026, phase 2)

Decided with the backend review of the real API. Replaces every earlier mention of pending coins (§3, §5, §9, §16–17, §27).

- **No pending coins anywhere.** Removed: the `+120 pending` line under the balance (Home, Coins), pending lots at the top of the Available tab, the `Trading today · Earning` row in the Coins History tab, the `Pending` badge, and the preview state `has-pending`.
- **The launch programme credits coins the same day (T+0).** The sample data now uses this mode by default. A programme that credits days later (`delayed`) still works but is not tuned; it is a preview state on Earn and will be improved when such a programme exists.
- **Today card, line under the figures** (Earn):
  - coins still arriving: `Coins are being credited to your balance`
  - all coins in the balance: `Credited to your balance`
  - daily maximum reached, or no trade yet: unchanged
  - delayed programme, coins not arrived: no line at all (not even the date they will arrive); `Coins earned` shows 0 until they arrive.
- **Earn history:** a day is listed only once coins have arrived for it. Days still waiting are left out. Badges are `Earning` and `Credited`; today's row is labelled `Today`.
- **Update interval:** coins arrive within 15 minutes after a position is closed (often sooner). The Today card reads `Updates within 15 mins` and the rule reads `Coins are credited within 15 minutes after you close a position.` (was 30 minutes; a first version said 3–15 minutes, dropped because 3 is not a real lower limit). The number is fixed in the UI, not sent by the API.
- **First trade of the day:** for up to 15 minutes the card reads 0 lots and 0 coins together with `Coins are being credited to your balance` (preview state `first-trade`). On a day that reached the maximum, the lots stop rising even if the user keeps trading.
- **Today's lots and coins move together:** both rise only when the coins of a closed position have arrived, so a trade shows up on the card up to 15 minutes after it is closed.
- **Known gap for delayed programmes:** the Today card shows 0 lots and 0 coins all day, with no explanation, even after the user has traded. Accepted for now because launch is same-day; to be fixed when a delayed programme is planned.
- **Coins, Available tab:** today's lot of a same-day programme keeps its `Earning today` line and `Earning` badge.

Preview states on Earn, group "Today trading task": `credited` and `delayed` replace `in-day`.

## 42. Rates belong to a trading account; users without an account see only the rate range (decided 12 Oct 2026, phase 2)

In the real system a rate is attached to a trading account, not to the programme. Replaces the rates rules in §15, §26 and §39.

- **Earning rates table (Earn)** shows the rates of the selected trading account; choosing another account changes the table. Rows come in the order the system gives them (highest first, the catch-all row last). Row names: `Forex`, `Metal`, `Energy`, `Indices`, `Stocks`, `Others`, or a symbol such as `XAUUSD` when a rate is set for one symbol.
- **A user without a trading account sees no rates table.** Instead: `70–100 coins per lot · up to 2,000 a day` (the programme's lowest and highest rate, and the daily maximum; one figure if lowest = highest; each half disappears when the programme has no value for it).
  - Not yet KYC, or no first deposit: that line is on the "How to start" card. The `See rates` link is removed. On Earn there is no Trading account card: the page is the "How to start" card and the rules.
  - KYC and first deposit done but no live trading account (only demo accounts, or the live account was removed): Earn shows the Today card as usual, then a card `Trading account` with `You don’t have a live trading account yet. Open one to start earning coins.`, the line above, and the button `Open a trading account`, which goes back to the app to open one.
- **All accounts not eligible:** nothing special. The selected account shows `Not eligible` and the usual notice.
- **Tour step 2** takes `Earn up to 100 coins per lot` from the programme's highest rate; without one the sentence is `Here’s how it works:`.
- **Daily maximum:** if the programme has none, the rule `Earn up to … coins per day` is not shown.
- **Who is "not yet KYC" / "no first deposit":** taken from the app's sign-in data, not from the loyalty system: KYC approval time = 0 → not yet KYC; KYC approved and first deposit time = 0 → no first deposit.

New preview state on Earn: `no-account`.

## 43. Coins history shows every credit; date ranges are limited to 30 days (decided 12 Oct 2026, phase 2)

Replaces the History rules in §17 and the filter rules in §15.

- **Coins, History tab:** every movement of the balance is its own row, with its time after the label: `Trading 14:12 … +80`. Coins from trading arrive several times a day and are **not merged** into one row per day. Rows are grouped under their day (`Today`, `13 Oct`, …), newest first; the rows are tighter than before because there are more of them.
- **Row labels:** coins received show where they came from (`Trading`, `Daily check-in`, `Adjustment`); `Redeemed reward`; `Refund`; `Expired`; `Adjustment` (added or removed by hand).
- **Date on a lot** (Available and Expired tabs, `Trading · 6 Oct`): the day the coins reached the balance, not the trading day. At launch both are the same day.
- **Custom date range** (Earn history, Coins Expired and History): at most 30 days. After the first day is picked, days more than 29 days later cannot be chosen; the calendar says `You can select up to 30 days.`

## 44. Loading, failed to load, and long lists (decided 12 Oct 2026, phase 2; design to be confirmed)

These appear only with real data; the sample data is instant, so each has a preview state.

- **Loading** (all three pages; state `loading`): the page header stays (on Earn, on its dark sky), and under it three grey placeholder cards that pulse gently: one short card with a circle and two bars, two cards with bars. The bottom bar stays. No tour, no live activity line. With reduced motion the placeholders do not pulse.
- **Failed to load** (all three pages; state `error`): the header, then one card: an info icon, `Couldn’t load this page`, `Check your connection and try again.`, and the button `Try again`, which asks for the data again. The bottom bar stays, so the user can still leave or change page.
- **Long lists** (Coins: Available, Expired, History): 15 rows at a time. When the user scrolls to the end of the list, a small spinner with `Loading more…` shows while the next 15 rows load, then they are added below. Changing the date range starts again from the first 15.
- **Next rows failed to load** (state `more-error` on Coins): `Couldn’t load more. Try again` at the end of the list; tapping `Try again` loads them.
- The Earn history has no paging: it is at most 30 days, one row a day.

## 45. Where the data comes from (recorded 12 Oct 2026, phase 2)

For reference; the full mapping is in `HANDOFF-2.md` §4.

- Balance and the expiry warning, today's lots and coins, programme rules, trading accounts and their rates, the Earn history, coin lots and the coin history come from six loyalty endpoints.
- Whether the user still needs KYC or a first deposit comes from the app's sign-in data.
- Fixed in the pages, not sent by any endpoint: "within 15 minutes", the 10-day expiry warning, the 00:00 start of the earning day, the live activity line (simulated), the tour's simulated balance, the reward tiles on Home.
- Still to arrive from backend: the programme's rate range, the Terms & Conditions address, and the holding time in seconds. Until then users without a trading account see no rate figure, the Terms & Conditions button is hidden, and the holding time is shown in whole minutes.
- Today's lots are the lots already counted for coins, so they match the history; on a day that reached the maximum they are lower than the lots actually traded.

## 46. Event tracking (decided 12 Oct 2026, phase 2)

The pages send analytics events to Google Tag Manager, which forwards them to GA4. The full list, with when each event is sent and its parameters, is in `TRACKING.md` (22 events, all named `loyalty_<thing>_<action>`).

- They answer five questions: how users move from "How to start" to KYC, deposit and trading; how much interest there is in rewards; which pages and tabs are used; whether the tour is finished; how often a page fails to load.
- Every event carries the page, the colour mode, whether the user has a trading task, the step still to take (KYC / deposit / none), the crediting mode, and the balance as a range.
- Never sent: account numbers, the exact balance, names or other personal data. The client id is attached by GTM at sign-in, not by the pages.
- In the demo, a floating `Events` button (bottom left) lists the events as they are sent, so tracking can be checked without GTM. It is not part of the product.

## 47. Fixes from the QA with real UAT accounts (decided 14 Oct 2026)

- **Delayed programme, coins waiting:** the Today card shows no line under the figures, as §41 says. It used to show "Your lots and coins will show up here after your first trade." because the lots read 0 while coins wait; the `pending` status is now checked first.
- **Singular wording:** "1 day" and "1 minute" instead of "1 days" and "1 minutes", in the rules for crediting, expiry and holding time.
- **Dates carry the year when it is not the current year:** "Expires 21 Mar 2027", "Expired 4 Oct 2025". Dates of the current year stay "21 Mar". Applies to every short date (lots, history group titles, date filter chips).
- **Programme ended:** the pages only say that the programme has ended, and nothing can be tapped.
  - Home: the Daily Trading card keeps its cup and title and shows "This program has ended". No figures, no `Details`, no button, and the card is not a link.
  - Earn: under the cup, only "This program has ended". No Today figures, no trading account, no rates, no rules or history.
  - The line "Pending coins will still be credited." is removed.

New preview state on Home: `ended`.

## 48. Fixes from the owner's manual test on the UAT app (decided 14 Oct 2026)

- **Trade buttons** (`Trade now`, `Trade with account …`) open the app's market screen, like `Verify my account` and `Deposit now` open KYC and Deposit. `Trade with account …` also switches the app to that account.
- **`Open a trading account` opens the KYC screen.** Business rule: a user who has completed KYC always has a live trading account (it may be not eligible or blocked, but it exists). A user without one has not completed KYC.
- **Terms & Conditions opens inside the page,** in the bottom sheet of §40, never in an external browser. On Android, where the webview cannot show a PDF in a frame, the PDF is drawn inside the sheet by a PDF viewer library.
- **The pages feel like the app:** text cannot be selected, a long press shows no menu and no link preview, images cannot be dragged.
- **The tapping finger** under the "How to start" button stays above the cards that follow it; it is never hidden behind them.
- **The glow around the large balance coin** is drawn as a soft gradient behind the coin, not as a CSS shadow filter, which some phones painted as a square box.
- **Dates always carry the year** (decided 14 Oct 2026, replaces the §47 rule "year only when not the current year"): "19 Oct 2026", "Expires 21 Mar 2027", day titles of the coin history "13 Oct 2026", lot lines "Trading · 22 Sep 2026", date filter chip "1 Oct 2026 – 14 Oct 2026".

## 49. Home with a rewards grid, Redeem asks for KYC and first deposit (decided 16 Oct 2026, phase 3)

Asked for by business users. First part of a larger update; the Earn tiers (account label from the MT5 group and an upgrade sheet) and the guided tour come later.

- **The Daily Trading card is removed from Home,** with everything in it: today's figures, the live "Trader … just earned" line, `Trade now`, `Details`, the capped message, "How to start" and "This program has ended". Earn keeps all of these.
- **Rewards grid** in place of the three image tiles: up to 10 cells, 2 per row, under the existing title "Redeem coins for rewards".
  - A reward card shows the reward's image, name, price in coins and a `Redeem` button. The whole card can be tapped and opens that reward in Tada (intent `reward`, with the reward's id).
  - Behind each reward image: a soft, even purple backdrop, low in contrast (decided 19 Oct 2026).
  - A card looks the same whether or not the balance covers the price; Tada handles a balance that is too low.
  - The price and a small `Redeem` share the bottom row of the card. When a price is too long for that (about 6 digits and up on a 375px screen), `Redeem` moves under the price, at the right, on **every** card of the grid, so all cards keep the same layout. The number is never cut or shortened (decided 19 Oct 2026).
  - The 3rd cell is an "earn coins" card that opens Earn. It is hidden when the user has no trading task or the programme has ended; the grid then shows rewards only.
  - API: the rewards come from an HSB API (a fixed list). The fields and the mapping come later; the mock data and images are placeholders until the owner supplies them.
- **"Looking for something else?" card** under the grid, full width (decided 19 Oct 2026): a blue gift box image, the title, one line ("You have 3,100 coins to spend. Browse every voucher, gadget and trip in the rewards store."; without coins, only the second sentence) and an `Explore all rewards` button to Tada (intent `redeem`, the store). Gated like every Redeem.
- **Redeem asks for KYC and a first deposit first.** On every Redeem button (the balance block on Home and Coins, every reward card): a user who still needs KYC or a first deposit gets a bottom sheet with "How to start" (the same steps, rate line and button as on Earn, §39) instead of going to Tada. A user who has made a first deposit goes to Tada as before.
- **Events** (existing names kept): reward cards send `loyalty_reward_click` with `position` (1–10, the cell in the grid) and `reward_id`; the "earn coins" card sends `loyalty_card_click` with `target` = `earn`, and `Explore all rewards` sends it with `target` = `rewards`; the sheet sends `loyalty_join_card_view` with `source` = `redeem` (the card on Earn sends `source` = `card`), then `loyalty_kyc_click` / `loyalty_deposit_click` as before. `loyalty_trade_click` and `loyalty_daily_cap_view` are no longer sent from Home.

Home preview states removed: `capped`, `no-trades-today`, `market-closed`. Coins gets `needs-kyc` and `needs-deposit`.

## 50. Recent activity card on Home (decided 19 Oct 2026, phase 3)

- A small card between the balance and "Redeem coins for rewards" on Home, and the same card on Earn under the Today card (not when the programme has ended). One entry at a time: an icon, the message, the time since it happened.
- Home and Earn are linked: one list and one place in the loop for the session, so switching tabs goes on with the next entry. It replaces the live "Trader … just earned" line of §31 on Earn (that line and its demo generator are removed; preview state `market-closed` is gone).
  - Reward redeemed: gold gift box, "Trader 95***442 just redeemed iPhone 16 Pro", "3d ago". While a reward entry is on screen, the card takes a light purple tint so it stands out (option under review, 19 Oct 2026).
  - Coins earned: coin, "Trader 95***356 just earned 12 coins", "3m ago".
  - Time, short: "Now", "3m ago", "2h ago", "3d ago".
- Data: a list from the backend (new API, to be defined). The page asks for it once per session, keeps it for the session and loops over it. Each entry: kind (gift or coin), the client (masked by the backend), the reward name or the coins, the time.
- Order: newest first within each kind. The two kinds take turns in rounds of 1 coin entry : 1 reward, 2 : 1, 3 : 1 and 3 : 2 (the rewards of a round come first), played in a shuffled order, one round of each, then shuffled again, so rewards come thicker in some stretches and thinner in others (decided 19 Oct 2026). Each kind loops on its own when it runs out; if one kind is missing, the other loops alone.
- Draft choices to confirm: a new entry every 4 seconds; a message takes two lines at most and the card always keeps room for two lines, so its height never changes; with an empty list the card is hidden.

New preview state on Home and Earn (shared): `activity-empty`.

## 51. Account tiers and the way up on Earn (decided 16 Oct 2026, built 19 Oct 2026 as a first draft, phase 3)

Asked for by business users: give users a reason to deposit more into an account. Draft built from the owner's brief; the owner reviews and corrects.

- **Tier label.** Each trading account belongs to an MT5 group, which the page shows as a tier, right after the account number (eligible accounts only), in the account field and in the account sheet (changed 19 Oct 2026). Mapping, fixed in the front end: `Mini400` → Micro, `Mini10` → Standard, `VIP1` → VIP, `MIVIP` → Platinum. A group not in this list shows no tier and no upgrade row.
- **Tiers by lifetime deposit** (total deposited into that account, USD): Micro under 200, Standard 200 to under 1,000, VIP 1,000 to under 5,000, Platinum 5,000 and over. A higher tier earns more coins per lot.
- **Upgrade row** right under the account field, above the rates (eligible accounts with a known tier; moved 19 Oct 2026): "Want more coins per lot?" with "Upgrade to {next tier}: up to {n} coins per lot". Icon: a money bag. On Platinum it reads "{Platinum}: our highest rates" / "See your account tier" instead, with a crown, and is deliberately quiet (no border, grey surface, softer title): there is nothing left to upgrade. Either way, tapping it opens the tier sheet. The row is its own block under the account field (an option joining it to the field was tried and dropped, 19 Oct 2026).
- **Tier sheet** (bottom sheet), for the selected account:
  - The account number; the four tiers as steps, only the account's tier ticked (the tiers below it filled, no tick).
  - Below Platinum: the lifetime deposit against the next tier's threshold ("$2,350 of $5,000 deposited", with a bar) and "Deposit $2,650 more to reach Platinum."; a `Deposit now` button: it opens the app's Deposit screen for that account with the missing amount already filled in (the "$2,650" of the line above, decided 19 Oct 2026; the parameter names are to be agreed with the app team). If the deposit already reaches the next tier (the group has not changed yet), a line says the upgrade is on its way instead of an amount.
  - On Platinum: "You're on the top tier", "This account already earns our highest rates: up to {n} coins per lot." and a `Trade with account …` button.
  - In both cases, a table of coins per lot on **every** tier (one column per tier, one row per rate row), the account's tier highlighted, with "Now" in a light pill above its name. When it is too wide for the screen, the first column (the symbol group) stays in place and the tier columns scroll sideways; the sheet opens scrolled to the account's column (changed 19 Oct 2026).
  - The sheet's button stays visible at its bottom edge while the rest scrolls. In the table, a symbol row (e.g. XAUUSD) on a tier that does not list it shows "—" for now: the page cannot tell which group a symbol falls in.
  - A note: tiers depend on the total deposited into that account.
- **API** (new, to be defined with the backend): per account its MT5 group and lifetime deposit; for the programme the full set of tiers, each with its group, deposit threshold and rates (same rows as an account's rates). The front end only holds the group → label mapping.
- **Events:** tapping the upgrade row sends `loyalty_upgrade_open` with `tier` (current) and `next_tier` (none on Platinum); `Deposit now` in the sheet sends `loyalty_deposit_click` with `source` = `upgrade`.

New preview states on Earn: `tier-micro`, `tier-standard`, `tier-top`, `tier-reached`, `tier-unknown`.

## 52. Redemption history (decided 19 Oct 2026, phase 3; first draft from the backend's brief)

A new page listing the user's reward orders (redeemed in Tada) and the details of each, so users can follow an order and find their voucher codes without leaving the app.

- **Way in:** on Coins, a small `Redemption history` text button under `Redeem` in the balance card. It opens the page.
- **The page** (`pages/redemptions.html`) has no bottom bar; its header has a back button. The list's back goes to Coins; an order's back goes to the list (and the app's Back does the same).
- **List** (newest first): one row per order: the first reward's name, the order number, the order date, the coins spent and a status badge. The whole row opens the order. Empty: "No redemptions yet" and a button to the rewards store. Loading and error as §44.
- **Statuses** (normalised by the backend): `new` → "Order placed" (blue), `on process` → "Processing" (yellow), `completed` → "Completed" (green), `canceled` → "Cancelled" (grey), `failed` → "Failed" (red). Phase 1 has only the current status and the time of the last change: a badge and "Updated {date, time}". No step-by-step timeline (no data for it yet).
- **Order details:** the status badge and last update; order number (copyable), order date, coins spent; when `refunded`, a note that the coins went back to the balance. Then each item: name, kind, quantity, and one block by kind:
  - e-voucher: code and PIN hidden until the user taps `Show`, then copyable; a button to open the voucher link; "Valid until {date}".
  - PLN token / mobile credit: the serial number hidden until `Show`, then copyable; the message.
  - physical goods: courier, AWB number (copyable), tracking number; and the recipient (name, address, postal code).
- **Never shown:** any IDR amount (reward price, fees, order value). The page shows coins only (`coinSpent`). The backend strips every IDR value from its answers (decided 19 Oct 2026).
- **API** (HSB backend, not Tada; the app token is sent): `GET /loyalty/orders?clientId=…&page=…&pageSize=…` for the list, answering `{ orders: [...], page, pageSize, total }` with `firstItemName` in each summary, newest first (settled with the backend 20 Oct 2026: `page` from 1, `pageSize` 20 by default, at most 100; the backend takes the client from the app token and answers 403 when the query's `clientId` differs; both answers wrapped in `{ success, result }`); the list loads 20 at a time and the next page on scroll, until it holds `total`; `GET /loyalty/orders/{orderReference}` for one order (403 when it is not the user's). Codes, PINs and serial numbers arrive in clear; the page hides them until asked.
- **Events:** `loyalty_orders_open` (the button on Coins), `loyalty_order_open` (`status`), `loyalty_code_reveal` and `loyalty_code_copy` (`kind`: `code` | `pin` | `serial` | `awb` | `order`), `loyalty_voucher_open`. `page` = `orders` on this page.

Still open with the backend: an item count and an image per order in the list (the list shows the first reward's name only for now).

Preview states on the new page: `orders-empty`, `orders-more`, `loading`, `error`; an order opens with `?order=<orderReference>`.

## 53. Guest mode: the pages before the user signs in (decided 20 Oct 2026, phase 3)

Users who have not signed in can open the loyalty pages to see the rewards and how to earn coins. Anything that needs an account asks them to sign up or log in.

- **Guest = no token.** When the app opens the webview without a token (`initWebview` with no `token`), the pages run in guest mode. No separate page: Home, Earn and Coins (and the bottom bar) are the same, in their guest version.
- **Sign-up prompt:** the "How to start" sheet (§49), with a first step "Create your free account" before Verify, Deposit and Trade, the programme's rate line, a `Sign up` button (app screen `/sign-up`) and "Already have an account? Log in" (`/login`). After signing up or logging in, the app does not bring the user back to these pages; they find their way back themselves.
- **What opens it:** Redeem on the balance, the balance itself, every reward card, `Explore all rewards`, `Redemption history` on Coins.
- **Home:** balance 0; the rewards grid from the guest rewards API (same data shape as the signed-in one); the recent activity card (its API needs no token); the "Earn more coins" card goes to Earn.
- **Earn:** general information only: "How to start" (four steps, the rate line "70–100 coins per lot · up to 2,000 a day", "Coins per lot depend on your trading account type.", `Sign up`, `Log in`) in place of today's figures, then the rules (hold time, crediting, expiry, new day, daily maximum; each left out when its value is missing) and Terms. No trading account, no History tab, no trade button, and no table of tiers (decided with the backend 20 Oct 2026: the detailed rates show only to a signed-in user with an eligible account). The same sentence is added to the "no live account" card of signed-in users.
- **Guest trading-task API:** `POST /pointSys/app/point/guest/tradingTask/get` (name may change), no Authorization, no `clientId`, still `x-auth-key`; the same answer as `tradingTask/get` for a user with no live account (`today` not_started, all 0, `accounts` []), read by the same adapter.
- **Coins:** balance 0 and a card inviting the user to sign up or log in, in place of the Available / Expired / History tabs.
- **Tour:** runs for guests as for everyone.
- **APIs:** in guest mode the pages call only the guest APIs (rewards, trading task, recent activity) and never the ones that need a token (balance, coin lots, history, orders, tiers per account).
- **Events:** `join_step` = `signup` for guests (so every event can be split); new `loyalty_login_prompt_view` (`from`: `redeem` | `balance` | `reward` | `explore` | `history`), `loyalty_signup_click` and `loyalty_login_click` (`source`: `card` | `redeem`, like `loyalty_join_card_view`).
- **Open item:** the recent activity API (§50) does not exist yet; the guest version needs no token.

Preview state, on every page (shared): `guest`.
