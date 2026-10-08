// Dashboard (spec §3 for content and states, §10 for layout): header, balance, Daily Trading card, rewards mosaic.
import { load } from '../shared/app.js';
import { mountNav } from '../shared/nav.js';
import { createLiveFeed } from '../shared/live-feed.js';
import { mountTour } from '../shared/tour.js';
import { appHeader, balanceBlock, coin, joinPanel, tourButton } from '../shared/components.js';

const { common, page, ui } = await load('dashboard');
// `no-task-trading` state: the programme runs no trading task, so its card (and the Earn tab) are hidden.
const hasTask = common.program.tradingTask !== false;
const { task, rewards, checkIn } = page;

const balanceHref = ui.href('point-balance.html');
const taskHref = ui.href('trading-task.html', task.capped ? ['capped'] : []);

const detailsLink = (href) => `<a class="details above" href="${href}">${ui.t('common.details')}${ui.icon('right', 'icon--sm')}</a>`;

// The panel's footer only appears when today's max is reached.
const todayFoot = () =>
  task.capped
    ? `<div class="today__foot today__foot--icon">${ui.icon('trophy', 'icon--sm')}<span>${ui.t('task.capped')}</span></div>`
    : '';

const cupIcon = '<img class="task__icon" src="../assets/images/cups/purple.webp" alt="">';

const feed = createLiveFeed(ui, common);

// Today's progress, the live activity line and the trade button.
const taskProgress = () => `
    <div class="today">
      <div class="today__label">
        <p class="t-body-strong grow">${ui.t('task.todayLabel')}</p>
        <p class="t-caption blend-faint num">${ui.t('task.updateEvery', { minutes: common.program.refreshMinutes })}</p>
      </div>
      <div class="today__stats">
        <div><p class="t-caption c-3">${ui.t('task.traded')}</p><p class="today__value num">${ui.lots(task.lotsToday)}<small>${ui.lotUnit(task.lotsToday)}</small></p></div>
        <div><p class="t-caption c-3">${ui.t('task.earned')}</p><p class="today__value num">${coin('coin--sm')}${ui.num(task.pointsToday)}</p></div>
      </div>
      ${todayFoot()}
    </div>
    ${feed.html()}
    <button class="btn btn--onblend btn--lg task__cta above" type="button" data-intent="trade">${ui.t('task.trade')}</button>`;

// Users who still need KYC or a first deposit see "How to start" in place of today's progress (spec §39).
const taskCard = () => `
  <section class="card card--blend blend-pale-theme task">
    <a class="card-link" href="${taskHref}" aria-label="${ui.t('task.title')}"></a>
    ${cupIcon}
    <div class="task__head">
      <h2 class="t-title-s grow">${ui.t('task.title')}</h2>
      ${detailsLink(taskHref)}
    </div>
    <p class="t-body c-2">${ui.t('task.desc')}</p>
    ${common.program.joinRequirement ? joinPanel(ui, common, { ratesHref: taskHref }) : taskProgress()}
  </section>`;

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

// A reward tile is an image only; without an image it stays an empty neutral tile.
const reward = (item) => `
  <div class="reward">
    ${item.image ? `<img src="${ui.esc(item.image)}" alt="${ui.esc(item.alt)}">` : ''}
    <button class="btn btn--xs btn--glass reward__cta" type="button" data-intent="reward">${ui.t('balance.redeem')}</button>
  </div>`;

const app = document.getElementById('app');
app.innerHTML = `
  ${appHeader(ui, { title: ui.t('dash.title'), action: tourButton(ui) })}
  ${balanceBlock(ui, common, { href: balanceHref })}
  <hr class="dash-divider">
  ${checkInCard()}
  ${hasTask ? taskCard() : ''}
  <div class="rewards-head">
    <h2 class="section-title">${ui.t('rewards.title')}</h2>
    <p class="t-body c-3">${ui.t('rewards.subtitle')}</p>
  </div>
  <div class="mosaic blend-pink">${rewards.map(reward).join('')}</div>`;

feed.start(app);


mountNav(ui, common, 'home');

// Guided tour: opens on the first visit, and again from the help button in the header.
const tour = mountTour(ui, common, 'dashboard');
app.querySelector('[data-tour-start]').addEventListener('click', tour.start);
