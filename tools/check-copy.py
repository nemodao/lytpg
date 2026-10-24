#!/usr/bin/env python3
"""Check that every language file in copy/ matches copy/en.json (spec §75).

Same keys, the same {placeholders} in each text, the same number of **bold** marks, and lists (months, weekdays) of
the same length. Run after changing any copy file:

    python3 tools/check-copy.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COPY = ROOT / 'copy'
LANGUAGES = ['id', 'zh']  # besides en, the reference language

placeholders = lambda text: sorted(re.findall(r'\{(\w+)\}', text))


def check(name, base, other):
    problems = []
    for key in base.keys() - other.keys():
        problems.append(f'{name}: missing {key}')
    for key in other.keys() - base.keys():
        problems.append(f'{name}: {key} is not in en.json')
    for key in base.keys() & other.keys():
        a, b = base[key], other[key]
        if isinstance(a, list):
            if not isinstance(b, list) or len(a) != len(b):
                problems.append(f'{name}: {key} should be a list of {len(a)}')
            continue
        if not isinstance(b, str) or not b.strip():
            problems.append(f'{name}: {key} is empty')
            continue
        if placeholders(a) != placeholders(b):
            problems.append(f'{name}: {key} has {placeholders(b)}, en.json has {placeholders(a)}')
        if a.count('**') != b.count('**'):
            problems.append(f'{name}: {key} has {b.count("**")} ** marks, en.json has {a.count("**")}')
    return problems


def main():
    base = json.loads((COPY / 'en.json').read_text(encoding='utf-8'))
    problems = []
    for name in LANGUAGES:
        problems += check(name, base, json.loads((COPY / f'{name}.json').read_text(encoding='utf-8')))
    if problems:
        print('\n'.join(problems))
        sys.exit(1)
    print(f'Copy check passed: {", ".join(LANGUAGES)} match en.json ({len(base)} keys).')


if __name__ == '__main__':
    main()
