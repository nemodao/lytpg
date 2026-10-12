# Handoff 3 — what changed since handoff 2

**Who this is for:** developers (and their AI assistants) who have already applied handoff 2.
Everything not named here is unchanged. Exact line changes: `CHANGES-since-handoff-2.diff`.

**Status:** in progress (started 12 Oct 2026). Items are added here as they are made.

---

## 1. Changes

### 1.1 The three new programme fields are on UAT, and two empty values to handle

Backend released `program.rateRange`, `program.termsUrl` and `program.minHoldSeconds` on UAT on 12 Oct 2026. The
code from handoff 2 already reads them; two edge cases were missing:

| Case | What the user must see | Change |
|---|---|---|
| `program.termsUrl` is an empty string `""` (not only null or missing) | No `Terms & Conditions` button | `shared/api-adapter.js`, `toProgram`: `termsUrl: program.termsUrl \|\| null` (was `?? null`). In your code, test "has content", not "is not null" |
| `program.minHoldSeconds` is `0` (the programme has no minimum holding time) | The rule "Hold each position for at least …" is not shown | `shared/components.js`, `rulesList`: the rule is rendered only when `minHoldSeconds > 0` |

Also: `mock/api/check.mjs` checks both cases; `HANDOFF.md` §5 no longer says the fields are missing on UAT.

Good to know, no code change:

- The Terms & Conditions file is in Indonesian for now, while the interface is in English.
- `rateRange.min` / `.max` and `ptsPerLot` can be decimals (`12.5`); the pages already show them as sent.
- Coins arrive within 15 minutes on production too (confirmed): the fixed text "Updates within 15 mins" stays.

---

## 2. Data contract and states

- `DATA.md`: wording of `program.minHoldSeconds` (0 hides the rule). No field added or removed.
- `STATES.md`: unchanged.
