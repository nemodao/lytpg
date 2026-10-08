#!/usr/bin/env python3
"""Build the copy of the code that goes to front-end developers, without any demo-only parts.

Left out: the demo/ folder (state switcher and the "Internal Explanation" button messages) and the
DEMO ONLY block at the end of each page's HTML. Buttons keep their data-intent attribute: it names where the
button leads, so developers can attach the matching deeplink (see spec §30).

The build stops with an error if anything demo-only is still referenced in the output.

Output: dist/handoff/ and dist/handoff.zip.  Run from the project root:  python3 tools/build-handoff.py
"""
import datetime
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist' / 'handoff'
INCLUDE = ['pages', 'shared', 'tokens', 'mock', 'copy', 'assets', 'HANDOFF.md', 'HANDOFF-2.md', 'CHANGELOG.md', 'DATA.md', 'STATES.md', 'spec.md']
SKIP = shutil.ignore_patterns('.DS_Store', '_*', 'coin-hex.png', '__pycache__')
DEMO_BLOCK = re.compile(r'\n[ \t]*<!-- DEMO ONLY: start.*?<!-- DEMO ONLY: end -->[ \t]*', re.S)
FORBIDDEN = ['demo/', 'intents.en.json', 'Internal Explanation', 'DEMO ONLY']


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for name in INCLUDE:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, OUT / name, ignore=SKIP)
        else:
            shutil.copy2(src, OUT / name)

    for html in (OUT / 'pages').glob('*.html'):
        text = html.read_text(encoding='utf-8')
        stripped = DEMO_BLOCK.sub('', text)
        if stripped == text:
            sys.exit(f'No DEMO ONLY block found in {html.name}; check the page before handing off.')
        html.write_text(stripped, encoding='utf-8')

    # Docs may mention the demo; code and data must not.
    leaks = []
    for path in OUT.rglob('*'):
        if path.suffix not in {'.html', '.js', '.css', '.json'}:
            continue
        text = path.read_text(encoding='utf-8')
        leaks += [f'{path.relative_to(OUT)}: {word}' for word in FORBIDDEN if word in text]
    if leaks:
        shutil.rmtree(OUT)
        sys.exit('Demo-only code found, handoff not built:\n  ' + '\n  '.join(leaks))

    # Version stamp, and from the second handoff on the exact changes since the previous one (git tag handoff-<N-1>).
    version = int((ROOT / 'HANDOFF_VERSION').read_text().strip())
    commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    update = f'HANDOFF-{version}.md'
    start = f'Already converted handoff {version - 1}? Read {update} only. First conversion? Start with HANDOFF.md.' if (ROOT / update).exists() else 'Start with HANDOFF.md'
    (OUT / 'VERSION.txt').write_text(f'Handoff {version}\nBuilt {datetime.date.today().isoformat()} from commit {commit}\n{start}\n', encoding='utf-8')
    previous = f'handoff-{version - 1}'
    if version > 1 and subprocess.run(['git', 'rev-parse', '-q', '--verify', previous], cwd=ROOT, capture_output=True).returncode == 0:
        diff = subprocess.run(['git', 'diff', previous, 'HEAD', '--', *INCLUDE, ':(exclude)assets'], cwd=ROOT, capture_output=True, text=True).stdout
        (OUT / f'CHANGES-since-{previous}.diff').write_text(diff, encoding='utf-8')

    archive = shutil.make_archive(str(OUT), 'zip', root_dir=OUT.parent, base_dir=OUT.name)
    print(f'Built {OUT.relative_to(ROOT)} and {Path(archive).relative_to(ROOT)} (no demo-only code)')


if __name__ == '__main__':
    main()
