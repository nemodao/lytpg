#!/usr/bin/env python3
"""Write tokens.css from tokens.json. Run: python3 tokens/build.py

Since R3 (4 Nov 2026) every design value lives in hsb_app/docs/redesign/qa/tokens.json and reaches Loyalty through
tokens/hsb-tokens.css, a byte-equal copy (sh tools/check-tokens.sh). tokens.json here only names Loyalty's older
variables: aliases to R3 tokens, TOK-GAPs (QA1 §2b rule 3), stated exceptions, layout sizes and the legacy block read
by pages not yet redesigned. Pages load hsb-tokens.css first, then tokens.css.
"""
import json
import pathlib

here = pathlib.Path(__file__).parent
d = json.loads((here / "tokens.json").read_text(encoding="utf-8"))

# Scopes. R3 switches on data-mode (light by default) and data-premium. Declaring the single-value lines on every scope
# makes them re-resolve on a nested element that carries its own data-mode (the Earn sky, the Terms page).
EVERY = ":root, [data-mode], [data-premium]"
SCOPES = [
    ("light", ':root, [data-mode="light"]'),
    ("dark", '[data-mode="dark"]'),
    ("premiumLight", "[data-premium]"),
    ("premiumDark", '[data-premium][data-mode="dark"], [data-premium] [data-mode="dark"]'),
]
MODE_KEYS = {"all", "light", "dark", "premiumLight", "premiumDark"}


def value_of(entry):
    """An alias entry: 'name' of an R3 token, {'expr': ...}, or per-mode values."""
    if isinstance(entry, str):
        return {"all": f"var(--hsb-{entry})"}
    if "expr" in entry:
        return {"all": entry["expr"]}
    return {k: v for k, v in entry.items() if k in MODE_KEYS}


def note(block, entry, value):
    if block == "tokGap":
        return f" /* TOK-GAP: {entry['role']} {value} ({entry['source']}) */"
    if block == "exception":
        return f" /* {entry['ex']} */"
    return ""


every, per_mode = [], {k: [] for k, _ in SCOPES}
for block in ("alias", "tokGap", "exception", "layout", "legacy"):
    every.append(f"  /* {block} */")
    for k in per_mode:
        per_mode[k].append(f"  /* {block} */")
    for name, entry in d[block].items():
        vals = value_of(entry) if block == "alias" else {k: v for k, v in entry.items() if k in MODE_KEYS}
        # [data-premium] comes after [data-mode="dark"] with the same weight, so a Premium light value needs its dark one.
        if "premiumLight" in vals and "premiumDark" not in vals:
            vals["premiumDark"] = vals["dark"]
        if "all" in vals:
            every.append(f"  --{name}: {vals['all']};{note(block, entry, vals['all'])}")
            continue
        for k in per_mode:
            if k in vals:
                per_mode[k].append(f"  --{name}: {vals[k]};{note(block, entry, vals[k])}")

o = [
    "/* Loyalty variables, generated from tokens.json by build.py. Do not edit by hand.",
    f"   Version {d['$version']}. Values come from tokens/hsb-tokens.css (R3); see tokens.json $source. */",
    "",
]
for k, sel in SCOPES:
    o += [f"{sel} {{"] + per_mode[k] + ["}", ""]
o += [f"{EVERY} {{"] + every + ["}", ""]
(here / "tokens.css").write_text("\n".join(o), encoding="utf-8")
print("wrote tokens.css:", sum(1 for line in o if line.startswith("  --")), "declarations")
