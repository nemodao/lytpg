import { trackView } from './tracking.js';

// Markup for components used on more than one page. Styles live in components.css.

// Point coin artwork. Decorative: the text around it carries the meaning.
export const coin = (sizeClass) => `<img class="coin ${sizeClass}" src="../assets/images/coin.png" alt="">`;

// "1.200 points expire within 10 days"
export const expiringText = (ui, common) =>
  ui.t('balance.expiring', { points: ui.num(common.balance.expiring.points), days: common.program.expiryWarningDays });

export const badge = (tone, label) => `<span class="badge badge--${tone}">${label}</span>`;

export const notice = (ui, { icon = 'info', tone = 'neutral', text }) =>
  `<div class="notice notice--${tone}">${ui.icon(icon)}<p>${text}</p></div>`;

// Header used on every page: centred title. No back button: leaving the webview is the bottom bar's X (spec §29).
// `action` is optional markup for the right edge (Home: the help button that reopens the tour).
export const appHeader = (ui, { title, action = '' }) => `
  <header class="app-header">
    <span></span>
    <h1>${title}</h1>
    ${action}
  </header>`;

// Round help button for the header: reopens the guided tour.
export const tourButton = (ui) =>
  `<button class="header-action" type="button" data-tour-start aria-label="${ui.t('tour.open')}">${ui.icon('help')}</button>`;

// Users who must still pass KYC or make a first deposit (FTD) cannot earn yet. The Today card shows "How to start"
// instead of today's progress (joinPanel below), and the main button names the step they need.
// Returns null when the user can already take part.
export const joinLabel = (ui, common) =>
  ({ kyc: ui.t('join.kyc'), deposit: ui.t('join.deposit') })[common.program.joinRequirement] || null;

// Which step the user must take before joining (`kyc` | `deposit`), or null. Used as the button's data-intent.
export const joinIntent = (common) => common.program.joinRequirement || null;

// "How to start" (spec §39, §42): what the Today card shows on Home and Earn while the user still needs KYC or a first
// deposit. Three steps (the one to do now is bold, finished ones get a green check), a one-line summary of the earning
// rates, and the button for the current step. `flat` lays the steps straight on the card.
// Nudge: JOIN_NUDGE_AFTER seconds after the card appears, a finger (the tour's hand) comes in under the button and
// keeps tapping it; the button answers each tap as if pressed. `nudged` = the finger already came in (the page
// re-rendered): it is simply there and goes on tapping.
// API: `program.joinRequirement` ("kyc" | "deposit" | null) is not sent by the loyalty API. Derive it from the app's
// sign-in data: kycApproveTime = 0 -> "kyc"; kycApproveTime > 0 and firstDepositTime = 0 -> "deposit"; else null.
// The button carries data-intent "kyc" or "deposit": the host app attaches the KYC / Deposit deeplink.
const JOIN_NUDGE_AFTER = 3;
export function joinPanel(ui, common, { flat = false, nudged = false } = {}) {
  const { program } = common;
  const current = ['kyc', 'deposit'].indexOf(program.joinRequirement);
  trackView('loyalty_join_card_view', { step: program.joinRequirement });
  const steps = ['kyc', 'deposit', 'trade'].map((id, index) => {
    const state = index < current ? 'done' : index === current ? 'current' : 'later';
    const mark = state === 'done' ? ui.icon('check', 'icon--sm') : index + 1;
    return `<li class="join__step join__step--${state}"${state === 'current' ? ' aria-current="step"' : ''}><span class="join__mark num">${mark}</span><span>${ui.t(`join.step.${id}${state === 'done' ? '.done' : ''}`)}</span></li>`;
  });
  return `
    <div class="today join${flat ? ' today--flat' : ''}">
      <h3 class="join__title">${ui.t('join.title')}</h3>
      <ol class="join__steps">${steps.join('')}</ol>
    </div>
    ${rateRangeLine(ui, common)}
    <div class="join__cta above${nudged ? ' join__cta--nudged' : ''}" style="--nudge-after:${JOIN_NUDGE_AFTER}s">
      <button class="btn btn--primary btn--lg btn--block" type="button" data-intent="${joinIntent(common)}" data-track="loyalty_${joinIntent(common)}_click">${joinLabel(ui, common)}</button>
      <img class="join__finger" src="../assets/tour/finger.webp" alt="">
    </div>`;
}

// "70–100 coins per lot · up to 2,000 a day": the programme's lowest and highest rate and its daily maximum. Shown to
// users who have no trading account, and so no rates table (spec §42).
// API: `program.rateRange` ({ min, max } or null) and `program.dailyMaxPoints` (number or null). Each half is left out
// when its value is missing; with neither, nothing is rendered.
export function rateRangeLine(ui, common) {
  const { rateRange, dailyMaxPoints } = common.program;
  const range = !rateRange ? ''
    : rateRange.min === rateRange.max ? ui.t('join.rates.single', { max: ui.num(rateRange.max) })
      : ui.t('join.rates', { min: ui.num(rateRange.min), max: ui.num(rateRange.max) });
  const cap = dailyMaxPoints ? ui.t('join.rates.cap', { max: ui.num(dailyMaxPoints) }) : '';
  if (!range && !cap) return '';
  return `<div class="join__rates num"><p class="grow">${range ? `<strong>${range}</strong>` : ''}${range && cap ? ' · ' : ''}${cap}</p></div>`;
}

// Page status (spec §44): what a page shows instead of its content while its data is on the way, or when it could not
// be loaded. `header` is the page's own header markup. Returns true when it took over the page.
// API: drive this from the real requests: "loading" from the moment a page opens until all of its requests have
// answered; "error" when any of them fails (no network, HTTP error, or a response without success = true). In this
// demo `common.view` is set by the `loading` and `error` preview states, and "Try again" simply reloads the page;
// with the API it repeats the page's requests.
export function showStatus(ui, common, app, header) {
  if (!common.view) return false;
  const bar = (size) => `<span class="skeleton__bar skeleton__bar--${size}"></span>`;
  const loading = `
    <div class="skeleton" role="status" aria-label="${ui.t('common.loading')}">
      <section class="card skeleton__card skeleton__card--row"><span class="skeleton__dot"></span><div class="grow stack stack--tight">${bar('s')}${bar('l')}</div></section>
      <section class="card skeleton__card">${bar('m')}${bar('full')}${bar('full')}${bar('l')}</section>
      <section class="card skeleton__card">${bar('m')}${bar('full')}${bar('l')}</section>
    </div>`;
  const error = `
    <section class="card page-error" role="alert">
      <span class="page-error__icon">${ui.icon('info')}</span>
      <div class="stack stack--tight">
        <h2 class="t-title-s">${ui.t('error.title')}</h2>
        <p class="t-body c-3">${ui.t('error.body')}</p>
      </div>
      <button class="btn btn--primary btn--lg btn--block" type="button" data-action="retry" data-track="loyalty_retry_click">${ui.t('common.retry')}</button>
    </section>`;
  app.innerHTML = header + (common.view === 'loading' ? loading : error);
  if (common.view === 'error') trackView('loyalty_error_view');
  app.addEventListener('click', (event) => { if (event.target.closest('[data-action="retry"]')) location.reload(); });
  return true;
}

// End of a paged list (spec §44): a spinner while the next page loads, or a retry line when it failed.
export const loadMoreRow = (ui, failed) => (failed
  ? `<p class="load-more t-caption c-3">${ui.t('common.loadMoreError')} <button class="text-btn" type="button" data-action="load-more">${ui.t('common.retry')}</button></p>`
  : `<p class="load-more t-caption c-3" data-load-more><span class="spinner" aria-hidden="true"></span>${ui.t('common.loadingMore')}</p>`);

// "How it works" rules. One list, shown in the Trading Task's How it works tab and in the guided tour (step 2):
// change it here and both change.
// API: the holding-time rule is left out when `program.minHoldSeconds` is 0 (no minimum), and the daily-maximum
// rule when `program.dailyMaxPoints` is null.
export function rulesList(ui, common) {
  const { program } = common;
  const credit = program.creditMode === 'in-day'
    ? ui.md('rule.credit.inDay', { minutes: program.creditWithinMinutes })
    : ui.md(program.creditDelayDays === 1 ? 'rule.credit.delayed.one' : 'rule.credit.delayed', { days: program.creditDelayDays });
  return `
    <ul class="rules">
      ${program.minHoldSeconds > 0 ? `<li><span>${program.minHoldSeconds % 60 ? ui.md('rule.hold.seconds', { seconds: program.minHoldSeconds }) : ui.md(program.minHoldMinutes === 1 ? 'rule.hold.one' : 'rule.hold', { minutes: program.minHoldMinutes })}</span></li>` : ''}
      <li><span>${credit}</span></li>
      <li><span>${ui.md(program.expiryDays === 1 ? 'rule.expire.one' : 'rule.expire', { days: program.expiryDays })}</span></li>
      <li><span>${ui.md('rule.reset', { time: program.resetTime, tz: ui.t('tz') })}</span></li>
      ${program.dailyMaxPoints ? `<li><span class="num">${ui.md('rule.max', { points: ui.num(program.dailyMaxPoints) })}</span></li>` : ''}
    </ul>`;
}

// Balance block: coin, label, number, Redeem button and the expiry warning. Coins that are not credited yet are never
// shown (spec §41), so the API's `pending` total is not used.
// Dashboard: bare on the page background, the whole block links to Point Balance (href).
// Point Balance: the same content inside a pale theme card (card: true).
export function balanceBlock(ui, common, { href = '', card = false } = {}) {
  const { available, expiring } = common.balance;
  if (expiring) trackView('loyalty_expiring_notice_view');
  return `
  <section class="balance ${card ? 'card card--soft' : ''}" data-tour="balance">
    ${href ? `<a class="card-link" href="${href}" aria-label="${ui.t('balance.title')}" data-track="loyalty_card_click" data-track-target="coins"></a>` : ''}
    <div class="balance-row">
      <span class="coin-glow">${coin('coin--lg')}</span>
      <div class="grow">
        <p class="t-label c-3">${ui.t('balance.title')}</p>
        <p class="balance-number num">${ui.num(available)}</p>
      </div>
      <div class="balance-side">
        <button class="btn btn--sm btn--mono above" type="button" data-intent="redeem" data-tour="redeem" data-track="loyalty_redeem_click">${ui.t('balance.redeem')}${ui.icon('gift', 'icon--sm')}</button>
      </div>
    </div>
    ${expiring ? `<div class="notice notice--danger">${ui.icon('clock')}<p class="num">${expiringText(ui, common)}</p></div>` : ''}
  </section>`;
}

// "3,5 lots · 2.100 points"
export const lotsAndPoints = (ui, key, lots, points) =>
  ui.t(key, { lots: ui.lots(lots), lotUnit: ui.lotUnit(lots), points: ui.num(points) });
