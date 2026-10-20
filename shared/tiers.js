// Account tiers (spec §51). API (tradingTask/get): `accounts[].group` is the account's full MT5 group name,
// `accounts[].lifetimeDeposit` its approved deposits in USD (0 when none), `common.tiers[]` = { group, rates } per group
// the programme has rates for, unsorted. Only these four groups are tiers, matched exactly (any case): a group such as
// 1F\Direct\Mini10 is not one and shows no tier and no upgrade row. The order and the deposit thresholds are fixed here
// (confirmed by product, 20 Oct 2026); the rates always come from the API.
export const TIERS = [
  { key: 'micro', group: 'Direct\\Mini400', minDeposit: 0 },
  { key: 'standard', group: 'Direct\\Mini10', minDeposit: 200 },
  { key: 'vip', group: 'Direct\\VIP1', minDeposit: 1000 },
  { key: 'platinum', group: 'Direct\\MIVIP', minDeposit: 5000 },
];
export const sameGroup = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

// An account's place among TIERS (0 = Micro … 3 = Platinum); -1 when it is not eligible or not on one of the four.
export const tierIndex = (item) => (item?.eligible ? TIERS.findIndex((tier) => sameGroup(item.group, tier.group)) : -1);

// The user's tier for analytics (user property `loyalty_tier`, TRACKING.md): a tier belongs to one trading account,
// so a user with several takes the highest tier among their eligible accounts; 'none' when no eligible account is on
// one of the four tiers.
export function highestTier(accounts = []) {
  const at = Math.max(-1, ...accounts.map(tierIndex));
  return at < 0 ? 'none' : TIERS[at].key;
}

// Which trading account the pages show (spec §55). Earn shows it in the account field; Home and Coins show its tier
// next to "Coin Balance". One choice for the whole session: picked on Earn, kept in sessionStorage, so the three pages
// agree; a new session starts again from the default.
// Default: the eligible account on the highest tier; among several on that tier, the account the app trades with
// (`currentId`, API `selectedAccountId`) if it is one of them, else the first in the API's order. No account on a tier:
// the app's account, as before.
const CHOSEN_KEY = 'hsb-loyalty-account-v1';
export function defaultAccountId(accounts = [], currentId = null) {
  const top = Math.max(-1, ...accounts.map(tierIndex));
  if (top < 0) return currentId;
  const best = accounts.filter((item) => tierIndex(item) === top);
  return (best.find((item) => item.id === currentId) ?? best[0]).id;
}
// `previewId`: PREVIEW ONLY, a state that shows one account in particular (as if the user had picked it).
export function chosenAccountId(accounts = [], currentId = null, previewId = null) {
  const known = (id) => id != null && accounts.some((item) => item.id === id);
  if (known(previewId)) return previewId;
  let kept = null;
  try { kept = sessionStorage.getItem(CHOSEN_KEY); } catch { /* no storage: the default */ }
  return known(kept) ? kept : defaultAccountId(accounts, currentId);
}
export function rememberAccount(id) {
  try { sessionStorage.setItem(CHOSEN_KEY, id); } catch { /* not kept: the next page uses the default */ }
}
