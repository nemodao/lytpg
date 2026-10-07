#!/usr/bin/env python3
"""Build an offline copy of the three pages that opens straight from disk (file://), no server needed.

Browsers block fetch(), ES module imports, web fonts and external SVG sprites on file:// pages, so each page
is turned into one HTML file with its CSS, fonts, icons, scripts and mock data inlined. Images stay as files
in assets/ next to the pages (plain <img> works on file://).

Output: dist/hsb-loyalty-review/ (index.html, three pages, assets/images) and dist/hsb-loyalty-review.zip.
Run from the project root:  python3 tools/build-offline.py
"""
import base64
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist' / 'hsb-loyalty-review'
PAGES = ['dashboard', 'trading-task', 'point-balance']
# Shared modules in dependency order, with the variable each one is bound to in the bundle.
MODULES = {
    '../shared/app.js': '__app',
    '../shared/components.js': '__components',
    '../shared/date-filter.js': '__dateFilter',
    '../shared/nav.js': '__nav',
    '../shared/live-feed.js': '__liveFeed',
    '../shared/tour.js': '__tour',
}


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def data_uri(rel, mime):
    return f'data:{mime};base64,' + base64.b64encode((ROOT / rel).read_bytes()).decode()


def assets_to_local(text):
    # Pages live in pages/ and reach assets with ../assets/; offline they sit next to assets/.
    return text.replace('../assets/', 'assets/')


def css_bundle(page):
    base = read('shared/base.css')
    # Fonts must be inline: browsers refuse font files from file:// pages.
    base = re.sub(r'url\("\.\./(assets/fonts/[^"]+\.woff2)"\)', lambda m: f'url("{data_uri(m.group(1), "font/woff2")}")', base)
    parts = [read('tokens/tokens.css'), base, read('shared/components.css'), read(f'pages/{page}.css')]
    return assets_to_local('\n'.join(parts))


def strip_module(code):
    """Drop import lines and `export` keywords; return the code and the names it exported."""
    names = re.findall(r'^export (?:async )?(?:const|function) (\w+)', code, flags=re.M)
    code = re.sub(r'^export ', '', code, flags=re.M)
    imports = re.findall(r"^import \{([^}]+)\} from '([^']+)';\n", code, flags=re.M)
    code = re.sub(r"^import \{[^}]+\} from '[^']+';\n", '', code, flags=re.M)
    # Shared modules import each other with './x.js'; pages import them with '../shared/x.js'.
    bindings = ''.join(f'const {{{names_}}} = {MODULES[path.replace("./", "../shared/", 1) if path.startswith("./") else path]};\n' for names_, path in imports)
    return bindings + code, names


def script_bundle(page):
    out = []
    for path, var in MODULES.items():
        code, names = strip_module(read(path.replace('../', '')))
        out.append(f'const {var} = await (async () => {{\n{code}\nreturn {{ {", ".join(names)} }};\n}})();')
    page_code, _ = strip_module(read(f'pages/{page}.js'))
    out.append(f'await (async () => {{\n{page_code}\n}})();')
    # Demo-only review aids (state switcher, button explanations) are part of the review copy.
    for demo in ('demo/preview.js', 'demo/intents.js'):
        code, _ = strip_module(read(demo))
        out.append(f'await (async () => {{\n{code}\n}})();')
    js = '\n'.join(out)
    js = js.replace('../shared/icons.svg#', '#')
    return assets_to_local(js)


def data_bundle(page):
    files = ['mock/common.json', f'mock/{page}.json', 'copy/en.json', 'demo/intents.en.json']
    data = {f: json.loads(assets_to_local(read(f))) for f in files}
    return (
        'window.__DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n'
        # Serve the inlined JSON to the pages' fetch() calls.
        "const __fetch = window.fetch;\n"
        "window.fetch = (path) => {\n"
        "  const key = String(path).replace(/^\\.\\.\\//, '');\n"
        "  if (key in window.__DATA) {\n"
        "    const body = JSON.parse(JSON.stringify(window.__DATA[key]));\n"
        "    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });\n"
        "  }\n"
        "  return __fetch(path);\n"
        "};\n"
    )


def sprite():
    svg = read('shared/icons.svg').strip()
    return svg.replace('<svg ', '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" ', 1)


def build_page(page):
    html = read(f'pages/{page}.html')
    head_comment = html[: html.index('<html')]
    title = re.search(r'<title>(.*?)</title>', html).group(1)
    return f'''{head_comment}<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title}</title>
  <script>{read('shared/theme.js')}</script>
  <style>{css_bundle(page)}</style>
</head>
<body data-page="{page}">
  {sprite()}
  <main class="app" id="app"></main>
  <script>{data_bundle(page)}</script>
  <script type="module">
{script_bundle(page)}
  </script>
</body>
</html>
'''


def build_index():
    hub = read('tools/offline-index.html')
    hub = re.sub(r'url\("(assets/fonts/[^"]+\.woff2)"\)', lambda m: f'url("{data_uri(m.group(1), "font/woff2")}")', hub)
    return hub


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for page in PAGES:
        (OUT / f'{page}.html').write_text(build_page(page), encoding='utf-8')
    (OUT / 'index.html').write_text(build_index(), encoding='utf-8')
    shutil.copytree(ROOT / 'assets' / 'images', OUT / 'assets' / 'images',
                    ignore=shutil.ignore_patterns('.DS_Store', 'coin-hex.png'))
    # Tour animations: the WebP copies only (the WebM sources are not used by the pages).
    shutil.copytree(ROOT / 'assets' / 'tour', OUT / 'assets' / 'tour', ignore=shutil.ignore_patterns('.DS_Store', '*.webm'))
    archive = shutil.make_archive(str(OUT), 'zip', root_dir=OUT.parent, base_dir=OUT.name)
    print(f'Built {OUT.relative_to(ROOT)} and {Path(archive).relative_to(ROOT)}')


if __name__ == '__main__':
    main()
