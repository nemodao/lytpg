// DATA SOURCE — the only place these pages get data from. Nothing else in pages/ or shared/ calls fetch().
//
//   fetchCommon()      -> data shared by all pages          (shape: mock/common.json)
//   fetchPage(page)    -> data of one page                  (shape: the "default" object of mock/<page>.json)
//   fetchCopy()        -> UI strings, key -> text           (copy/en.json; swap the file to localise)
//   fetchPreview(page) -> PREVIEW ONLY: the named state overrides used by ?state=...; return {} with a real API
//
//   fetchOrder(ref)    -> one reward order, for Redemption history (spec §52)
//
// `page` is 'dashboard' | 'trading-task' | 'point-balance' | 'redemptions'. The shapes are documented field by field in
// DATA.md.
//
// Two sources:
//   1. Mock (default): the UI-shaped files in mock/. This is what the demo and the preview states use.
//   2. API (?source=api): the answers of the real endpoints, converted by shared/api-adapter.js. In this repository
//      the answers are the sample files in mock/api/ (same shape as the real ones).
// TO CONNECT THE REAL API: make `USE_API` true and replace the body of `request()` with the real call. Everything
// else in this file, in the adapter and in the pages stays as it is.

import { joinRequirementFrom, toAccounts, toActivity, toBalance, toDashboardPage, toOrder, toOrdersPage, toPointBalancePage, toProgram, toRewards, toTiers, toTradingTaskPage } from './api-adapter.js';

const USE_API = new URLSearchParams(location.search).get('source') === 'api';

const getJSON = (path) =>
  fetch(path).then((res) => {
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  });

// API: one call to the loyalty API. `endpoint` is the path after /pointSys/app/point/, e.g. 'tradingTask/get'.
// Real call: POST, JSON body { clientId, timestamp (seconds), ...body }, same authentication as the app's check-in
// calls. Anything other than `success === true` is a failure: throw, and the page shows its error view (spec §44).
// Here: the sample answer in mock/api/<endpoint with every "/" replaced by "-">.json.
const cache = new Map();
function request(endpoint, body = {}) {
  const key = endpoint + JSON.stringify(body);
  if (!cache.has(key)) {
    cache.set(key, getJSON(`../mock/api/${endpoint.replaceAll('/', '-')}.json`).then((answer) => {
      if (answer.success !== true) throw new Error(`${endpoint}: ${answer.message}`);
      return answer; // { result, timestamp (server time, milliseconds), ... }
    }));
  }
  return cache.get(key);
}
const result = (endpoint, body) => request(endpoint, body).then((answer) => answer.result);

// API: the app already holds the sign-in answer (/app/signin); only kycApproveTime and firstDepositTime are read.
const signin = () => getJSON('../mock/api/signin.json').then((answer) => answer.result);

// Not sent by the loyalty API: the tour's simulated balance (a UI constant) and the check-in card (its own API, off for
// now). The rewards come from rewardsList() below.
const uiOnly = () => Promise.all([getJSON('../mock/common.json'), getJSON('../mock/dashboard.json')])
  .then(([common, dashboard]) => ({ tour: common.tour, rewards: dashboard.default.rewards, checkIn: dashboard.default.checkIn }));

// A list asked for once per session and kept in sessionStorage for the rest of it (spec §50: the recent activity on
// Home). Without storage (private mode), it is simply asked for again.
async function sessionCached(key, loader) {
  try { const kept = sessionStorage.getItem(key); if (kept) return JSON.parse(kept); } catch { /* ask again */ }
  const value = await loader();
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* not kept */ }
  return value;
}
// API: the recent activity list (spec §50), from HSB (the Tada integration): GET /loyalty/activity, no Authorization and
// no clientId, only the x-auth-key header, for guests and signed-in users alike; { success, result: { activity } }.
// Asked for once per session, alongside the page's other calls. The card is hidden (activity = []) when the call fails,
// sends nothing, or has not answered within ACTIVITY_WAIT_MS: the page never waits longer for it. A late answer is
// still kept for the session, so the next page (or the other tab) shows the card; a failure is not kept, so the next
// page asks again.
// Here: mock/api/loyalty-activity.json (API mode) or mock/common.json.
const ACTIVITY_WAIT_MS = 3000;
const activityList = () => {
  if (!USE_API) return sessionCached('hsb-loyalty-activity-v3', () => getJSON('../mock/common.json').then((common) => common.activity));
  const asked = sessionCached('hsb-loyalty-activity-api-v1', () => getJSON('../mock/api/loyalty-activity.json')
    .then((answer) => { if (answer.success !== true) throw new Error(`loyalty/activity: ${answer.message}`); return toActivity(answer.result); }));
  return Promise.race([asked, new Promise((done) => { setTimeout(() => done([]), ACTIVITY_WAIT_MS); })]).catch(() => []);
};

// Date ranges and paging. API: the three list endpoints take from / to (at most 30 days) and pageNo / pageSize;
// send the range of the date filter and ask for the next page as the user scrolls (spec §43, §44). The demo asks
// once and filters and pages in the browser.
// Guest mode (spec §53): the app opened the page without a token. API: decide it from the token the app gives (none =
// guest). In this demo: ?source=api&guest=1. Guests call guest/tradingTask/get (no Authorization, no clientId; still
// the x-auth-key header): the same answer as tradingTask/get for a user with no live account (today not_started, all
// 0, accounts []), so the same adapter reads it. They never call an endpoint that needs a token.
const GUEST = USE_API && new URLSearchParams(location.search).get('guest') === '1';
const TASK_ENDPOINT = GUEST ? 'guest/tradingTask/get' : 'tradingTask/get';
const taskGet = () => result(TASK_ENDPOINT);

async function commonFromApi() {
  const activity = activityList(); // asked for at once, alongside the other calls
  if (GUEST) {
    const [taskAnswer, ui] = await Promise.all([request(TASK_ENDPOINT), uiOnly()]);
    const task = taskAnswer.result;
    return {
      guest: true,
      now: new Date(taskAnswer.timestamp).toISOString(),
      balance: { available: 0, expiring: null },
      program: { ...toProgram(task, null), joinRequirement: 'signup' },
      accounts: toAccounts(task),
      selectedAccountId: null,
      tiers: [],
      activity: await activity, // the recent activity API needs no token (spec §53)
      tour: ui.tour,
    };
  }
  const [taskAnswer, summary, user, ui] = await Promise.all([request('tradingTask/get'), result('coin/summary'), signin(), uiOnly()]);
  const task = taskAnswer.result;
  return {
    guest: false,
    now: new Date(taskAnswer.timestamp).toISOString(), // server time
    balance: toBalance(summary),
    program: toProgram(task, user),
    accounts: toAccounts(task),
    selectedAccountId: task.selectedAccountId != null ? String(task.selectedAccountId) : null, // the account the app trades with
    tiers: toTiers(task),
    activity: await activity,
    tour: ui.tour,
  };
}

// API: the HSB backend's order endpoints (spec §52): GET, with the app token; not the loyalty API above. `path` is e.g.
// 'loyalty/orders?page=1&pageSize=20' (add clientId=<the user's> to the query) or 'loyalty/orders/{orderReference}'.
// Settled with the backend: { success, result } like the loyalty API; the list's result is { orders, page, pageSize,
// total }, newest first, page from 1, pageSize at most 100. The backend takes the client from the token: 403 when the
// order, or the query's clientId, is not the user's (the page then shows its error view).
// Here: mock/api/loyalty-orders.json for the list and mock/api/loyalty-orders-detail.json for any one order.
function getOrders(path) {
  const file = path.startsWith('loyalty/orders/') ? 'loyalty-orders-detail' : 'loyalty-orders';
  return getJSON(`../mock/api/${file}.json`).then((answer) => {
    if (answer.success !== true) throw new Error(`${path}: ${answer.message || 'request failed'}`);
    return answer.result;
  });
}

// API: Home's rewards (spec §49), from HSB (the Tada integration), GET: /loyalty/catalog?clientId=… with the app token,
// or /loyalty/catalog-guest (app key only) for guests; { success, result: { rewards } }. A different backend from the
// rest of Home: when it fails, Home still opens, without the rewards grid (rewards = []).
// Here: mock/api/loyalty-catalog.json or loyalty-catalog-guest.json.
function rewardsList() {
  const file = GUEST ? 'loyalty-catalog-guest' : 'loyalty-catalog';
  return getJSON(`../mock/api/${file}.json`)
    .then((answer) => { if (answer.success !== true) throw new Error(`${file}: ${answer.message}`); return toRewards(answer.result); })
    .catch(() => []);
}

async function pageFromApi(page) {
  if (GUEST && page === 'point-balance') return toPointBalancePage(null, null, null, null); // nothing to ask for
  if (GUEST && page === 'redemptions') return { orders: [], total: 0 }; // guests never reach it
  if (page === 'redemptions') {
    const first = toOrdersPage(await getOrders(`loyalty/orders?page=1&pageSize=${ORDERS_PAGE_SIZE}`));
    return { orders: first.orders, total: first.total };
  }
  const task = await taskGet();
  if (page === 'dashboard') return toDashboardPage(task, { ...(await uiOnly()), rewards: await rewardsList() });
  if (page === 'trading-task') {
    // No history call for a user without a trading task.
    return toTradingTaskPage(task, task.tradingTask && !GUEST ? await result('tradingTask/getHistory') : null);
  }
  const tz = task.tradingTask ? { tzMinutes: task.program.tzMinutes } : {}; // without a task the backend uses GMT+7
  const [available, expired, ledger] = await Promise.all([
    result('coin/listAvailable', tz), result('coin/listExpired', tz), result('coin/ledger', tz),
  ]);
  return toPointBalancePage(available, expired, ledger, task);
}

export const fetchCommon = () => (USE_API ? commonFromApi() : getJSON('../mock/common.json'));

export const fetchPage = (page) => (USE_API ? pageFromApi(page) : getJSON(`../mock/${page}.json`).then((file) => file.default));

// Redemption history, the next page of the list (pageNo from 2). Mock: the mock holds every order, so nothing more.
export const ORDERS_PAGE_SIZE = 20;
export const fetchMoreOrders = (pageNo) => (USE_API
  ? getOrders(`loyalty/orders?page=${pageNo}&pageSize=${ORDERS_PAGE_SIZE}`).then((answer) => toOrdersPage(answer).orders)
  : Promise.resolve([]));

// One order of Redemption history. Mock: from the `details` list of mock/redemptions.json.
export const fetchOrder = (ref) => (USE_API
  ? getOrders(`loyalty/orders/${encodeURIComponent(ref)}`).then(toOrder)
  : getJSON('../mock/redemptions.json').then((file) => file.default.details.find((order) => order.orderReference === ref) ?? null));

export const fetchCopy = () => getJSON('../copy/en.json');

// PREVIEW ONLY: state overrides for the ?state= switcher. With a real API this returns {} (no states).
export const fetchPreview = (page) => getJSON(`../mock/${page}.json`).then((file) => file.states);

export { joinRequirementFrom };
