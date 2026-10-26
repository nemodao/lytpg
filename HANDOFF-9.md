# Handoff 9 — what changed since handoff 8

**Who this is for:** developers (and their AI assistants) who have already applied handoff 8, or are applying it now.
Everything not named here is unchanged. Behaviour: `spec.md` §76–§77. Exact line changes:
`CHANGES-since-handoff-8.diff` in the package. Small: it can be applied together with handoff 8.

**In one line:** the backend's guest endpoint and tier fields are on UAT, so guests get Earn back, and the way up
names the highest tier a deposit already reaches.

| § | What | You |
|---|---|---|
| 1 | Guests see Earn again | Revert your `bf4222e` (withdraws `HANDOFF-8.md` §2) |
| 2 | The way up points to the highest tier already reached | Small change on Earn's upgrade row and tier sheet |

---

## 1. Guests see Earn again (spec §77)

The backend's guest endpoint is on UAT and accepted (26 Oct 2026): `POST /pointSys/app/point/guest/tradingTask/get`,
no `authorization`, no `clientId`, still `x-auth-key`, the usual envelope. It answers like `tradingTask/get` for a
client with no live account: `tradingTask` true, the full `program`, `today` all 0 (`not_started`), `accounts` [],
no `tiers`, no `selectedAccountId`. So `HANDOFF-8.md` §2 is withdrawn and guests are back to `HANDOFF-6.md` (spec §53).

- **Reference:** `shared/data-source.js` calls `guest/tradingTask/get` again for guests (`TASK_ENDPOINT`), takes
  `now` from its `timestamp`, reads it with `toProgram` / `toAccounts`; sample `mock/api/guest-tradingTask-get.json`
  is back, and the `guest` preview state on every page is back to `{ guest: true, balance 0, joinRequirement
  'signup', accounts [] }` (the programme of the mock). `TRACKING.md`: the `has_task` note for guests is gone.
- **Yours:** revert `bf4222e` ("guests have no trading task"): that brings back `guestTask()` and the endpoint of
  your `d46e716`. Then a guest has the Earn tab, the "Earn more coins" card, the 4-step tour, the rate line in the
  sign-up sheet, the full rules, and `has_task` / `credit_mode` from the programme. A failed guest call shows the
  error view, like any failed call.
- Kept from `HANDOFF-8.md` §2: the crediting rule is left out when `creditMode` is missing (now only for a signed-in
  user with no trading task opening Earn directly).

## 2. The way up points to the highest tier already reached (spec §76)

Seen on UAT with test client K9: a Micro account (`Direct\Mini400`) with $50,000 deposited read "$50,000 of $200
deposited" and "Your deposits already reach Standard", although the deposit passes every threshold up to Platinum.

- **Reference** (`pages/trading-task.js`): new `targetTier(item, at)` = the highest tier above the account's whose
  `minDeposit` the `lifetimeDeposit` reaches, else the next tier (null on the top tier). The upgrade row's body
  (`upgrade.row.body` / `bodyNoRate`: tier name and its top rate) and the sheet's progress (`upgrade.progress`
  target, the bar, `upgrade.need` / `upgrade.reached`, and the Deposit button's `data-amount`) use it instead of
  `tiers[at + 1]`. Unchanged when the deposit reaches no tier above.
- Events unchanged: `next_tier` stays the next tier (`loyalty_upgrade_row_view`, `loyalty_upgrade_open`,
  `loyalty_deposit_click`).
- Preview: new state `tier-reached-far` on Earn (Micro, $50,000 deposited).
- Checked on UAT with K4, K5, K9 (26 Oct 2026): tier labels, the upgrade row, the sheet and the tier table read the
  API's new fields correctly; only K9's case changes with this rule.

## Waiting on others

- **Backend:** sample rewards in the UAT catalog (still `rewards: []`), so the rewards grid, the store and the
  reward page can be checked with real data.
- **App team, through you:** as in `HANDOFF-8.md` (the language field; `initWebview` also for guests; the Deposit
  intent's parameter names).
- **Order detail:** still waits for the Tada integration to be live (spec §70).

