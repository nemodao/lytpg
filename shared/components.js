import { track, trackView } from './tracking.js';

// Markup for components used on more than one page. Styles live in components.css.

// Point coin artwork. Decorative: the text around it carries the meaning.
export const coin = (sizeClass) => `<img class="coin ${sizeClass}" src="../assets/images/coin.png" alt="">`;

// "1.200 points expire within 10 days"
export const expiringText = (ui, common) =>
  ui.t('balance.expiring', { points: ui.num(common.balance.expiring.points), days: common.program.expiryWarningDays });

export const badge = (tone, label) => `<span class="badge badge--${tone}">${label}</span>`;

export const notice = (ui, { icon = 'info', tone = 'neutral', text }) =>
  `<div class="notice notice--${tone}">${ui.icon(icon)}<p>${text}</p></div>`;

// Header used on every page: centred title. The tab pages have no back button: leaving the webview is the bottom bar's
// X (spec §29). `back` (a link) adds one on the left, for pages opened from a tab (Redemption history, spec §52).
// `action` is optional markup for the right edge (Home: the help button that reopens the tour).
export const appHeader = (ui, { title, action = '', back = '' }) => `
  <header class="app-header">
    ${back ? `<a class="header-action" href="${back}" aria-label="${ui.t('orders.back')}" data-back>${ui.icon('back')}</a>` : '<span></span>'}
    <h1>${title}</h1>
    ${action || (back ? '<span></span>' : '')}
  </header>`;

// Round help button for the header: reopens the guided tour.
export const tourButton = (ui) =>
  `<button class="header-action" type="button" data-tour-start aria-label="${ui.t('tour.open')}">${ui.icon('help')}</button>`;

// Users who must still pass KYC or make a first deposit (FTD) cannot earn yet. The Today card shows "How to start"
// instead of today's progress (joinPanel below), and the main button names the step they need.
// Returns null when the user can already take part.
// Guests (not signed in, spec §53) have one more step first: `signup` (button "Sign up", app screen /sign-up).
export const joinLabel = (ui, common) =>
  ({ signup: ui.t('join.signup'), kyc: ui.t('join.kyc'), deposit: ui.t('join.deposit') })[common.program.joinRequirement] || null;

// Which step the user must take before joining (`signup` | `kyc` | `deposit`), or null. Used as the button's
// data-intent.
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
// `source` says where the panel is shown: "card" (the Today card on Earn) or "redeem" (the sheet that Redeem opens,
// mountJoinSheet below); `from` (sheet only) names the button that opened the sheet. Both go with
// loyalty_join_card_view and with the panel's buttons (kyc / deposit / signup / login clicks), so a funnel can be
// followed from the button tapped to the step taken. The card's view is sent once per page load; the sheet's on every
// opening.
const JOIN_NUDGE_AFTER = 3;
// Guests see four steps, "Create your free account" first, and under the button "Already have an account? Log in"
// (intent `login`, app screen /login).
export function joinPanel(ui, common, { flat = false, nudged = false, source = 'card', from } = {}) {
  const { program } = common;
  const guest = program.joinRequirement === 'signup';
  const ids = guest ? ['signup', 'kyc', 'deposit', 'trade'] : ['kyc', 'deposit', 'trade'];
  const current = ids.indexOf(program.joinRequirement);
  if (source === 'redeem') track('loyalty_join_card_view', { source, from });
  else trackView('loyalty_join_card_view', { source }, source);
  const where = `data-track-source="${source}"${from ? ` data-track-from="${from}"` : ''}`;
  const steps = ids.map((id, index) => {
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
    ${guest ? `<p class="t-caption c-3">${ui.t('join.ratesByAccount')}</p>` : ''}
    <div class="join__cta above${nudged ? ' join__cta--nudged' : ''}" style="--nudge-after:${JOIN_NUDGE_AFTER}s">
      <button class="btn btn--primary btn--lg btn--block" type="button" data-intent="${joinIntent(common)}" data-track="loyalty_${joinIntent(common)}_click" ${where}>${joinLabel(ui, common)}</button>
      <img class="join__finger" src="../assets/tour/finger.webp" alt="">
    </div>
    ${guest ? `<button class="text-btn join__login" type="button" data-intent="login" data-track="loyalty_login_click" ${where}>${ui.md('join.login')}</button>` : ''}`;
}

// Redeem buttons (spec §49): the balance block's Redeem and every reward card. A user who still needs KYC or a first
// deposit cannot redeem yet: the button opens the "How to start" sheet (mountJoinSheet) instead of going to Tada.
// Everyone else gets the Tada intent (`redeem` = the store, `reward` = one reward).
// `from` names the button (redeem | balance | reward | explore | history), sent with the sheet's loyalty_join_card_view
// (and loyalty_login_prompt_view for guests) and with the buttons inside it.
export const redeemAttrs = (common, intent, from = intent) =>
  joinIntent(common) ? `data-action="join-sheet" data-from="${from}" aria-haspopup="dialog"` : `data-intent="${intent}"`;

// The sheet Redeem opens for those users: a title, one line on why, then "How to start" as on Earn (steps, rate line,
// the button for the current step with its tapping finger). The scrim, the close button and Esc close it.
// Call once per page, after the page's markup is in place; it does nothing for users who can already redeem.
// Guests (spec §53) get the same sheet as their sign-up prompt: own title and line, and loyalty_login_prompt_view with
// `from` (the button that opened it) each time it opens.
export function mountJoinSheet(ui, common, app) {
  if (!joinIntent(common)) return;
  const guest = common.program.joinRequirement === 'signup';
  const title = ui.t(guest ? 'redeemGate.guestTitle' : 'redeemGate.title');
  const close = () => app.querySelector('[data-join-sheet]')?.remove();
  const open = (from) => {
    close();
    if (guest) track('loyalty_login_prompt_view', { from });
    app.insertAdjacentHTML('beforeend', `
      <div class="scrim" data-join-sheet data-action="close-join-sheet">
        <div class="sheet sheet--join blend-pale-theme" role="dialog" aria-modal="true" aria-label="${title}">
          <span class="sheet__grab"></span>
          <div class="sheet__head">
            <h2 class="t-title-s grow">${title}</h2>
            <button class="header-action" type="button" data-action="close-join-sheet" aria-label="${ui.t('common.close')}">${ui.icon('close')}</button>
          </div>
          <p class="t-body c-2">${ui.t(guest ? 'redeemGate.guestBody' : 'redeemGate.body')}</p>
          ${joinPanel(ui, common, { flat: true, source: 'redeem', from })}
        </div>
      </div>`);
  };
  app.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="join-sheet"], [data-action="close-join-sheet"]');
    if (!target) return;
    // Opened after this click has been tracked, so loyalty_redeem_click / loyalty_reward_click comes before the view.
    if (target.dataset.action === 'join-sheet') { event.preventDefault(); setTimeout(() => open(target.dataset.from || 'redeem')); return; }
    if (target.classList.contains('scrim') && event.target !== target) return; // taps inside the sheet do not close it
    close();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
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
// `scope` goes with loyalty_error_view as error_scope: 'page' (the page's data), or 'order' (one order, Redemption history).
export function showStatus(ui, common, app, header, scope = 'page') {
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
  if (common.view === 'error') trackView('loyalty_error_view', { error_scope: scope });
  app.addEventListener('click', (event) => { if (event.target.closest('[data-action="retry"]')) location.reload(); });
  return true;
}

// End of a paged list (spec §44): a spinner while the next page loads, or a retry line when it failed.
export const loadMoreRow = (ui, failed) => (failed
  ? `<p class="load-more t-caption c-3">${ui.t('common.loadMoreError')} <button class="text-btn" type="button" data-action="load-more">${ui.t('common.retry')}</button></p>`
  : `<p class="load-more t-caption c-3" data-load-more><span class="spinner" aria-hidden="true"></span>${ui.t('common.loadingMore')}</p>`);

// "How it works" rules. One list, shown in the Trading Task's How it works tab and in the guided tour (step 2):
// change it here and both change.
// API: the holding-time rule is left out when `program.minHoldSeconds` is 0 (no minimum), the daily-maximum rule when
// `program.dailyMaxPoints` is null, and the expiry rule when `program.expiryDays` is null.
export function rulesList(ui, common) {
  const { program } = common;
  const credit = program.creditMode === 'in-day'
    ? ui.md('rule.credit.inDay', { minutes: program.creditWithinMinutes })
    : ui.md(program.creditDelayDays === 1 ? 'rule.credit.delayed.one' : 'rule.credit.delayed', { days: program.creditDelayDays });
  return `
    <ul class="rules">
      ${program.minHoldSeconds > 0 ? `<li><span>${program.minHoldSeconds % 60 ? ui.md('rule.hold.seconds', { seconds: program.minHoldSeconds }) : ui.md(program.minHoldMinutes === 1 ? 'rule.hold.one' : 'rule.hold', { minutes: program.minHoldMinutes })}</span></li>` : ''}
      <li><span>${credit}</span></li>
      ${program.expiryDays != null ? `<li><span>${ui.md(program.expiryDays === 1 ? 'rule.expire.one' : 'rule.expire', { days: program.expiryDays })}</span></li>` : ''}
      <li><span>${ui.md('rule.reset', { time: program.resetTime, tz: ui.t('tz') })}</span></li>
      ${program.dailyMaxPoints ? `<li><span class="num">${ui.md('rule.max', { points: ui.num(program.dailyMaxPoints) })}</span></li>` : ''}
    </ul>`;
}

// Balance block: coin, label, number, Redeem button and the expiry warning. Coins that are not credited yet are never
// shown (spec §41), so the API's `pending` total is not used.
// Dashboard: bare on the page background, the whole block links to Point Balance (href).
// Point Balance: the same content inside a pale theme card (card: true).
// `history`: link of the small "Redemption history" button under Redeem (Coins, spec §52).
export function balanceBlock(ui, common, { href = '', card = false, history = '' } = {}) {
  const { available, expiring } = common.balance;
  if (expiring) trackView('loyalty_expiring_notice_view');
  return `
  <section class="balance ${card ? 'card card--soft' : ''}" data-tour="balance">
    ${href ? (common.program.joinRequirement === 'signup'
      ? `<button class="card-link" type="button" ${redeemAttrs(common, 'redeem', 'balance')} aria-label="${ui.t('balance.title')}" data-track="loyalty_card_click" data-track-target="coins"></button>`
      : `<a class="card-link" href="${href}" aria-label="${ui.t('balance.title')}" data-track="loyalty_card_click" data-track-target="coins"></a>`) : ''}
    <div class="balance-row">
      <span class="coin-glow">${coin('coin--lg')}</span>
      <div class="grow">
        <p class="t-label c-3">${ui.t('balance.title')}</p>
        <p class="balance-number num">${ui.num(available)}</p>
      </div>
      <div class="balance-side">
        <button class="btn btn--sm btn--mono above" type="button" ${redeemAttrs(common, 'redeem')} data-tour="redeem" data-track="loyalty_redeem_click">${ui.t('balance.redeem')}${ui.icon('gift', 'icon--sm')}</button>
        ${history ? (common.program.joinRequirement === 'signup'
          ? `<button class="text-btn balance-history above" type="button" ${redeemAttrs(common, 'redeem', 'history')} data-track="loyalty_orders_open">${ui.t('orders.button')}${ui.icon('right', 'icon--sm')}</button>`
          : `<a class="text-btn balance-history above" href="${history}" data-track="loyalty_orders_open">${ui.t('orders.button')}${ui.icon('right', 'icon--sm')}</a>`) : ''}
      </div>
    </div>
    ${expiring ? `<div class="notice notice--danger">${ui.icon('clock')}<p class="num">${expiringText(ui, common)}</p></div>` : ''}
  </section>`;
}

// "3,5 lots · 2.100 points"
export const lotsAndPoints = (ui, key, lots, points) =>
  ui.t(key, { lots: ui.lots(lots), lotUnit: ui.lotUnit(lots), points: ui.num(points) });
