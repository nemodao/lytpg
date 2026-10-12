// DATA SOURCE — the only place these pages get data from. Nothing else in pages/ or shared/ calls fetch().
//
//   fetchCommon()      -> data shared by all pages          (shape: mock/common.json)
//   fetchPage(page)    -> data of one page                  (shape: the "default" object of mock/<page>.json)
//   fetchCopy()        -> UI strings, key -> text           (copy/en.json; swap the file to localise)
//   fetchPreview(page) -> PREVIEW ONLY: the named state overrides used by ?state=...; return {} with a real API
//
// `page` is 'dashboard' | 'trading-task' | 'point-balance'. The shapes are documented field by field in DATA.md.
//
// Two sources:
//   1. Mock (default): the UI-shaped files in mock/. This is what the demo and the preview states use.
//   2. API (?source=api): the answers of the real endpoints, converted by shared/api-adapter.js. In this repository
//      the answers are the sample files in mock/api/ (same shape as the real ones).
// TO CONNECT THE REAL API: make `USE_API` true and replace the body of `request()` with the real call. Everything
// else in this file, in the adapter and in the pages stays as it is.

import { joinRequirementFrom, toAccounts, toBalance, toDashboardPage, toPointBalancePage, toProgram, toTradingTaskPage } from './api-adapter.js';

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

// Not sent by the loyalty API: the live-feed generator settings and the tour's simulated balance (UI constants),
// the reward tiles on Home (static images) and the check-in card (its own API, off for now).
const uiOnly = () => Promise.all([getJSON('../mock/common.json'), getJSON('../mock/dashboard.json')])
  .then(([common, dashboard]) => ({ liveFeed: common.liveFeed, tour: common.tour, rewards: dashboard.default.rewards, checkIn: dashboard.default.checkIn }));

// Date ranges and paging. API: the three list endpoints take from / to (at most 30 days) and pageNo / pageSize;
// send the range of the date filter and ask for the next page as the user scrolls (spec §43, §44). The demo asks
// once and filters and pages in the browser.
const taskGet = () => result('tradingTask/get');

async function commonFromApi() {
  const [taskAnswer, summary, user, ui] = await Promise.all([request('tradingTask/get'), result('coin/summary'), signin(), uiOnly()]);
  const task = taskAnswer.result;
  return {
    now: new Date(taskAnswer.timestamp).toISOString(), // server time
    balance: toBalance(summary),
    program: toProgram(task, user),
    accounts: toAccounts(task),
    liveFeed: ui.liveFeed,
    tour: ui.tour,
  };
}

async function pageFromApi(page) {
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

export const fetchCopy = () => getJSON('../copy/en.json');

// PREVIEW ONLY: state overrides for the ?state= switcher. With a real API this returns {} (no states).
export const fetchPreview = (page) => getJSON(`../mock/${page}.json`).then((file) => file.states);

export { joinRequirementFrom };
