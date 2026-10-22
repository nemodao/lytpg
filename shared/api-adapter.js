// API ADAPTER — turns the answers of the real loyalty API into the shapes the pages read (DATA.md).
// Pure functions: no fetch, no DOM. `shared/data-source.js` calls them; pages never see an API field name.
//
// The six endpoints (all POST, JSON, under /pointSys/app/point/) and what each feeds:
//   tradingTask/get         -> common.program, common.accounts, Earn today + selected account
//   tradingTask/getHistory  -> Earn history
//   (tradingTask/get also gives common.tiers and each account's group and lifetime deposit, spec §51)
//   POST /app/point/catalog        -> Home's rewards and the Reward Store (guests: clientId null), spec §49, §59
//   POST /app/point/orders         -> Redemption history list; POST /app/point/orders/detail -> one order (HSB backend,
//                                     spec §52)
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
// `group`: the full MT5 group name (e.g. Direct\VIP1), used as sent; the page decides which groups are tiers (spec §51).
// `lifetimeDeposit`: approved deposits into that account, USD (0 when none).
export const toAccounts = (task) =>
  (task?.accounts ?? []).map((account) => ({
    id: String(account.id),
    eligible: account.eligible === true,
    group: account.group ?? null,
    lifetimeDeposit: account.lifetimeDeposit ?? null,
    rates: account.rates ?? [], // { type, value, ptsPerLot }: used as sent
  }));

// tradingTask/get -> common.tiers: { group (full MT5 group name), rates } for each group the programme has rates for,
// unsorted (the page orders them and holds the deposit thresholds). The rates come from the same function as an
// account's rates, so they always agree. None for guests.
export const toTiers = (task) => (task?.tiers ?? []).map((tier) => ({ group: tier.group, rates: tier.rates ?? [] }));

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

// The Home page's data (spec §49). Nothing on Home comes from tradingTask/get any more. `rewards` comes from HSB's
// catalog (toRewards) and `checkIn` has its own API (off for now): pass what the page should show.
export function toDashboardPage(task, { rewards, checkIn }) {
  return { rewards: rewards.filter((reward) => reward.showOnHome), checkIn };
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

// Redemption history (spec §52). The backend normalises the status ("onprocess" -> "on process"); done here too in case.
export const ORDER_STATUSES = ['new', 'on process', 'completed', 'canceled', 'failed'];
const orderStatus = (value) => String(value ?? '').trim().toLowerCase().replace(/^onprocess$/, 'on process');

// POST /app/point/orders { clientId, page, pageSize } answers { orders: [...], page, pageSize, total } (settled with the
// backend, 20 Oct 2026). One summary per order; the first reward's name is `firstItemName`.
export const toOrdersPage = (answer) => ({
  orders: toOrders(answer?.orders ?? []),
  page: answer?.page ?? 1,
  pageSize: answer?.pageSize ?? 0,
  total: answer?.total ?? 0,
});

// The summaries of one page, newest first.
export const toOrders = (list) =>
  [...(list ?? [])]
    .map((order) => ({
      orderReference: String(order.orderReference),
      orderNumber: order.orderNumber ?? '',
      status: orderStatus(order.status),
      orderDate: order.orderDate,
      firstItemName: order.firstItemName ?? '',
      coinSpent: order.coinSpent ?? 0,
    }))
    .sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate));

// POST /app/point/orders/detail { orderReference } -> the order the details view shows. No money values: the backend strips every
// IDR amount (price, fees, value) and the page shows coins only (spec §52). Each item carries at most one of
// evoucher (e-gifts), token (PLN, mobile credit) or tracking (physical goods); the others are null.
export const toOrder = (order) => ({
  orderReference: String(order.orderReference),
  orderNumber: order.orderNumber ?? '',
  status: orderStatus(order.status),
  orderDate: order.orderDate,
  lastStatusAt: order.lastStatusAt ?? order.orderDate,
  coinSpent: order.coinSpent ?? 0,
  refunded: order.refunded === true,
  items: (order.items ?? []).map((item) => ({
    name: item.name ?? '',
    type: item.type ?? '',
    quantity: item.quantity ?? 1,
    status: orderStatus(item.status),
    evoucher: item.evoucher ?? null,
    token: item.token ?? null,
    tracking: item.tracking ?? null,
  })),
  recipient: order.recipient ?? null,
});

// POST /app/point/catalog { clientId } (guests: clientId null) -> the rewards of Home (spec §49)
// and of the Reward Store (spec §59). The backend sends every reward on show for the user's client group (guests: the
// default group; about 50), in display order. `id` is HSB's own key (point_featured_gift.id). Images are hosted by HSB:
// square, transparent background, product centred, at least 460px.
// Added for the store (confirmed by the backend 22 Oct 2026): `category` (one of
// STORE_CATEGORIES, anything else is kept and shows under "All" only), `description` (one line), `badge` ('hot' | 'new')
// and `showOnHome` (Home's grid takes only these).
export const STORE_CATEGORIES = ['gadget_electronics', 'tour_travel', 'shopping_voucher', 'fnb_voucher', 'home_living'];
export const toRewards = (catalog) =>
  (catalog?.rewards ?? []).map((reward) => ({
    id: String(reward.id),
    name: reward.name ?? '',
    points: reward.points ?? 0,
    image: reward.image ?? '',
    category: reward.category ?? null,
    description: reward.description ?? null,
    badge: ['hot', 'new'].includes(reward.badge) ? reward.badge : null,
    showOnHome: reward.showOnHome === true,
  }));

// POST /app/point/activity (no token, no clientId; x-auth-key only) -> common.activity (spec §50). One list for everyone,
// guests included: the latest trading-coin credits and the latest redemptions, each kind at most N (backend config),
// newest first; the page sorts and interleaves them itself. Gift: { type, client, reward, at }; coin: { type, client,
// points, at }; `client` masked by the backend, `at` ISO 8601 UTC. Entries of another kind, or missing a field, are dropped.
export const toActivity = (answer) =>
  (answer?.activity ?? []).flatMap((item) => {
    if (!item?.client || !item.at) return [];
    if (item.type === 'gift' && item.reward) return [{ type: 'gift', client: item.client, reward: item.reward, at: item.at }];
    if (item.type === 'coin' && item.points > 0) return [{ type: 'coin', client: item.client, points: item.points, at: item.at }];
    return [];
  });
