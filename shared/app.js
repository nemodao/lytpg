// Shared runtime: loads mock data and copy, applies ?state=, and formats values.
// Pages never hold numbers or text themselves; they render what this module returns.

const params = new URLSearchParams(location.search);

// States that mean the same on several pages. Links between pages carry them along, so a Point Balance state
// set on the Dashboard is still on when you open Point Balance (and back).
const SHARED_STATES = ['empty', 'finger-skin', 'finger-peach', 'market-closed', 'needs-kyc', 'needs-deposit', 'has-pending', 'expiring'];

export const activeStates = (params.get('state') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const getJSON = (path) =>
  fetch(path).then((res) => {
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  });

// Objects merge key by key; arrays and primitives (including null) replace.
function merge(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    const isObject = value && typeof value === 'object' && !Array.isArray(value);
    if (isObject && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const WIB = 'Asia/Jakarta';
const NUMBER_LOCALE = 'en-US'; // spec §2: comma for thousands, dot for decimals, e.g. 12,450 and 3.5

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function makeUi(copy, common) {
  const fill = (template, vars, mapValue) =>
    template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? mapValue(vars[name]) : `{${name}}`));

  const text = (key) => {
    if (!(key in copy)) throw new Error(`Missing copy key: ${key}`);
    return copy[key];
  };

  const integer = new Intl.NumberFormat(NUMBER_LOCALE);
  const oneDecimal = new Intl.NumberFormat(NUMBER_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const hourMinute = new Intl.DateTimeFormat(copy.locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WIB });
  const dayKey = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: WIB }).format(new Date(iso));
  const today = dayKey(common.now);

  const ui = {
    esc: escapeHtml,
    // Plain text with {placeholders}; the result is HTML-escaped.
    t: (key, vars = {}) => escapeHtml(fill(text(key), vars, String)),
    // Same, but values are inserted as HTML (callers pass markup they built themselves).
    tHtml: (key, vars = {}) => fill(escapeHtml(text(key)), vars, String),
    // Copy with **bold** segments, as used by the rules list.
    md: (key, vars = {}) => escapeHtml(fill(text(key), vars, String)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
    num: (value) => integer.format(value),
    signed: (value) => (value < 0 ? '−' : '+') + integer.format(Math.abs(value)),
    lots: (value) => oneDecimal.format(value),
    // Spec examples: "1,0 lot", "0,5 lot", "3,5 lots".
    lotUnit: (value) => text(value > 0 && value <= 1 ? 'unit.lot' : 'unit.lots'),
    ptUnit: (value) => text(value === 1 ? 'unit.pt' : 'unit.pts'),
    // "12 Oct" — month names come from the copy file so they follow the UI language.
    // Arrays from the copy file (month and weekday names).
    list: (key) => text(key),
    dateYear: (iso) => { const [year, month, day] = dayKey(iso).split('-'); return `${Number(day)} ${copy.months[Number(month) - 1]} ${year}`; },
    date: (iso) => { const [, month, day] = dayKey(iso).split('-'); return `${Number(day)} ${copy.months[Number(month) - 1]}`; },
    time: (iso) => hourMinute.format(new Date(iso)),
    dayKey,
    isToday: (iso) => dayKey(iso) === today,
    daysUntil: (iso) => Math.round((Date.parse(dayKey(iso)) - Date.parse(today)) / 86400000),
    icon: (name, extraClass = '') =>
      `<svg class="icon ${extraClass}" aria-hidden="true"><use href="../shared/icons.svg#${name}"></use></svg>`,
    // Link to another page, keeping the theme override and any shared states, plus the states given here.
    href: (file, states = []) => {
      const query = new URLSearchParams();
      const carried = [...new Set([...states, ...activeStates.filter((name) => SHARED_STATES.includes(name))])];
      if (carried.length) query.set('state', carried.join(','));
      if (params.get('theme')) query.set('theme', params.get('theme'));
      const qs = query.toString().replace(/%2C/g, ',');
      return qs ? `${file}?${qs}` : file;
    },
  };
  return ui;
}

export async function load(page) {
  const [common, file, copy] = await Promise.all([
    getJSON('../mock/common.json'),
    getJSON(`../mock/${page}.json`),
    getJSON('../copy/en.json'),
  ]);
  const data = { common, page: structuredClone(file.default) };
  // States apply in the order they are declared in the mock file, so combinations are predictable.
  for (const name of Object.keys(file.states)) {
    if (activeStates.includes(name)) merge(data, structuredClone(file.states[name]));
  }
  return { ...data, has: (name) => activeStates.includes(name), ui: makeUi(copy, data.common) };
}
