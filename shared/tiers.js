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

// The user's tier for analytics (user property `loyalty_tier`, TRACKING.md): a tier belongs to one trading account,
// so a user with several takes the highest tier among their eligible accounts; 'none' when no eligible account is on
// one of the four tiers.
export function highestTier(accounts = []) {
  const at = Math.max(-1, ...accounts.filter((item) => item.eligible)
    .map((item) => TIERS.findIndex((tier) => sameGroup(item.group, tier.group))));
  return at < 0 ? 'none' : TIERS[at].key;
}
