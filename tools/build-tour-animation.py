#!/usr/bin/env python3
"""Render the guided tour's step 1 animation: coin, crown, gift box and cup travelling on an ellipse.

The four items sit a quarter turn apart on an elliptical path and move right to left. Only the item at the front is
visible: as it moves away to the left it shrinks and fades out gradually, reaching nothing by the time it gets to
the edge, while the next one fades in from the right edge. (SIDE_OPACITY above 0 would keep the two neighbours
faintly visible at the edges.)
Each item pauses at the front before the path turns again. The loop is seamless.

Output (transparent background): assets/tour/step-1.webm (VP9 with alpha) and assets/tour/step-1.webp
(animated WebP, the same frames, for browsers that cannot show transparent WebM, e.g. iOS).

Needs Pillow and imageio-ffmpeg (which bundles ffmpeg):  pip install pillow imageio-ffmpeg
Run from the project root:  python3 tools/build-tour-animation.py
"""
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'Design Elements' / 'Tutorial' / 'Animation' / 'Step 1'
OUT = ROOT / 'assets' / 'tour'
# Order of appearance at the front.
ITEMS = [
    'Glossy Blue Interlocking H Token 2.png',              # 1 coin
    'Glossy Jeweled Golden Crown 1.png',                   # 2 crown
    'Glossy Blue Gift Box with Bow 1.png',                 # 3 gift box
    'Golden Trophy Overflowing with Blue Gems (1) 2.png',  # 4 cup
]
WIDTH, HEIGHT = 720, 480        # 3x a 240x160 display size
FPS = 30
HOLD, MOVE = 1.1, 0.9           # seconds an item rests at the front / takes to move one place
FRONT_SIZE = 300                # px, item size at the front
SIDE_SCALE = 0.55                # size of the two side items, relative to the front one
SIDE_OPACITY = 0                # opacity of the two side items (0 = only the front item shows)
RADIUS_X, RADIUS_Y = 272, 26    # ellipse radii: sideways travel (sides sit near the edges), and how much higher the sides sit


def ease(t):
    return t * t * (3 - 2 * t)  # smoothstep


def turn_at(time):
    """How many places the ring has turned at `time` (seconds): hold, then ease to the next place."""
    step, within = divmod(time, HOLD + MOVE)
    return step + (ease((within - HOLD) / MOVE) if within > HOLD else 0)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = [Image.open(SOURCE / name).convert('RGBA') for name in ITEMS]
    total = round(len(items) * (HOLD + MOVE) * FPS)
    frames = Path(tempfile.mkdtemp())
    for index in range(total):
        turn = turn_at(index / FPS)
        frame = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
        placed = []
        for place, item in enumerate(items):
            # Angle from the front, in degrees: 0 = front, +90 = right, -90 = left. Items move right to left.
            angle = ((place - turn) * 90 + 180) % 360 - 180
            away = abs(angle) / 90                             # 0 front, 1 at a side, 2 at the back
            rad = math.radians(angle)
            depth = math.cos(rad)                              # 1 front, 0 at a side, -1 back
            # Front -> side: full to SIDE_OPACITY. Side -> back: SIDE_OPACITY to nothing.
            opacity = 1 - (1 - SIDE_OPACITY) * ease(away) if away <= 1 else SIDE_OPACITY * (1 - ease(away - 1))
            if opacity < 0.002:
                continue
            size = round(FRONT_SIZE * (SIDE_SCALE + (1 - SIDE_SCALE) * depth)) if depth >= 0 else round(FRONT_SIZE * SIDE_SCALE * (1 + 0.5 * depth))
            x = WIDTH / 2 + RADIUS_X * math.sin(rad)
            y = HEIGHT / 2 + 10 - RADIUS_Y * (1 - depth)
            placed.append((depth, item, size, x, y, opacity))
        for depth, item, size, x, y, opacity in sorted(placed, key=lambda entry: entry[0]):  # back to front
            sprite = item.resize((size, size), Image.LANCZOS)
            if opacity < 1:
                sprite.putalpha(sprite.getchannel('A').point(lambda value: round(value * opacity)))
            layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
            layer.paste(sprite, (round(x - size / 2), round(y - size / 2)))
            frame = Image.alpha_composite(frame, layer)
        frame.save(frames / f'{index:04d}.png')

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    common = [ffmpeg, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(frames / '%04d.png')]
    subprocess.run(common + ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '32', '-row-mt', '1',
                             '-auto-alt-ref', '0', '-an', str(OUT / 'step-1.webm')], check=True)
    # The WebP copy is half size and 20 fps to keep it light (animated WebP compresses far less than VP9).
    subprocess.run(common + ['-vf', f'fps=20,scale={WIDTH // 2}:{HEIGHT // 2}:flags=lanczos', '-c:v', 'libwebp_anim', '-lossless', '0',
                             '-q:v', '72', '-loop', '0', '-an', str(OUT / 'step-1.webp')], check=True)
    shutil.rmtree(frames)
    for name in ('step-1.webm', 'step-1.webp'):
        print(f'{name}: {(OUT / name).stat().st_size // 1024} KB, {total} frames, {total / FPS:.1f} s loop')


if __name__ == '__main__':
    main()
