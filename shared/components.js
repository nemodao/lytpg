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
export const appHeader = (ui, { title }) => `
  <header class="app-header">
    <span></span>
    <h1>${title}</h1>
  </header>`;

// Users who must still pass KYC or make a first deposit (FTD) see everything as usual; only the trade button changes
// to the step they need ("KYC to join", "Deposit to join"). Returns null when the user can already take part.
export const joinLabel = (ui, common) =>
  ({ kyc: ui.t('join.kyc'), deposit: ui.t('join.deposit') })[common.program.joinRequirement] || null;

// Which step the user must take before joining (`kyc` | `deposit`), or null. Used as the button's data-intent.
export const joinIntent = (common) => common.program.joinRequirement || null;

// Colour of the Daily Trading cards (Dashboard task card, Trading Task Today / ended card), as a blend class.
// `program.taskCardColour`: yellow (default, vivid yellow blend) | pale-theme | pale-yellow | indigo.
// TEMP (design review): picked with the card-colour states.
export const taskCardBlend = (common) =>
  ({ yellow: 'blend-yellow', 'pale-theme': 'blend-pale-theme', 'pale-yellow': 'blend-pale-yellow', indigo: 'blend-indigo' })[common.program.taskCardColour] || 'blend-yellow';

// Balance block: coin, label, number, pending, Redeem button and the expiry warning.
// Dashboard: bare on the page background, the whole block links to Point Balance (href).
// Point Balance: the same content inside a pale theme card (card: true).
export function balanceBlock(ui, common, { href = '', card = false } = {}) {
  const { available, pending, expiring } = common.balance;
  return `
  <section class="balance ${card ? 'card card--soft' : ''}">
    ${href ? `<a class="card-link" href="${href}" aria-label="${ui.t('balance.title')}"></a>` : ''}
    <div class="balance-row">
      ${coin('coin--lg')}
      <div class="grow">
        <p class="t-label c-3">${ui.t('balance.title')}</p>
        <p class="balance-number num">${ui.num(available)}</p>
        ${pending > 0 ? `<p class="t-label c-2 num">${ui.t('balance.pending', { points: ui.num(pending) })}</p>` : ''}
      </div>
      <div class="balance-side">
        <button class="btn btn--sm btn--mono above" type="button" data-intent="redeem">${ui.t('balance.redeem')}${ui.icon('gift', 'icon--sm')}</button>
      </div>
    </div>
    ${expiring ? `<div class="notice notice--danger">${ui.icon('clock')}<p class="num">${expiringText(ui, common)}</p></div>` : ''}
  </section>`;
}

// "3,5 lots · 2.100 points"
export const lotsAndPoints = (ui, key, lots, points) =>
  ui.t(key, { lots: ui.lots(lots), lotUnit: ui.lotUnit(lots), points: ui.num(points) });
