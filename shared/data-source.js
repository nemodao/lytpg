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

import { joinRequirementFrom, toAccounts, toBalance, toDashboardPage, toOrder, toOrdersPage, toPointBalancePage, toProgram, toTiers, toTradingTaskPage } from './api-adapter.js';

const USE_API = new URLSearchParams(location.search).get('source') === 'api';

const getJSON = (path) =>
  fetch(path).then((res) => {
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  });

// API: one call to the loyalty API. `endpoint` is the path after /pointSys/app/point/, e.g. 'tradingTask/get'.
// Real call: POST, JSON body { clientId, timestamp (seconds), ...body }, same authentication as the app's check-in
// calls. Anything other than `success === true` is a failure: throw, and the page shows its error view (spec §44).
// Here: the sample answer in mock/api/<endpoint with "/" replaced by "-">.json.
const cache = new Map();
function request(endpoint, body = {}) {
  const key = endpoint + JSON.stringify(body);
  if (!cache.has(key)) {
    cache.set(key, getJSON(`../mock/api/${endpoint.replace('/', '-')}.json`).then((answer) => {
      if (answer.success !== true) throw new Error(`${endpoint}: ${answer.message}`);
      return answer; // { result, timestamp (server time, milliseconds), ... }
    }));
  }
  return cache.get(key);
}
const result = (endpoint, body) => request(endpoint, body).then((answer) => answer.result);

// API: the app already holds the sign-in answer (/app/signin); only kycApproveTime and firstDepositTime are read.
const signin = () => getJSON('../mock/api/signin.json').then((answer) => answer.result);

// Not sent by the loyalty API: the tour's simulated balance (a UI constant),
// the rewards grid on Home (HSB's rewards API, to be mapped; mock until then) and the check-in card (its own API, off
// for now).
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
// API: the recent activity list (endpoint to be defined by the backend). The demo reads the mock.
const activityList = () => sessionCached('hsb-loyalty-activity-v3', () => getJSON('../mock/common.json').then((common) => common.activity));

// Date ranges and paging. API: the three list endpoints take from / to (at most 30 days) and pageNo / pageSize;
// send the range of the date filter and ask for the next page as the user scrolls (spec §43, §44). The demo asks
// once and filters and pages in the browser.
const taskGet = () => result('tradingTask/get');

async function commonFromApi() {
  const [taskAnswer, summary, user, ui, tierInfo] = await Promise.all([request('tradingTask/get'), result('coin/summary'), signin(), uiOnly(), result('tradingTask/getTiers')]);
  const task = taskAnswer.result;
  // API (guest mode, spec §53): when the app opened the page without a token, set `guest: true` and build `common`
  // from the guest APIs instead (no token): the guest trading-task API for `program` (joinRequirement "signup") and
  // `tiers`, balance 0, no accounts, the recent activity list. Never call the endpoints that need a token. The guest
  // trading-task API is requested from the backend; until it exists the mock's `guest` state stands in.
  return {
    guest: false,
    now: new Date(taskAnswer.timestamp).toISOString(), // server time
    balance: toBalance(summary),
    program: toProgram(task, user),
    accounts: toAccounts(task, tierInfo),
    tiers: toTiers(tierInfo),
    activity: await activityList(),
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

async function pageFromApi(page) {
  if (page === 'redemptions') {
    const first = toOrdersPage(await getOrders(`loyalty/orders?page=1&pageSize=${ORDERS_PAGE_SIZE}`));
    return { orders: first.orders, total: first.total };
  }
  const task = await taskGet();
  if (page === 'dashboard') return toDashboardPage(task, await uiOnly());
  if (page === 'trading-task') {
    // No history call for a user without a trading task.
    return toTradingTaskPage(task, task.tradingTask ? await result('tradingTask/getHistory') : null);
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
