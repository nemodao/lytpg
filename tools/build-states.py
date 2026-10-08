#!/usr/bin/env python3
"""Write STATES.md: the catalogue of preview states for every page, generated from the mock files.

The mock files are the source of truth (`stateGroups` with descriptions, and `states` with the data each one
overrides). Run this after adding, removing or describing a state, so the catalogue never drifts:

    python3 tools/build-states.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = [
    ('dashboard', 'Dashboard (Home tab)'),
    ('trading-task', 'Daily Trading (Earn tab)'),
    ('point-balance', 'Coin Balance (Coins tab)'),
]


def shared_states():
    app = (ROOT / 'shared' / 'app.js').read_text(encoding='utf-8')
    return re.findall(r"'([\w-]+)'", re.search(r'SHARED_STATES = \[([^\]]*)\]', app).group(1))


def patch_summary(patch):
    """Flatten a state's override into `path = value` lines, e.g. `common.balance.pending = 120`."""
    lines = []

    def walk(value, path):
        if isinstance(value, dict) and value:
            for key, inner in value.items():
                walk(inner, f'{path}.{key}' if path else key)
        else:
            text = json.dumps(value, ensure_ascii=False)
            if len(text) > 80:
                text = f'[{len(value)} items]' if isinstance(value, list) else text[:77] + '…'
            lines.append(f'`{path} = {text}`')

    walk(patch, '')
    return '<br>'.join(lines)


def main():
    shared = shared_states()
    out = [
        '# Preview states',
        '',
        '_Generated from `mock/*.json` by `tools/build-states.py`. Do not edit by hand: change the mock file, then run the script._',
        '',
        'A state is a named override of the mock data that shows one situation of a page. Turn states on with',
        '`?state=a,b` (they combine) or with the floating **States** button (demo only). Each page reads',
        '`mock/common.json` plus its own `mock/<page>.json`; a state merges its `common` and `page` parts over the',
        'default data (objects merge key by key, arrays and plain values replace).',
        '',
        f'**Shared states** mean the same thing on every page and carry over through links between pages: {", ".join(f"`{s}`" for s in shared)}.',
        '',
        'Guided tour: `?tour=<step>` resumes a step, `?tour=off` keeps it closed (use it for screenshots).',
        '',
        'Other URL parameters (demo aids): `?theme=light|dark`; Trading Task `?tab=history`; Coin Balance',
        '`?tab=available|expired|history`; date filters `?range=30` or `?range=YYYY-MM-DD..YYYY-MM-DD`, `?cal=1` opens the calendar.',
        '',
    ]
    for page, title in PAGES:
        data = json.loads((ROOT / 'mock' / f'{page}.json').read_text(encoding='utf-8'))
        out += [f'## {title}', '', f'File: `mock/{page}.json` · page: `pages/{page}.html`', '']
        out += ['| Group | State | What it shows | Data it changes |', '|---|---|---|---|']
        for group in data['stateGroups']:
            for name in group['states']:
                label = group.get('labels', {}).get(name)
                shown = f'`{name}`' + (f' ("{label}")' if label else '') + (' · shared' if name in shared else '')
                desc = group.get('descriptions', {}).get(name, '').replace('|', '\\|')
                out.append(f'| {group["title"]} | {shown} | {desc} | {patch_summary(data["states"][name])} |')
        out.append('')
    (ROOT / 'STATES.md').write_text('\n'.join(out), encoding='utf-8')
    print('Wrote STATES.md')


if __name__ == '__main__':
    main()
