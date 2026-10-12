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

let base = {}; // parameters sent with every event of this page
const viewed = new Set(); // view events already sent since the page opened

const balanceRange = (coins) => (coins <= 0 ? '0' : coins < 1000 ? '1-999' : coins < 5000 ? '1000-4999' : '5000+');

export function track(name, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...base, ...params });
}

// A view event is sent once per page load, however often the page re-renders. `key` tells apart several views of
// the same event (e.g. one per tour step).
export function trackView(name, params = {}, key = '') {
  const id = name + key;
  if (viewed.has(id)) return;
  viewed.add(id);
  track(name, params);
}

// Call once per page, before anything is tracked. `page` is 'home' | 'earn' | 'coins'.
export function initTracking(page, common) {
  const { program, balance } = common;
  base = {
    page,
    theme: document.documentElement.getAttribute('data-theme') || 'light',
    has_task: program.tradingTask !== false,
    join_step: program.joinRequirement || 'none', // 'kyc' | 'deposit' | 'none'
    credit_mode: program.creditMode || 'none', // 'in-day' | 'delayed' | 'none'
    balance_range: balanceRange(balance.available),
  };
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
