// Date-range filter shown above a list: "Last 7 days" (default), "Last 30 days", or a custom range picked on a
// calendar in a bottom sheet (review mockup G5). Used by the Trading Task history and the Point Balance tabs.
// Days are 'YYYY-MM-DD' keys in WIB; plain string comparison orders them.
// API: filtering is done here in the browser over the full list the page already has (`includes`). If the API pages
// or filters by date itself, call it from the page when the range changes and drop `includes`.
export function createDateFilter(ui, now, id) {
  const todayKey = ui.dayKey(now);
  const addDays = (key, days) => new Date(Date.parse(key) + days * 86400000).toISOString().slice(0, 10);
  const preset = (days) => ({ mode: String(days), from: addDays(todayKey, 1 - days), to: todayKey });

  let range = preset(7);
  let open = false;
  let month = todayKey.slice(0, 7); // 'YYYY-MM' shown in the calendar
  let pick = { from: null, to: null }; // selection in progress inside the calendar

  // Preview aid: ?range=30 or ?range=2026-10-01..2026-10-10.
  const wanted = new URLSearchParams(location.search).get('range') || '';
  if (wanted === '30') range = preset(30);
  else if (/^\d{4}-\d\d-\d\d\.\.\d{4}-\d\d-\d\d$/.test(wanted)) { const [from, to] = wanted.split('..'); range = { mode: 'custom', from, to }; }

  function openCalendar() {
    open = true;
    pick = range.mode === 'custom' ? { from: range.from, to: range.to } : { from: null, to: null };
    month = (pick.to || todayKey).slice(0, 7);
  }

  function chips() {
    const chip = (mode, label) =>
      `<button class="chip" type="button" aria-pressed="${range.mode === mode}" data-action="range" data-filter="${id}" data-mode="${mode}">${label}</button>`;
    const customLabel = range.mode === 'custom'
      ? (range.from === range.to ? ui.date(range.from) : ui.t('filter.range', { from: ui.date(range.from), to: ui.date(range.to) }))
      : ui.t('filter.custom');
    return `<div class="chips num">${chip('7', ui.t('filter.7'))}${chip('30', ui.t('filter.30'))}${chip('custom', customLabel)}</div>`;
  }

  // First tap sets the start, second the end. Future days cannot be picked.
  function sheet() {
    if (!open) return '';
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const lead = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7; // Monday first
    const { from, to } = pick;
    const end = to || from;
    const cells = Array.from({ length: daysInMonth }, (_, index) => {
      const key = `${month}-${String(index + 1).padStart(2, '0')}`;
      if (key > todayKey) return `<span class="cal__day cal__day--off">${index + 1}</span>`;
      const edge = key === from || key === end;
      const cls = [
        'cal__day',
        from && end !== from && key === from ? 'cal__day--start' : '',
        from && end !== from && key === end ? 'cal__day--end' : '',
        from && key > from && key < end ? 'cal__day--in' : '',
      ].join(' ');
      return `<button class="${cls}" type="button" data-action="pick-day" data-day="${key}">${edge ? `<b>${index + 1}</b>` : index + 1}</button>`;
    });
    const nextDisabled = month >= todayKey.slice(0, 7);
    return `
      <div class="scrim" data-action="close-sheet">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${ui.t('filter.sheet')}">
          <span class="sheet__grab"></span>
          <h2 class="t-title-s">${ui.t('filter.sheet')}</h2>
          <div class="cal-head">
            <button class="cal-nav" type="button" data-action="cal-month" data-step="-1" aria-label="${ui.t('cal.prev')}">${ui.icon('back')}</button>
            <p class="t-body-strong grow num">${ui.list('months')[monthNumber - 1]} ${year}</p>
            <button class="cal-nav" type="button" data-action="cal-month" data-step="1" aria-label="${ui.t('cal.next')}" ${nextDisabled ? 'disabled' : ''}>${ui.icon('right')}</button>
          </div>
          <div class="cal num">
            ${ui.list('weekdays').map((name) => `<span class="cal__weekday">${name}</span>`).join('')}
            ${'<span></span>'.repeat(lead)}
            ${cells.join('')}
          </div>
          <div class="sheet__actions">
            <button class="btn btn--stroke btn--lg" type="button" data-action="cal-cancel">${ui.t('common.cancel')}</button>
            <button class="btn btn--primary btn--lg" type="button" data-action="cal-apply" ${from ? '' : 'disabled'}>${ui.t('common.apply')}</button>
          </div>
        </div>
      </div>`;
  }

  // Handles a click on one of this filter's controls. Returns true when it changed something (the page then re-renders).
  function handle(target, event) {
    const action = target.dataset.action;
    if (action === 'range') {
      if (target.dataset.filter !== id) return false;
      if (target.dataset.mode === 'custom') openCalendar();
      else range = preset(Number(target.dataset.mode));
      return true;
    }
    if (!open) return false;
    if (action === 'cal-month') {
      const [year, monthNumber] = month.split('-').map(Number);
      month = new Date(Date.UTC(year, monthNumber - 1 + Number(target.dataset.step), 1)).toISOString().slice(0, 7);
    } else if (action === 'pick-day') {
      const day = target.dataset.day;
      // No start yet, a finished range, or a day before the start: begin a new range. Otherwise it closes the range.
      if (!pick.from || pick.to || day < pick.from) pick = { from: day, to: null };
      else pick = { from: pick.from, to: day };
    } else if (action === 'cal-apply') {
      range = { mode: 'custom', from: pick.from, to: pick.to || pick.from };
      open = false;
    } else if (action === 'cal-cancel') open = false;
    else if (action === 'close-sheet') {
      if (event.target !== target) return false; // taps inside the sheet do not close it
      open = false;
    } else return false;
    return true;
  }

  return {
    chips,
    sheet,
    handle,
    openCalendar,
    isOpen: () => open,
    close: () => { open = false; },
    includes: (iso) => { const key = ui.dayKey(iso); return key >= range.from && key <= range.to; },
  };
}
