// DEMO ONLY — floating state switcher. Not part of the product UI.
// To remove it, delete the demo/ folder and the DEMO ONLY block at the end of each page's HTML.

const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);
const active = new Set((params.get('state') || '').split(',').map((s) => s.trim()).filter(Boolean));

const file = await fetch(`../mock/${page}.json`).then((res) => res.json());
const states = Object.keys(file.states);
// States are listed by the part of the page they change (mock file `stateGroups`, with optional display `labels`
// and `descriptions` shown in a tooltip on hover or keyboard focus);
// anything not grouped goes last.
const grouped = (file.stateGroups || []).flatMap((group) => group.states);
const stateGroups = [...(file.stateGroups || []), { title: 'Other', states: states.filter((name) => !grouped.includes(name)) }]
  .filter((group) => group.states.length);

// Single-choice groups. Each maps to one URL parameter; the first option is the default and is left out of the URL.
const groups = [
  { param: 'theme', title: 'Theme', options: [['auto', 'auto'], ['light', 'light'], ['dark', 'dark']] },
];
const current = (group) => {
  const value = params.get(group.param);
  return group.options.some(([option]) => option === value) ? value : group.options[0][0];
};

const style = document.createElement('style');
style.textContent = `
.preview { position: fixed; right: var(--spacing-12); bottom: calc(env(safe-area-inset-bottom, 0px) + var(--nav-gap, 0px) + var(--nav-height, 0px) + var(--spacing-12)); z-index: 100; display: flex; flex-direction: column; align-items: flex-end; gap: var(--spacing-8); font: var(--font-x-small-medium); }
.preview__toggle { height: var(--size-control-sm); padding: 0 var(--spacing-14); border-radius: var(--radius-pill); background: var(--ui-text-primary); color: var(--ui-text-dark); box-shadow: var(--shadow); }
.preview__panel { width: calc(var(--size-reward-width) - var(--spacing-20)); max-height: 70vh; overflow: auto; padding: var(--spacing-12); border-radius: var(--radius-card-inner); background: var(--card-surface); border: var(--size-stroke) solid var(--card-stroke); box-shadow: var(--shadow); display: flex; flex-direction: column; gap: var(--spacing-8); color: var(--ui-text-primary); }
.preview__head { font: var(--font-small-semibold); }
.preview__title { margin-top: var(--spacing-4); padding-top: var(--spacing-8); border-top: var(--size-stroke) solid var(--ui-line-soft); color: var(--ui-text-tertiary); }
.preview label { display: flex; align-items: center; gap: var(--spacing-8); min-height: var(--size-control-sm); }
.preview input { width: var(--size-check); height: var(--size-check); margin: 0; accent-color: var(--accent-surface-brand); }
.preview__tip { position: fixed; z-index: 101; max-width: calc(var(--size-reward-width) - var(--spacing-20)); padding: var(--spacing-8) var(--spacing-10); border-radius: var(--radius-control); background: var(--ui-text-primary); color: var(--ui-text-dark); font: var(--font-x-small-regular); box-shadow: var(--shadow); pointer-events: none; }
.preview__reset { align-self: flex-start; color: var(--ui-text-brand); min-height: var(--size-control-sm); }
`;
document.head.appendChild(style);

const groupMarkup = (group) => `
    ${group.options.map(([value, label]) => `<label><input type="radio" name="${group.param}" value="${value}" ${current(group) === value ? 'checked' : ''}>${label}</label>`).join('')}`;

const root = document.createElement('div');
root.className = 'preview';
root.innerHTML = `
  <div class="preview__panel" hidden>
    <p class="preview__head">States · ${page}</p>
    ${stateGroups.map((group) => `
      <p class="preview__title">${group.title}</p>
      ${group.states.map((name) => `<label data-desc="${((group.descriptions || {})[name] || '').replace(/"/g, '&quot;')}"><input type="checkbox" name="state" value="${name}" ${active.has(name) ? 'checked' : ''}>${(group.labels || {})[name] || name}</label>`).join('')}`).join('')}
    <p class="preview__title">Theme</p>
    ${groups.map(groupMarkup).join('')}
    <button class="preview__reset" type="button">Reset to default</button>
  </div>
  <button class="preview__toggle" type="button" aria-expanded="false">States${active.size ? ` (${active.size})` : ''}</button>`;
document.body.appendChild(root);

const panel = root.querySelector('.preview__panel');

// Description tooltip, placed to the left of the panel next to the state under the pointer.
const tip = document.createElement('div');
tip.className = 'preview__tip';
tip.hidden = true;
document.body.appendChild(tip);
const showTip = (label) => {
  const text = label && label.dataset.desc;
  if (!text) { tip.hidden = true; return; }
  tip.textContent = text;
  tip.hidden = false;
  const box = label.getBoundingClientRect();
  const panelBox = panel.getBoundingClientRect();
  tip.style.top = `${Math.max(8, Math.min(box.top, window.innerHeight - tip.offsetHeight - 8))}px`;
  tip.style.left = `${Math.max(8, panelBox.left - tip.offsetWidth - 8)}px`;
};
panel.addEventListener('mouseover', (event) => showTip(event.target.closest('label[data-desc]')));
panel.addEventListener('mouseleave', () => { tip.hidden = true; });
panel.addEventListener('focusin', (event) => showTip(event.target.closest('label[data-desc]')));
panel.addEventListener('focusout', () => { tip.hidden = true; });
const toggle = root.querySelector('.preview__toggle');

// Keep the panel open across the reload that follows each change.
const OPEN_KEY = 'loyalty-preview-open';
const remember = (open) => { try { sessionStorage.setItem(OPEN_KEY, open ? '1' : ''); } catch (e) { /* storage unavailable */ } };
try { panel.hidden = sessionStorage.getItem(OPEN_KEY) !== '1'; } catch (e) { /* storage unavailable */ }
toggle.setAttribute('aria-expanded', String(!panel.hidden));

toggle.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
  remember(!panel.hidden);
});

function go(nextStates, choices) {
  const query = [];
  if (nextStates.length) query.push(`state=${nextStates.join(',')}`);
  groups.forEach((group) => {
    const value = choices[group.param];
    if (value && value !== group.options[0][0]) query.push(`${group.param}=${value}`);
  });
  location.assign(location.pathname + (query.length ? `?${query.join('&')}` : ''));
}

panel.addEventListener('change', () => {
  const nextStates = [...panel.querySelectorAll('input[name="state"]:checked')].map((input) => input.value);
  const choices = {};
  groups.forEach((group) => {
    const checked = panel.querySelector(`input[name="${group.param}"]:checked`);
    if (checked) choices[group.param] = checked.value;
  });
  go(nextStates, choices);
});

root.querySelector('.preview__reset').addEventListener('click', () => go([], {}));
