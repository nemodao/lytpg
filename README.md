# HSB Loyalty — UI demo

Mobile UI for the HSB Loyalty programme (IB partners): Dashboard, Daily Trading, Point Balance. Static HTML that runs in the app's webview.

- **View the demo:** open `index.html` (on GitHub Pages: the repository's Pages link).
- **Run locally:** `python3 serve.py 8000`, then open `http://localhost:8000/`.
- **Spec and rules:** `spec.md`, `CLAUDE.md`.

## For front-end developers

The `demo/` folder (state switcher and "Internal Explanation" pop-ups) is for review only and must not ship.
Build the handoff copy instead of using this repository as-is:

```
python3 tools/build-handoff.py
```

Buttons carry `data-intent` naming the deeplink to attach (spec §30).
