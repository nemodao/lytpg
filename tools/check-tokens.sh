#!/bin/sh
# The generated R3 token files (tokens.css, hsb-rim.g.json) must be byte-equal copies of the generated files in hsb_app (CLAUDE.md, Design token).
# Run from the repository root: sh tools/check-tokens.sh [path/to/hsb_app]
HSB="${1:-../hsb_app}/docs/redesign/qa"
status=0
for pair in "tokens/hsb-tokens.css:tokens.css" "tokens/hsb-rim.g.json:hsb-rim.g.json"; do
  mine="${pair%%:*}"; theirs="$HSB/${pair#*:}"
  if cmp -s "$mine" "$theirs"; then echo "ok    $mine"; else echo "DIFF  $mine is not byte-equal to $theirs"; status=1; fi
done
exit $status
