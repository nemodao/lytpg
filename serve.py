#!/usr/bin/env python3
"""Local preview server. Like `python3 -m http.server`, but tells the browser never to cache,
so edits to CSS, JS, mock data and tokens show up on a normal reload.

Run from the project root:  python3 serve.py [port]
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Serving on http://localhost:{port}/pages/dashboard.html")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
