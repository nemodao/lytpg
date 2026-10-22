// Reward Store · one reward (spec §59): one card holding the picture, then parts split by thin lines: category, name and
// price; the user's balance against the price; the one-line description. Checkout at the bottom. Checkout is not live. A signed-in user without enough coins gets a
// sheet saying so, with "Learn how to earn coins" (to Earn); otherwise the sheet says checkout is coming soon (guests
// also get Sign up and, lighter, Log in there). Back returns to where the user came from (?back=: the store, or a Loyalty page).
// The data is the store's (the catalog list); the reward is picked by ?id=.
import { load } from '../shared/app.js';
import { coin } from '../shared/components.js';
import { backParam, categoryName, rewardBadge, storeHead } from '../shared/store.js';

const { common, page, ui } = await load('store');
const app = document.getElementById('app');
const id = new URLSearchParams(location.search).get('id');
const item = page.rewards.find((reward) => reward.id === id);
const back = backParam() || ui.href('store.html');
const guest = common.guest;

// The user's balance against the price: enough, or how many more coins (with a bar).
function balanceLine() {
  const have = common.balance.available;
  if (have >= item.points) return `<div class="reward-part reward-balance reward-balance--enough">${ui.icon('check')}<p>${ui.t('reward.enough')}</p></div>`;
  return `
    <div class="reward-part reward-balance">
      <p>${ui.md('reward.need', { have: ui.num(have), need: ui.num(item.points - have) })}</p>
      <span class="reward-balance__bar"><span style="width:${Math.max(2, Math.floor((have / item.points) * 100))}%"></span></span>
    </div>`;
}

function render() {
  if (!item) {
    app.innerHTML = `${storeHead(ui, common, { back })}
      <section class="card reward-missing">
        <h2 class="t-title-s">${ui.t('reward.missing.title')}</h2>
        <p class="t-body c-2">${ui.t('reward.missing.body')}</p>
      </section>`;
    return;
  }
  const category = categoryName(ui, item.category);
  app.innerHTML = `
    ${storeHead(ui, common, { back })}
    <section class="card reward-sheet">
      <div class="reward-art${item.category === 'tour_travel' ? ' reward-art--trip' : ''}">${item.image ? `<img src="${ui.esc(item.image)}" alt="">` : ''}</div>
      <div class="reward-part reward-info">
        ${category ? `<p class="reward-info__category">${category}</p>` : ''}
        <h2 class="reward-info__name">${rewardBadge(ui, item, { inline: true })}${ui.esc(item.name)}</h2>
        <p class="reward-info__price num">${coin('coin--sm')}${ui.num(item.points)}</p>
      </div>
      ${guest ? '' : balanceLine()}
      ${item.description ? `<div class="reward-part reward-about"><h3 class="t-body-strong">${ui.t('reward.about')}</h3><p class="t-body c-2">${ui.esc(item.description)}</p></div>` : ''}
    </section>
    <div class="reward-cta"><button class="btn btn--primary btn--lg btn--block" type="button" data-action="checkout">${ui.t('reward.checkout')}</button></div>`;
}

// Checkout. Not enough coins (signed in): how many more, and the way to Earn (left out when the programme runs no
// trading task: Earn is not shown then). Otherwise: coming soon.
const closeSheet = () => app.querySelector('[data-soon-sheet]')?.remove();
function shortSheet() {
  const earn = common.program.tradingTask !== false;
  return `
    <div class="scrim" data-soon-sheet data-action="close-sheet">
      <div class="sheet reward-soon" role="dialog" aria-modal="true" aria-label="${ui.t('reward.short.title')}">
        <span class="sheet__grab"></span>
        <span class="reward-soon__icon">${coin('coin--sm')}</span>
        <h2 class="t-title-s">${ui.t('reward.short.title')}</h2>
        <p class="t-body c-2">${ui.t('reward.short.body', { need: ui.num(item.points - common.balance.available) })}</p>
        <div class="stack">
          ${earn ? `<a class="btn btn--primary btn--lg btn--block" href="${ui.href('trading-task.html')}">${ui.t('reward.short.cta')}${ui.icon('right', 'icon--sm')}</a>` : ''}
          <button class="btn ${earn ? 'btn--stroke' : 'btn--primary'} btn--lg btn--block" type="button" data-action="close-sheet">${ui.t('reward.soon.ok')}</button>
        </div>
      </div>
    </div>`;
}
function openSheet() {
  closeSheet();
  if (!guest && common.balance.available < item.points) { app.insertAdjacentHTML('beforeend', shortSheet()); return; }
  app.insertAdjacentHTML('beforeend', `
    <div class="scrim" data-soon-sheet data-action="close-sheet">
      <div class="sheet reward-soon" role="dialog" aria-modal="true" aria-label="${ui.t('reward.soon.title')}">
        <span class="sheet__grab"></span>
        <span class="reward-soon__icon">${ui.icon('clock')}</span>
        <h2 class="t-title-s">${ui.t('reward.soon.title')}</h2>
        <p class="t-body c-2">${ui.t('reward.soon.body')}</p>
        <div class="stack">
          ${guest ? `<div class="reward-soon__pair">
            <button class="btn btn--primary btn--lg" type="button" data-intent="signup">${ui.t('join.signup')}</button>
            <button class="btn btn--stroke btn--lg" type="button" data-intent="login">${ui.t('reward.soon.login')}</button>
          </div>` : ''}
          <button class="btn ${guest ? 'text-btn reward-soon__close' : 'btn--primary btn--lg btn--block'}" type="button" data-action="close-sheet">${ui.t('reward.soon.ok')}</button>
        </div>
      </div>
    </div>`);
}
app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'checkout') openSheet();
  if (target.dataset.action === 'close-sheet') {
    if (target.classList.contains('scrim') && event.target !== target) return; // taps inside the sheet do not close it
    closeSheet();
  }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSheet(); });

render();
