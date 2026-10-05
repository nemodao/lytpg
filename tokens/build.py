#!/usr/bin/env python3
"""Generate tokens.css from tokens.json. Run: python3 build.py"""
import json, re, pathlib

here = pathlib.Path(__file__).parent
d = json.loads((here / "tokens.json").read_text())


def v(name):
    name = name.replace("%", "").replace(":", "")
    return "--" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def decl(name, value, prefix=""):
    return f"  {v(prefix + name)}: {value};"


sem = d["color"]["semantic"]
fx = d["effect"]
o = [
    "/* Loyalty design tokens — generated from tokens.json by build.py. Do not edit by hand.",
    f"   Version {d['$version']}. Base values come from Figma (IB Partnership - UI); the Custom sections were added in review. */",
    "",
    ':root, [data-theme="light"] {',
    "  /* Color — primitives */",
]
o += [decl(k, x, "color/") for k, x in d["color"]["primitive"].items()]
o += ["", "  /* Color — semantic (light) */"] + [decl(k, x) for k, x in sem["light"].items()]
o += ["", "  /* Effect strengths (light) */"] + [decl(k, x) for k, x in fx["light"].items()]
o += ["", "  /* Spacing */"] + [decl(k, f"{x}px") for k, x in d["spacing"].items()]
o += ["", "  /* Radius */"] + [decl(k, f"{x}px") for k, x in d["radius"].items()]
o += ["", "  /* Component sizes */"] + [decl(k, f"{x}px") for k, x in d["size"].items()]
o += ["", "  /* Typography — use with the `font` shorthand */"]
for k, t in d["typography"].items():
    o.append(decl(k, f"{t['fontWeight']} {t['fontSize']}px/{t['lineHeight']}px \"{t['fontFamily']}\", sans-serif", "font/"))
    if t["letterSpacingPercent"]:
        o.append(decl(k, f"{round(t['letterSpacingPercent'] / 100, 4)}em", "letter-spacing/"))
o += ["", "  /* Shadow */"]
o += [decl(k, x, "" if k.lower().startswith("shadow") else "shadow/") for k, x in d["shadow"].items()]
o += ["", "  /* Blend cards — gradient colour stops. Same in light and dark. */"]
for name, b in d["blend"].items():
    for k, x in b["stops"].items():
        o.append(f"  --blend-{name}-{k}: {x};")
o += ["}", "", "/* Color — semantic (dark) */", '[data-theme="dark"] {']
o += [decl(k, x) for k, x in sem["dark"].items()]
o += ["", "  /* Effect strengths (dark) */"] + [decl(k, x) for k, x in fx["dark"].items()]
o += ["}", ""]
o += [
    "/* Composed tokens — built from the variables above. Declared on every theme scope so they",
    "   re-resolve when data-theme is set on a nested element. */",
    ':root, [data-theme="light"], [data-theme="dark"] {',
]
o += [f"  --{k}: {x};" for k, x in d["composed"].items()]
for name, b in d["blend"].items():
    o.append(f"  --blend-{name}-bg: {b['bg']};")
    o.append(f"  --blend-{name}-fg: {b['fg']};")
    o.append(f"  --blend-{name}-ink: {b['ink']};")
o += ["}", ""]
(here / "tokens.css").write_text("\n".join(o))
print("wrote tokens.css:", sum(1 for l in o if l.startswith("  --")), "declarations")
