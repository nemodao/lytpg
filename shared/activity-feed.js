// Recent activity card on Home and Earn (spec §50): [icon] "Trader 95***442 just redeemed iPhone 16 Pro" [3d ago], then
// "Trader 95***356 just earned 12 coins" [3m ago], one line at a time.
//
// Order: newest first within each kind. The two kinds take turns in rounds: "1:1" (one reward, one coin entry), "2:1",
// "3:1" and "3:2" (two rewards, then three coin entries), played in a shuffled order, one round of each, then shuffled
// again. So rewards come thicker in some stretches (where "1:1" and "3:2" meet) and thinner in others. Each kind loops
// on its own when it runs out (if one kind is missing, the other simply loops). A new entry every INTERVAL_MS.
// Home and Earn share the list and the place in the loop (kept for the session), so switching tabs or coming back goes
// on from where it was. A page may re-render as often as it likes: the entry on screen stays until the timer moves on.
//
// API: the list comes from POST /app/point/activity (data-source.js), asked for once per session and kept for the session
// (data-source.js, sessionCached). Each entry: type "gift" | "coin", client (already masked by the backend), reward
// (gift) or points (coin), at (ISO time). "3m ago" is worked out on screen from `at`, so it stays right as time passes.
import { coin } from './components.js';

const INTERVAL_MS = 4000;
// Rounds as [coin entries, rewards]; the rewards of a round come first: [3, 2] -> gift, gift, coin, coin, coin.
const ROUNDS = [[1, 1], [2, 1], [3, 1], [3, 2]];
const roundOf = ([coins, gifts]) => [...Array(gifts).fill('gift'), ...Array(coins).fill('coin')];
const PLACE_KEY = 'hsb-loyalty-activity-place-v2';

// The four rounds in a shuffled order (Fisher–Yates), one after the other.
const shuffledRounds = () => {
  const order = [...ROUNDS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.flatMap(roundOf);
};

const readPlace = () => {
  try { return JSON.parse(sessionStorage.getItem(PLACE_KEY)) || { gift: 0, coin: 0 }; } catch { return { gift: 0, coin: 0 }; }
};
const savePlace = (place) => { try { sessionStorage.setItem(PLACE_KEY, JSON.stringify(place)); } catch { /* the loop restarts next time */ } };

// With the Reward Store (Plan B, `common.rewardStore`, spec §61) nothing can be redeemed yet, so only coin entries show.
export function createActivityFeed(ui, common, items = []) {
  const sorted = items.filter((item) => !common.rewardStore || item.type === 'coin').sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const queues = { gift: sorted.filter((item) => item.type === 'gift'), coin: sorted.filter((item) => item.type === 'coin') };
  // The clock: the data's "now", moving forward in real time.
  const started = Date.now();
  const now = () => Date.parse(common.now) + (Date.now() - started);
  const place = readPlace();

  function next() {
    if (!place.round || place.roundAt >= place.round.length) { place.round = shuffledRounds(); place.roundAt = 0; }
    let kind = place.round[place.roundAt];
    place.roundAt += 1;
    if (!queues[kind].length) kind = kind === 'gift' ? 'coin' : 'gift';
    const queue = queues[kind];
    const item = queue[place[kind] % queue.length];
    place[kind] += 1;
    savePlace(place);
    return item;
  }

  function ago(iso) {
    const minutes = Math.floor((now() - Date.parse(iso)) / 60000);
    if (minutes < 1) return ui.t('time.justNow');
    if (minutes < 60) return minutes === 1 ? ui.t('time.minute') : ui.t('time.minutes', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? ui.t('time.hour') : ui.t('time.hours', { n: hours });
    const days = Math.floor(hours / 24);
    return days === 1 ? ui.t('time.day') : ui.t('time.days', { n: days });
  }

  const message = (item) => {
    const { client } = item; // ui.t escapes the values
    if (item.type === 'gift') return ui.t('activity.gift', { client, reward: item.reward });
    return item.points === 1 ? ui.t('activity.coin.one', { client }) : ui.t('activity.coin', { client, points: ui.num(item.points) });
  };
  const icon = (item) => (item.type === 'gift'
    ? '<img class="activity__icon" src="../assets/images/home/giftbox-gold.webp" alt="">'
    : coin('activity__icon'));
  const row = (item, fresh = false) =>
    `<span class="activity__row${fresh ? ' activity__in' : ''}">${icon(item)}<span class="activity__text num">${message(item)}</span><span class="activity__time num">${ago(item.at)}</span></span>`;

  // Markup for the card; empty when the backend sent nothing. While a reward entry is on screen the card takes a light
  // purple tint (activity--gift), so redeemed rewards stand out from the coin entries.
  const card = (item) => `card activity${item.type === 'gift' ? ' activity--gift' : ''}`;
  let current = null;
  const html = () => {
    if (!sorted.length) return '';
    current ??= next();
    return `<section class="${card(current)}" aria-live="polite" data-activity>${row(current)}</section>`;
  };

  // Start (or restart after a re-render) the timer that moves to the next entry in `root`.
  let timer = null;
  function start(root) {
    clearInterval(timer);
    if (!sorted.length) return;
    timer = setInterval(() => {
      const node = root.querySelector('[data-activity]');
      if (!node) return;
      current = next();
      node.className = card(current);
      node.innerHTML = row(current, true);
    }, INTERVAL_MS);
  }

  return { html, start };
}
