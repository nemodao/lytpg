// DATA SOURCE — the only place these pages get data from. Nothing else in pages/ or shared/ calls fetch().
//
//   fetchCommon()      -> data shared by all pages          (shape: mock/common.json)
//   fetchPage(page)    -> data of one page                  (shape: the "default" object of mock/<page>.json)
//   fetchCopy(lang)    -> UI strings, key -> text           (copy/<lang>.json: en, id or zh, spec §75)
//   fetchPreview(page) -> PREVIEW ONLY: the named state overrides used by ?state=...; return {} with a real API
//
//   fetchOrder(ref)    -> one reward order, for Redemption history (spec §52)
//
// `page` is 'dashboard' | 'trading-task' | 'point-balance' | 'redemptions' | 'store' (the Reward Store and its reward
// page, spec §59). The shapes are documented field by field in
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
// API: Plan B (spec §61): true while the in-webview Reward Store stands in for Tada. Not sent by the loyalty API: a
// switch on HSB's side (build setting or remote config).
const REWARD_STORE = false;

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
// API: the recent activity list (spec §50), from HSB (the Tada integration): POST /app/point/activity, no Authorization
// and no clientId, only the x-auth-key header, for guests and signed-in users alike, in the loyalty API's request
// envelope with no other field (timestamp still required: spec §65); { success, result: { activity } }.
// Asked for once per session, alongside the page's other calls. The card is hidden (activity = []) when the call fails,
// sends nothing, or has not answered within ACTIVITY_WAIT_MS: the page never waits longer for it. A late answer is
// still kept for the session, so the next page (or the other tab) shows the card; a failure is not kept, so the next
// page asks again.
// Here: mock/api/loyalty-activity.json (API mode) or mock/common.json.
const ACTIVITY_WAIT_MS = 3000;
const activityList = () => {
  if (!USE_API) return sessionCached('hsb-loyalty-activity-v3', () => getJSON('../mock/common.json').then((common) => common.activity));
  const asked = sessionCached('hsb-loyalty-activity-api-v1', () => getJSON('../mock/api/loyalty-activity.json')
    .then((answer) => { if (answer.success !== true) throw new Error(`app/point/activity: ${answer.message}`); return toActivity(answer.result); }));
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
      rewardStore: REWARD_STORE,
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
    rewardStore: REWARD_STORE,
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

// API: the HSB backend's order endpoints (spec §52), with the app token. Both POST on the same host and /pointSys base
// as the loyalty API above ({host}/pointSys/app/point/…), in the same request envelope as `request()` (signed body with
// clientId and timestamp, same headers; spec §65): POST /app/point/orders with { pageNo, pageSize } for the list, POST
// /app/point/order/detail with { orderReference } for one order. { success, result } like the loyalty API; the
// list's result is { orders, page, pageSize, total }, newest first, page from 1, pageSize at most 100. The backend
// takes the client from the token: 403 when the order, or the body's clientId, is not the user's (the page then shows
// its error view).
// Here: mock/api/loyalty-orders.json for the list and mock/api/loyalty-orders-detail.json for any one order.
function getOrders(path, body) { // the real call POSTs `body` (with clientId for the list); here it picks the sample
  const file = path.endsWith('/detail') ? 'loyalty-orders-detail' : 'loyalty-orders';
  return getJSON(`../mock/api/${file}.json`).then((answer) => {
    if (answer.success !== true) throw new Error(`${path}: ${answer.message || 'request failed'}`);
    return answer.result;
  });
}

// API: the rewards of Home (spec §49) and of the Reward Store (spec §59), from HSB (the Tada integration): POST
// {host}/pointSys/app/point/catalog with { clientId } in the loyalty API's request envelope (timestamp, signed body;
// spec §65) and the app token; guests send clientId null and the app's static key (x-auth-key) only, no token (spec §60) (one endpoint for both since
// 22 Oct 2026: the backend then answers with the default group's rewards). { success, result: { rewards } }: every
// reward on show, ~50; Home keeps those with showOnHome. A different backend from the rest of the pages: when it
// fails, Home still opens without the rewards grid, and the store shows its "on their way" message (rewards = []).
// Here: mock/api/loyalty-catalog.json, or loyalty-catalog-guest.json (the answer for clientId null).
function rewardsList() {
  const file = GUEST ? 'loyalty-catalog-guest' : 'loyalty-catalog';
  return getJSON(`../mock/api/${file}.json`)
    .then((answer) => { if (answer.success !== true) throw new Error(`${file}: ${answer.message}`); return toRewards(answer.result); })
    .catch(() => []);
}

async function pageFromApi(page) {
  if (GUEST && page === 'point-balance') return toPointBalancePage(null, null, null, null); // nothing to ask for
  if (GUEST && page === 'redemptions') return { orders: [], total: 0 }; // guests never reach it
  if (page === 'store') return { rewards: await rewardsList() }; // the Reward Store and its reward page (spec §59)
  if (page === 'redemptions') {
    const first = toOrdersPage(await getOrders('app/point/orders', { pageNo: 1, pageSize: ORDERS_PAGE_SIZE }));
    return { orders: rememberOrders(first.orders), total: first.total };
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
  ? getOrders('app/point/orders', { pageNo, pageSize: ORDERS_PAGE_SIZE }).then((answer) => rememberOrders(toOrdersPage(answer).orders))
  : Promise.resolve([]));

// One order of Redemption history. API: POST /app/point/order/detail { orderReference } (Tada's order, passed through),
// joined with the order's row of the list for its coins, date and status (spec §66). The rows already shown this
// session are kept (rememberOrders); an order opened from elsewhere (a link) is looked up in the list, 100 a page.
// Mock: from the `details` list of mock/redemptions.json.
const ORDERS_KEY = 'hsb-loyalty-orders-v1';
function rememberOrders(orders) {
  try {
    const kept = JSON.parse(sessionStorage.getItem(ORDERS_KEY) || '{}');
    orders.forEach((order) => { kept[order.orderReference] = order; });
    sessionStorage.setItem(ORDERS_KEY, JSON.stringify(kept));
  } catch { /* not kept: looked up again */ }
  return orders;
}
async function orderSummary(ref) {
  try { const kept = JSON.parse(sessionStorage.getItem(ORDERS_KEY) || '{}'); if (kept[ref]) return kept[ref]; } catch { /* look it up */ }
  for (let pageNo = 1; pageNo <= 50; pageNo += 1) {
    const answer = toOrdersPage(await getOrders('app/point/orders', { pageNo, pageSize: 100 }));
    const found = rememberOrders(answer.orders).find((order) => order.orderReference === ref);
    if (found || !answer.orders.length || pageNo * 100 >= answer.total) return found ?? null;
  }
  return null;
}
export const fetchOrder = async (ref) => {
  if (!USE_API) return getJSON('../mock/redemptions.json').then((file) => file.default.details.find((order) => order.orderReference === ref) ?? null);
  const [detail, summary] = await Promise.all([getOrders('app/point/order/detail', { orderReference: ref }), orderSummary(ref)]);
  return toOrder(detail, summary);
};

// One file per language, the same keys (tools/check-copy.py checks them). `lang` comes from shared/app.js.
export const fetchCopy = (lang) => getJSON(`../copy/${lang}.json`);

// PREVIEW ONLY: state overrides for the ?state= switcher. With a real API this returns {} (no states).
export const fetchPreview = (page) => getJSON(`../mock/${page}.json`).then((file) => file.states);

export { joinRequirementFrom };
