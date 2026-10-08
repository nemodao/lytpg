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

// "How to start" (spec §39): what the Today card shows on Home and Earn while the user still needs KYC or a first
// deposit. Three steps (the one to do now is bold, finished ones get a green check), a one-line summary of the earning
// rates with a link to the full rates, and the button for the current step. `flat` lays the steps straight on the card.
// Nudge: JOIN_NUDGE_AFTER seconds after the card appears, a finger (the tour's hand) comes in under the button and the
// button pops once. `nudged` = the nudge already played (the page re-rendered): the finger is simply there, no replay.
const JOIN_NUDGE_AFTER = 3;
export function joinPanel(ui, common, { ratesHref, flat = false, nudged = false }) {
  const { program, rates } = common;
  const current = ['kyc', 'deposit'].indexOf(program.joinRequirement);
  const steps = ['kyc', 'deposit', 'trade'].map((id, index) => {
    const state = index < current ? 'done' : index === current ? 'current' : 'later';
    const mark = state === 'done' ? ui.icon('check', 'icon--sm') : index + 1;
    return `<li class="join__step join__step--${state}"${state === 'current' ? ' aria-current="step"' : ''}><span class="join__mark num">${mark}</span><span>${ui.t(`join.step.${id}${state === 'done' ? '.done' : ''}`)}</span></li>`;
  });
  // Lowest and highest rate across the symbol groups that earn.
  const perLot = rates.map((rate) => rate.ptsPerLot).filter((pts) => pts > 0);
  const min = Math.min(...perLot);
  const max = Math.max(...perLot);
  const range = min === max ? ui.t('join.rates.single', { max: ui.num(max) }) : ui.t('join.rates', { min: ui.num(min), max: ui.num(max) });
  return `
    <div class="today join${flat ? ' today--flat' : ''}">
      <h3 class="join__title">${ui.t('join.title')}</h3>
      <ol class="join__steps">${steps.join('')}</ol>
    </div>
    <div class="join__rates num">
      <p class="grow"><strong>${range}</strong> · ${ui.t('join.rates.cap', { max: ui.num(program.dailyMaxPoints) })}</p>
      <a class="details above" href="${ratesHref}">${ui.t('join.seeRates')}${ui.icon('right', 'icon--sm')}</a>
    </div>
    <div class="join__cta above${nudged ? ' join__cta--nudged' : ''}" style="--nudge-after:${JOIN_NUDGE_AFTER}s">
      <button class="btn btn--primary btn--lg btn--block" type="button" data-intent="${joinIntent(common)}">${joinLabel(ui, common)}</button>
      <img class="join__finger" src="../assets/tour/finger.webp" alt="">
    </div>`;
}

// "How it works" rules. One list, shown in the Trading Task's How it works tab and in the guided tour (step 2):
// change it here and both change.
export function rulesList(ui, common) {
  const { program } = common;
  const credit = program.creditMode === 'in-day'
    ? ui.md('rule.credit.inDay', { minutes: program.refreshMinutes })
    : ui.md('rule.credit.delayed', { days: program.creditDelayDays });
  return `
    <ul class="rules">
      <li><span>${ui.md('rule.hold', { minutes: program.minHoldMinutes })}</span></li>
      <li><span>${credit}</span></li>
      <li><span>${ui.md('rule.expire', { days: program.expiryDays })}</span></li>
      <li><span>${ui.md('rule.reset', { time: program.resetTime, tz: ui.t('tz') })}</span></li>
      <li><span class="num">${ui.md('rule.max', { points: ui.num(program.dailyMaxPoints) })}</span></li>
    </ul>`;
}

// Balance block: coin, label, number, pending, Redeem button and the expiry warning.
// Dashboard: bare on the page background, the whole block links to Point Balance (href).
// Point Balance: the same content inside a pale theme card (card: true).
export function balanceBlock(ui, common, { href = '', card = false } = {}) {
  const { available, pending, expiring } = common.balance;
  return `
  <section class="balance ${card ? 'card card--soft' : ''}" data-tour="balance">
    ${href ? `<a class="card-link" href="${href}" aria-label="${ui.t('balance.title')}"></a>` : ''}
    <div class="balance-row">
      ${coin('coin--lg')}
      <div class="grow">
        <p class="t-label c-3">${ui.t('balance.title')}</p>
        <p class="balance-number num">${ui.num(available)}</p>
        ${pending > 0 ? `<p class="t-label c-2 num">${ui.t('balance.pending', { points: ui.num(pending) })}</p>` : ''}
      </div>
      <div class="balance-side">
        <button class="btn btn--sm btn--mono above" type="button" data-intent="redeem" data-tour="redeem">${ui.t('balance.redeem')}${ui.icon('gift', 'icon--sm')}</button>
      </div>
    </div>
    ${expiring ? `<div class="notice notice--danger">${ui.icon('clock')}<p class="num">${expiringText(ui, common)}</p></div>` : ''}
  </section>`;
}

// "3,5 lots · 2.100 points"
export const lotsAndPoints = (ui, key, lots, points) =>
  ui.t(key, { lots: ui.lots(lots), lotUnit: ui.lotUnit(lots), points: ui.num(points) });
