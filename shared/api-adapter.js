// API ADAPTER — turns the answers of the real loyalty API into the shapes the pages read (DATA.md).
// Pure functions: no fetch, no DOM. `shared/data-source.js` calls them; pages never see an API field name.
//
// The six endpoints (all POST, JSON, under /pointSys/app/point/) and what each feeds:
//   tradingTask/get         -> common.program, common.accounts, Home task card, Earn today + selected account
//   tradingTask/getHistory  -> Earn history
//   coin/summary            -> common.balance
//   coin/listAvailable      -> Coins, Available tab
//   coin/listExpired        -> Coins, Expired tab
//   coin/ledger             -> Coins, History tab
// Every function below takes the `result` object of a successful answer ({ success: true, code: 200, result }).
// A field whose value is null may be missing altogether; both are read the same way here.

// Fixed in the UI: the API does not send these.
export const UI_CONSTANTS = {
  creditWithinMinutes: 15, // coins arrive within this long after a position is closed ("Updates within 15 mins")
  expiryWarningDays: 10, // window of `coin/summary.expiring` and `expiringSoon`
  resetTime: '00:00', // an earning day always starts at midnight in the programme's time zone
};

// Whether the user still has a step to take before earning. NOT part of the loyalty API: it comes from the app's
// sign-in data (/app/signin -> result). Both fields are times in milliseconds, 0 when it has not happened.
export function joinRequirementFrom(signin) {
  if (!signin) return null;
  if (!(signin.kycApproveTime > 0)) return 'kyc';
  if (!(signin.firstDepositTime > 0)) return 'deposit';
  return null;
}

// tradingTask/get -> common.program
// `{ tradingTask: false }` (the only field in that case) hides every trading part of the UI.
export function toProgram(task, signin) {
  if (!task || task.tradingTask !== true) return { tradingTask: false, joinRequirement: null, ...UI_CONSTANTS };
  const program = task.program;
  // minHoldSeconds is the exact value (minHoldMinutes is rounded down); it can be 0 = no minimum.
  const holdSeconds = program.minHoldSeconds ?? program.minHoldMinutes * 60;
  return {
    tradingTask: true,
    ended: program.ended === true,
    creditMode: program.creditMode, // "in-day" | "delayed"
    creditDelayDays: program.creditDelayDays ?? 0,
    minHoldMinutes: Math.floor(holdSeconds / 60),
    minHoldSeconds: holdSeconds,
    expiryDays: program.expiryDays,
    dailyMaxPoints: program.dailyMaxPoints ?? null, // null = no daily maximum
    tzMinutes: program.tzMinutes, // send this as `tzMinutes` to the three coin list endpoints
    rateRange: program.rateRange ?? null, // null = the programme has no rate yet: no rate range shown
    termsUrl: program.termsUrl || null, // null, missing or an empty string all mean: no Terms & Conditions button
    joinRequirement: joinRequirementFrom(signin),
    ...UI_CONSTANTS,
  };
}

// tradingTask/get -> common.accounts. Account ids are numbers in the API and text in the UI.
export const toAccounts = (task) =>
  (task?.accounts ?? []).map((account) => ({
    id: String(account.id),
    eligible: account.eligible === true,
    rates: account.rates ?? [], // { type, value, ptsPerLot }: used as sent
  }));

// coin/summary -> common.balance. `pending` is sent by the API but never shown (spec §41).
export const toBalance = (summary) => ({
  available: summary.available,
  expiring: summary.expiring > 0 ? { points: summary.expiring } : null,
});

// tradingTask/get -> Earn's `today`. "You traded" is `lotsValid` (lots already counted for coins), so it matches the
// lots of the history rows and rises together with `points`.
const toToday = (task) => {
  const today = task?.today ?? {};
  return { lots: today.lotsValid ?? 0, points: today.points ?? 0, status: today.status ?? 'not_started', capped: today.capped === true };
};

// tradingTask/get -> the Home page's data. `rewards` and `checkIn` are not part of these endpoints: pass what the
// page should show (static reward tiles; the check-in card has its own API and is off for now).
export function toDashboardPage(task, { rewards, checkIn }) {
  const today = toToday(task);
  return { task: { lotsToday: today.lots, pointsToday: today.points, capped: today.capped }, rewards, checkIn };
}

// tradingTask/get + tradingTask/getHistory -> the Earn page's data.
export function toTradingTaskPage(task, history) {
  return {
    today: toToday(task),
    selectedAccountId: task?.selectedAccountId != null ? String(task.selectedAccountId) : null,
    // days[]: { date, lots, points, status, capped }, newest first; used as sent. The page hides `pending` days.
    history: history?.days ?? [],
  };
}

// coin/listAvailable + coin/listExpired + coin/ledger -> the Coins page's data.
// `task` (tradingTask/get) is only needed to mark today's lot of a same-day programme as "Earning today".
export function toPointBalancePage(available, expired, ledger, task) {
  const today = task?.today;
  const earningToday = (lot) => lot.source === 'trading' && today?.status === 'earning' && lot.earnedOn === today.periodKey;
  const availableLots = (available?.items ?? []).map((lot) => ({
    list: 'available',
    source: lot.source,
    earnedOn: lot.earnedOn, // the day the coins reached the balance
    total: lot.total,
    remaining: lot.remaining,
    status: lot.status === 'used' ? 'used' : earningToday(lot) ? 'earning' : 'active',
    expiresAt: lot.expiresAt,
    expiringSoon: lot.expiringSoon === true,
  }));
  const expiredLots = (expired?.items ?? []).map((lot) => ({
    list: 'expired',
    source: lot.source,
    earnedOn: lot.earnedOn,
    total: lot.total,
    remaining: lot.expired, // coins lost at expiry; 0 when everything was used first
    status: lot.expired > 0 ? 'expired' : 'used',
    expiresAt: lot.expiredAt,
    expiringSoon: false,
  }));
  return {
    items: [...availableLots, ...expiredLots],
    // items[]: { happenedAt, date, type, source, points }, newest first; used as sent, one row per credit.
    history: ledger?.items ?? [],
  };
}
