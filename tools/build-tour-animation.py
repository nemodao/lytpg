#!/usr/bin/env python3
"""Render the guided tour's looping item animations (steps 1 and 4): items travelling on an ellipse.

The items sit evenly spaced on an elliptical path and move right to left. Only the item at the front is visible:
as it moves away to the left it shrinks and fades out gradually, reaching nothing by the time it gets to the edge,
while the next one fades in from the right edge. Each item pauses at the front before the path turns again (the
first one, which opens the loop, for a shorter time). The loop is seamless. (SIDE_OPACITY above 0 would keep the
two neighbours faintly visible at the edges.)

Output per animation (transparent background): assets/tour/<name>.webm (VP9 with alpha, the higher-quality source)
and assets/tour/<name>.webp (animated WebP, the same frames, used by the pages because iOS cannot show
transparent WebM).

Needs Pillow and imageio-ffmpeg (which bundles ffmpeg):  pip install pillow imageio-ffmpeg
Run from the project root:  python3 tools/build-tour-animation.py            (all animations)
                            python3 tools/build-tour-animation.py step-4     (one of them)
"""
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'Design Elements' / 'Tutorial' / 'Animation'
OUT = ROOT / 'assets' / 'tour'
# name -> source folder, items in order of appearance at the front, seconds each one rests there.
ANIMATIONS = {
    'step-1': {
        'folder': 'Step 1',
        'items': [
            'Glossy Blue Interlocking H Token 2.png',              # coin
            'Glossy Jeweled Golden Crown 1.png',                   # crown
            'Glossy Blue Gift Box with Bow 1.png',                 # gift box
            'Golden Trophy Overflowing with Blue Gems (1) 2.png',  # cup
        ],
        'holds': [2.0, 4.0, 4.0, 4.0],
    },
    'step-4': {
        'folder': 'Step 4',
        'items': ['Frame 29.png', 'Frame 30.png', 'Frame 31.png', 'Frame 32.png', 'Frame 33.png'],  # phone, earbuds, laptop, travel, foldable
        'holds': [2.0, 4.0, 4.0, 4.0, 4.0],
    },
}
WIDTH, HEIGHT = 720, 480        # 3x a 240x160 display size
FPS = 30
MOVE = 1.2                      # seconds to move one place
FRONT_SIZE = 300                # px, item size at the front
SIDE_SCALE = 0.55               # size of an item one place away from the front, relative to the front one
SIDE_OPACITY = 0                # opacity one place away from the front (0 = only the front item shows)
RADIUS_X, RADIUS_Y = 272, 26    # ellipse radii: sideways travel (one place away sits near the edge), and how much higher it sits


def ease(t):
    return t * t * (3 - 2 * t)  # smoothstep


def turn_at(time, holds):
    """How many places the ring has turned at `time` (seconds): each item holds, then eases to the next place."""
    for step, hold in enumerate(holds):
        if time < hold:
            return step
        time -= hold
        if time < MOVE:
            return step + ease(time / MOVE)
        time -= MOVE
    return len(holds)


def render(name, spec):
    items = [Image.open(SOURCE / spec['folder'] / item).convert('RGBA') for item in spec['items']]
    count = len(items)
    total = round((sum(spec['holds']) + count * MOVE) * FPS)
    frames = Path(tempfile.mkdtemp())
    for index in range(total):
        turn = turn_at(index / FPS, spec['holds'])
        frame = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
        placed = []
        for place, item in enumerate(items):
            # Places away from the front: 0 = front, +1 = one place to the right, -1 = one to the left.
            away_signed = (place - turn + count / 2) % count - count / 2
            away = abs(away_signed)
            if away >= 2:
                continue
            # One place away is drawn a quarter turn round the ellipse, whatever the number of items.
            rad = math.radians(away_signed * 90)
            depth = math.cos(rad)                              # 1 front, 0 one place away, -1 two places away
            # Front -> one place away: full to SIDE_OPACITY. One -> two places away: SIDE_OPACITY to nothing.
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
                             '-auto-alt-ref', '0', '-an', str(OUT / f'{name}.webm')], check=True)
    # The WebP copy is half size and 20 fps to keep it light (animated WebP compresses far less than VP9).
    subprocess.run(common + ['-vf', f'fps=20,scale={WIDTH // 2}:{HEIGHT // 2}:flags=lanczos', '-c:v', 'libwebp_anim', '-lossless', '0',
                             '-q:v', '72', '-loop', '0', '-an', str(OUT / f'{name}.webp')], check=True)
    shutil.rmtree(frames)
    for ext in ('webm', 'webp'):
        print(f'{name}.{ext}: {(OUT / f"{name}.{ext}").stat().st_size // 1024} KB, {total} frames, {total / FPS:.1f} s loop')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = sys.argv[1:] or list(ANIMATIONS)
    for name in wanted:
        render(name, ANIMATIONS[name])


if __name__ == '__main__':
    main()
