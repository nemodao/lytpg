// Checks the API adapter against the sample answers in this folder: converts them and compares the result with the
// UI-shaped mock files, key by key. Run from the project root:  node mock/api/check.mjs
// It fails if the adapter stops producing a field the pages read, or produces a different value for the sample data.
import { readFileSync } from 'node:fs';
import { toAccounts, toBalance, toDashboardPage, toOrder, toOrdersPage, toPointBalancePage, toProgram, toTiers, toTradingTaskPage, joinRequirementFrom } from '../../shared/api-adapter.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const api = (name) => read(`./${name}.json`).result;
const task = api('tradingTask-get');
const mockCommon = read('../common.json');
const mock = (page) => read(`../${page}.json`).default;

const built = {
  'common.balance': [toBalance(api('coin-summary')), mockCommon.balance],
  'common.program': [toProgram(task, api('signin')), mockCommon.program],
  'common.accounts': [toAccounts(task, api('tradingTask-getTiers')), mockCommon.accounts],
  'common.tiers': [toTiers(api('tradingTask-getTiers')), mockCommon.tiers],
  dashboard: [toDashboardPage(task, mock('dashboard')), mock('dashboard')],
  'trading-task': [toTradingTaskPage(task, api('tradingTask-getHistory')), mock('trading-task')],
  'point-balance': [toPointBalancePage(api('coin-listAvailable'), api('coin-listExpired'), api('coin-ledger'), task), mock('point-balance')],
  'redemptions.orders': [toOrdersPage(api('loyalty-orders')).orders, mock('redemptions').orders],
  'redemptions.total': [toOrdersPage(api('loyalty-orders')).total, mock('redemptions').total],
  'redemptions.order': [toOrder(api('loyalty-orders-detail')), mock('redemptions').details.find((order) => order.orderReference === api('loyalty-orders-detail').orderReference)],
};

// Differences that are expected: preview-only fields of the mock, and values the sample API states more precisely.
const IGNORE = [/\.usedItems$/, /\.expiresAt$/, /^point-balance\.items\.length$/];
const problems = [];
function compare(path, got, want) {
  if (IGNORE.some((pattern) => pattern.test(path))) return;
  if (Array.isArray(want)) {
    if (!Array.isArray(got)) return problems.push(`${path}: expected a list`);
    if (got.length !== want.length) problems.push(`${path}.length: ${got.length} instead of ${want.length}`);
    want.forEach((item, index) => index < got.length && compare(`${path}[${index}]`, got[index], item));
  } else if (want && typeof want === 'object') {
    if (!got || typeof got !== 'object') return problems.push(`${path}: missing`);
    Object.keys(want).forEach((key) => compare(`${path}.${key}`, got[key], want[key]));
  } else if (got !== want && Number(got) !== Number(want)) {
    problems.push(`${path}: ${JSON.stringify(got)} instead of ${JSON.stringify(want)}`);
  }
}
Object.entries(built).forEach(([name, [got, want]]) => compare(name, got, want));

// Sign-in rule.
const rule = [[{ kycApproveTime: 0, firstDepositTime: 0 }, 'kyc'], [{ kycApproveTime: 5, firstDepositTime: 0 }, 'deposit'], [{ kycApproveTime: 5, firstDepositTime: 9 }, null]];
rule.forEach(([input, want]) => { if (joinRequirementFrom(input) !== want) problems.push(`joinRequirementFrom(${JSON.stringify(input)}) is not ${want}`); });
// An empty Terms & Conditions address hides the button, like null.
if (toProgram({ tradingTask: true, program: { ...task.program, termsUrl: '' } }, null).termsUrl !== null) problems.push('toProgram: empty termsUrl should become null');
if (toProgram({ tradingTask: true, program: { ...task.program, minHoldSeconds: 0 } }, null).minHoldSeconds !== 0) problems.push('toProgram: minHoldSeconds 0 not kept');
// A user without a trading task.
if (toProgram({ tradingTask: false }, null).tradingTask !== false) problems.push('toProgram: tradingTask false not kept');
if (toAccounts({ tradingTask: false }).length !== 0) problems.push('toAccounts: expected no accounts without a task');

if (problems.length) { console.error('Adapter check FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('Adapter check passed: sample API answers convert to the shapes the pages read.');
