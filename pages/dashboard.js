// Dashboard (spec §3 for content and states, §10 for layout, §49 for the rewards grid, §50 for the activity card): header,
// balance, recent activity, rewards grid.
import { load } from '../shared/app.js';
import { mountNav } from '../shared/nav.js';
import { mountTour } from '../shared/tour.js';
import { createActivityFeed } from '../shared/activity-feed.js';
import { initTracking, trackView } from '../shared/tracking.js';
import { appHeader, balanceBlock, coin, mountJoinSheet, mountStoreLinks, redeemAttrs, showStatus, tourButton } from '../shared/components.js';

const { common, page, ui } = await load('dashboard');
// `no-task-trading` state: the programme runs no trading task, so the "earn coins" card (and the Earn tab) are hidden.
const hasTask = common.program.tradingTask !== false;
initTracking('home', common);
const { rewards, checkIn } = page;
const feed = createActivityFeed(ui, common, common.activity);

const balanceHref = ui.href('point-balance.html');

// Daily check-in (future feature, spec §20): hidden unless the `check-in` state is on. Style follows the review
// mockup's "Keep it up" streak card. Days already checked are filled, today is outlined, later days are plain.
function checkInCard() {
  if (!checkIn.enabled) return '';
  const today = checkIn.checkedToday ? -1 : checkIn.checkedDays; // index of the day to claim now
  const day = (points, index) => {
    const state = index < checkIn.checkedDays ? 'done' : index === today ? 'today' : 'later';
    return `<li class="checkin__day checkin__day--${state} num"><b>${coin('coin--tiny')}${ui.num(points)}</b><span>${ui.t('checkin.day', { day: index + 1 })}</span></li>`;
  };
  const days = `<b class="checkin__count">${checkIn.checkedDays}</b>`;
  return `
    <section class="card checkin">
      <span class="checkin__art" aria-hidden="true">${ui.icon('calendar')}</span>
      <div class="stack stack--tight">
        <h2 class="t-title-s num">${ui.tHtml('checkin.title', { days })}</h2>
        <p class="t-caption c-3 num">${ui.tHtml('checkin.subtitle', { points: `<span class="checkin__pts">${coin('coin--tiny')}${ui.num(Math.max(...checkIn.rewards))}</span>` })}</p>
      </div>
      <ol class="checkin__days">${checkIn.rewards.map(day).join('')}</ol>
      ${checkIn.checkedToday
        ? `<button class="btn btn--lg btn--block" type="button" disabled>${ui.t('checkin.done')}</button>`
        : `<button class="btn btn--primary btn--lg btn--block" type="button" data-intent="checkin">${ui.t('checkin.button')}</button>`}
    </section>`;
}

// Rewards grid (spec §49): up to GRID_CELLS cards, two per row. The whole card is one button; its Redeem is a label
// inside it. Users who still need KYC or a first deposit get the "How to start" sheet instead of Tada (redeemAttrs).
// API: `rewards` comes from HSB's catalog (toRewards, data-source rewardsList): up to GRID_CELLS shown, in the order
// sent. None (empty answer or the catalog failed): no title and no grid; the rest of Home stays. The id travels with
// the `reward` intent (data-reward): HSB's own key, not a Tada link. Until Tada gives a link per reward, the app
// treats `reward` like `redeem` (the Tada catalog).
const GRID_CELLS = 10;
const EARN_CELL = 3; // the "earn coins" card is the 3rd cell
// Tracking (loyalty_reward_click): `position` is the reward's rank among the rewards (1–10; the "earn coins" card is
// not counted), `reward_id` and `reward_name` as HSB sends them, `affordable` whether the balance covers the price (no
// amount is sent).
const rewardCard = (item, position) => `
  <button class="card reward-card" type="button" ${redeemAttrs(common, 'reward', 'reward')} data-reward="${ui.esc(item.id)}" data-track="loyalty_reward_click" data-track-position="${position}" data-track-reward_id="${ui.esc(item.id)}" data-track-reward_name="${ui.esc(item.name)}" data-track-affordable="${common.balance.available >= item.points}">
    <span class="reward-card__art">${item.image ? `<img src="${ui.esc(item.image)}" alt="">` : ''}</span>
    <span class="reward-card__name">${ui.esc(item.name)}</span>
    <span class="reward-card__foot">
      <span class="reward-card__price num">${coin('coin--xs')}${ui.num(item.points)}</span>
      <span class="btn btn--xs btn--primary">${ui.t('balance.redeem')}</span>
    </span>
  </button>`;

// The "earn coins" card: opens Earn. Yellow so it stands out among the rewards; green plus signs twinkle around the
// coins ("earn more"). Hidden without a trading task or once
// the programme has ended.
const earnCard = () => {
  const max = common.program.rateRange?.max;
  return `
  <a class="card card--blend blend-yellow reward-card reward-card--earn" href="${ui.href('trading-task.html')}" data-track="loyalty_card_click" data-track-target="earn">
    <span class="reward-card__art"><img src="../assets/images/home/coin-cup.webp" alt=""><span class="earn-plus" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></span>
    <span class="reward-card__name">${ui.t('rewards.earn.title')}</span>
    <span class="t-caption reward-card__note num">${max ? ui.t('rewards.earn.body', { max: ui.num(max) }) : ui.t('rewards.earn.bodyNoRate')}</span>
    <span class="btn btn--sm btn--onblend btn--block reward-card__cta">${ui.t('rewards.earn.button')}</span>
  </a>`;
};

// Last card under the grid: the rest of the catalogue is in Tada (intent `redeem`, the store). Gated like every Redeem.
// The line names the user's balance when there is one, as a reason to go and look. Without a grid above it, its title
// does not say "something else".
const moreCard = () => {
  const { available } = common.balance;
  return `
  <section class="card card--soft rewards-more">
    <div class="rewards-more__head">
      <img class="rewards-more__art" src="../assets/images/home/giftbox.webp" alt="">
      <div class="stack stack--tight grow">
        <h3 class="t-title-s">${ui.t(rewards.length ? 'rewards.more.title' : 'rewards.more.titleAlone')}</h3>
        <p class="t-body c-2 num">${available > 0 ? ui.t('rewards.more.body', { points: ui.num(available) }) : ui.t('rewards.more.bodyNoCoins')}</p>
        <button class="btn btn--primary btn--sm rewards-more__cta" type="button" ${redeemAttrs(common, 'redeem', 'explore')} data-track="loyalty_card_click" data-track-target="rewards">${ui.t('rewards.more.button')}${ui.icon('right', 'icon--sm')}</button>
      </div>
    </div>
  </section>`;
};

const withEarn = hasTask && !common.program.ended;
const shownRewards = rewards.slice(0, withEarn ? GRID_CELLS - 1 : GRID_CELLS);
function rewardsGrid() {
  const cells = shownRewards.map((item, index) => ({ item, position: index + 1 }));
  if (withEarn) cells.splice(Math.min(EARN_CELL - 1, cells.length), 0, { earn: true });
  return `<div class="reward-grid">${cells.map((cell) => (cell.earn ? earnCard() : rewardCard(cell.item, cell.position))).join('')}</div>`;
}

// loyalty_rewards_view: the grid was seen (its first card at least half on screen; the whole grid can be taller than
// the screen), once per page load; the denominator of the reward clicks. With no rewards (empty catalog, or it failed)
// it is sent at once with reward_count 0.
function watchRewards() {
  const params = { reward_count: shownRewards.length, has_earn_card: withEarn && shownRewards.length > 0 };
  const grid = app.querySelector('.reward-grid');
  if (!grid) { trackView('loyalty_rewards_view', params); return; }
  new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); trackView('loyalty_rewards_view', params); }
  }, { threshold: 0.5 }).observe(grid.firstElementChild);
}

// A price too long to share its row with Redeem pushes Redeem onto its own line. When that happens on one card, every
// card gets the same layout (price, then Redeem under it), so the grid stays even (spec §49). Measured after render,
// once the font has loaded, and when the width changes.
function fitPrices() {
  const grid = app.querySelector('.reward-grid');
  if (!grid) return;
  grid.classList.remove('reward-grid--stacked');
  const wrapped = [...grid.querySelectorAll('.reward-card__foot')]
    .some((foot) => foot.lastElementChild.offsetTop > foot.firstElementChild.offsetTop + foot.firstElementChild.offsetHeight / 2);
  grid.classList.toggle('reward-grid--stacked', wrapped);
}

const app = document.getElementById('app');
const header = appHeader(ui, { title: ui.t('dash.title'), action: tourButton(ui) });

// Loading or failed to load: the header and a placeholder, nothing else (spec §44).
if (showStatus(ui, common, app, header)) {
  mountNav(ui, common, 'home');
} else {
  app.innerHTML = `
    ${header}
    ${balanceBlock(ui, common, { href: balanceHref })}
    ${checkInCard()}
    ${feed.html()}
    ${rewards.length ? `
    <div class="rewards-head">
      <h2 class="section-title">${ui.t('rewards.title')}</h2>
      <p class="t-body c-3">${ui.t('rewards.subtitle')}</p>
    </div>
    ${rewardsGrid()}` : ''}
    ${moreCard()}`;

  feed.start(app);
  watchRewards();
  fitPrices();
  document.fonts.ready.then(fitPrices);
  let width = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== width) { width = innerWidth; fitPrices(); } });
  mountNav(ui, common, 'home');
  mountJoinSheet(ui, common, app);
  mountStoreLinks(ui, app);

  // Guided tour: opens on the first visit, and again from the help button in the header.
  const tour = mountTour(ui, common, 'dashboard');
  app.querySelector('[data-tour-start]').addEventListener('click', tour.start);
}
