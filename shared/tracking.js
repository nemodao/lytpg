// EVENT TRACKING — every analytics event of these pages goes through track() in this file (list in TRACKING.md).
//
// Destination: Google Tag Manager -> GA4. track() pushes { event: <name>, ...parameters } onto window.dataLayer; the
// GTM container (added by the host page, not by this code) forwards it to GA4. The client id is NOT sent from here:
// GTM sets it as the user property `client_id` at sign-in.
//
// Two ways an event is sent:
//   1. Clicks: the element carries data-track="<event name>", and optional parameters as data-track-<name>="<value>".
//      One listener (initTracking) reads them. To track a new button, add the attributes; no code.
//   2. Views and anything that is not a click: the code calls track() or trackView() directly.
//
// GA4 limits kept in mind: event and parameter names up to 40 characters, values up to 100, 25 parameters an event.
// Every value is sent as a string ("true", "3"), so one GA4 dimension never mixes types.
//
// GTM keeps the last value of every key pushed to the dataLayer: an event without `source` would otherwise be read with
// the `source` of an earlier event. So each push first clears every event parameter (PARAMS) by setting it to
// undefined. A new event parameter must be added to PARAMS (and to TRACKING.md).
import { highestTier } from './tiers.js';

const PARAMS = ['source', 'from', 'target', 'tab', 'range', 'trigger', 'capped', 'eligible', 'tier', 'next_tier', 'position',
  'reward_id', 'reward_name', 'affordable', 'reward_count', 'has_earn_card', 'status', 'kind', 'item_type', 'error_scope',
  'tour_step', 'step_count'];
const CLEARED = Object.fromEntries(PARAMS.map((name) => [name, undefined]));
const MAX_VALUE = 100; // GA4: longer values are cut

let base = {}; // parameters sent with every event of this page
const viewed = new Set(); // view events already sent since the page opened

const balanceRange = (coins) => (coins <= 0 ? '0' : coins < 1000 ? '1-999' : coins < 5000 ? '1000-4999' : '5000+');

const text = (params) => Object.fromEntries(Object.entries(params)
  .filter(([, value]) => value !== undefined && value !== null)
  .map(([key, value]) => [key, String(value).slice(0, MAX_VALUE)]));

export function track(name, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...CLEARED, ...base, ...text(params) });
}

// A view event is sent once per page load, however often the page re-renders. `key` tells apart several views of
// the same event (e.g. one per tour step).
export function trackView(name, params = {}, key = '') {
  const id = name + key;
  if (viewed.has(id)) return;
  viewed.add(id);
  track(name, params);
}

// Call once per page, before anything is tracked. `page` is 'home' | 'earn' | 'coins' | 'orders'. `extra`: parameters
// this page adds to all of its events (Redemption history: `view`).
// `loyalty_tier` is meant for GTM to set as the GA4 user property of that name (TRACKING.md); guests have none.
export function initTracking(page, common, extra = {}) {
  const { program, balance } = common;
  base = text({
    page,
    theme: document.documentElement.getAttribute('data-theme') || 'light',
    has_task: program.tradingTask !== false,
    join_step: program.joinRequirement || 'none', // 'signup' | 'kyc' | 'deposit' | 'none'
    credit_mode: program.creditMode || 'none', // 'in-day' | 'delayed' | 'none'
    balance_range: balanceRange(balance.available),
    loyalty_tier: common.guest ? undefined : highestTier(common.accounts),
    ...extra,
  });
  document.addEventListener('click', (event) => {
    const element = event.target.closest('[data-track]');
    if (!element) return;
    const params = {};
    for (const { name, value } of element.attributes) {
      if (name.startsWith('data-track-')) params[name.slice('data-track-'.length)] = value;
    }
    track(element.dataset.track, params);
  });
  track('loyalty_page_view');
}
