// Live activity line on the Daily Trading cards (spec §31): "Trader 95***356 just earned 12 points", a new random
// entry every 1–6 s. Runs only while markets are open, Monday to Friday GMT+7 = Sunday 17:00 to Friday 17:00 UTC;
// hidden outside. Config: `common.liveFeed`. The open/closed check uses the mock "now" (or the `market-closed`
// state's override), moving forward in real time.
//
// The sequence is the same everywhere: entries come from a seeded generator keyed to the real clock, in one-minute
// blocks. Any page (Home or Earn), opened at the same moment, shows the same trader and points and changes at the same
// instant, so switching tabs never changes what is on screen.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BLOCK_MS = 60000;
const weekMinutes = ({ day, time }) => { const [h, m] = time.split(':').map(Number); return DAYS.indexOf(day) * 1440 + h * 60 + m; };

// Small deterministic random generator (mulberry32): the same seed always gives the same numbers.
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createLiveFeed(ui, common) {
  const config = common.liveFeed;
  const started = Date.now();

  function isOpen() {
    const now = new Date(Date.parse(config.clock || common.now) + (Date.now() - started));
    const minute = now.getUTCDay() * 1440 + now.getUTCHours() * 60 + now.getUTCMinutes();
    return minute >= weekMinutes(config.openUtc) && minute < weekMinutes(config.closeUtc);
  }

  // One entry drawn from `rand`: a weighted points band (config `points.bands`), a value on the `step` grid, a client.
  function draw(rand) {
    const { step, bands } = config.points;
    let roll = rand() * bands.reduce((sum, band) => sum + band.weight, 0);
    const band = bands.find((item) => (roll -= item.weight) < 0) || bands[bands.length - 1];
    const steps = Math.round((band.max - band.min) / step);
    const points = Math.round((band.min + Math.floor(rand() * (steps + 1)) * step) * 10) / 10;
    const client = `${config.clientIdPrefix}***${String(Math.floor(rand() * 1000)).padStart(3, '0')}`;
    return ui.t('task.liveFeed', { client, points: step >= 1 ? ui.num(points) : ui.lots(points) });
  }

  // The entry on screen at real time `t`, and when it ends. Each one-minute block replays its own seeded sequence of
  // (wait, entry) pairs from the block start; the last entry of a block is cut at the block's end.
  function entryAt(t) {
    const block = Math.floor(t / BLOCK_MS);
    const rand = seeded(block);
    const blockEnd = (block + 1) * BLOCK_MS;
    let start = block * BLOCK_MS;
    for (;;) {
      const wait = config.intervalSeconds[Math.floor(rand() * config.intervalSeconds.length)] * 1000;
      const text = draw(rand);
      const end = Math.min(start + wait, blockEnd);
      if (t < end) return { text, end };
      start = end;
    }
  }

  // Markup for the pill; empty while markets are closed.
  const html = () => (isOpen()
    ? `<p class="live-feed t-caption num" aria-live="polite"><i class="live-feed__dot" aria-hidden="true"></i><span data-live-feed>${entryAt(Date.now()).text}</span></p>`
    : '');

  // Start (or restart after a re-render) the updates inside `root`: switch to the next entry exactly when the current
  // one ends; the line hides itself once markets close.
  let timer = null;
  function start(root) {
    clearTimeout(timer);
    const tick = () => {
      timer = setTimeout(() => {
        const node = root.querySelector('[data-live-feed]');
        if (!node) return;
        if (!isOpen()) { node.closest('.live-feed').hidden = true; return; }
        node.textContent = entryAt(Date.now()).text;
        node.classList.remove('live-feed__in');
        void node.offsetWidth; // restart the fade-in
        node.classList.add('live-feed__in');
        tick();
      }, Math.max(0, entryAt(Date.now()).end - Date.now()) + 5);
    };
    if (root.querySelector('[data-live-feed]')) tick();
  }

  return { html, start };
}
