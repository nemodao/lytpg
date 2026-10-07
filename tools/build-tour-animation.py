#!/usr/bin/env python3
"""Prepare the artwork for the guided tour's looping item animations (steps 1 and 4).

The pages animate still images in code (shared/tour.js, `carousel`), which stays sharp on every screen and is far
lighter than a video. This script exports those stills:

    python3 tools/build-tour-animation.py            -> assets/tour/<name>-<n>.webp, one per item, 320px

It can also render the same motion as a video with a transparent background, for use outside the pages:

    python3 tools/build-tour-animation.py --video    -> dist/tour-animation/<name>.webm (VP9 with alpha)

The motion (kept in step with shared/tour.js): the items sit evenly spaced on an elliptical path and move right to
left. Only the item at the front is visible: as it moves away to the left it shrinks and fades out, while the next
one fades in from the right edge. Each item pauses at the front before the path turns again.

Needs Pillow; --video also needs imageio-ffmpeg (which bundles ffmpeg):  pip install pillow imageio-ffmpeg
Run from the project root.
"""
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'Design Elements' / 'Tutorial' / 'Animation'
OUT = ROOT / 'assets' / 'tour'
VIDEO_OUT = ROOT / 'dist' / 'tour-animation'
STILL_SIZE = 320                # px: 3x the largest size an item is shown at (about 96px)
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
        'holds': [2.5, 2.5, 2.5, 2.5, 2.5],
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


def export_stills(name, spec):
    """One square, trimmed WebP per item: assets/tour/<name>-<n>.webp."""
    for number, item in enumerate(spec['items'], start=1):
        image = Image.open(SOURCE / spec['folder'] / item).convert('RGBA')
        target = OUT / f'{name}-{number}.webp'
        image.resize((STILL_SIZE, STILL_SIZE), Image.LANCZOS).save(target, 'WEBP', quality=92, method=6)
        print(f'{target.name}: {target.stat().st_size // 1024} KB')


def render(name, spec):
    import imageio_ffmpeg

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
                             '-auto-alt-ref', '0', '-an', str(VIDEO_OUT / f'{name}.webm')], check=True)
    shutil.rmtree(frames)
    print(f'{name}.webm: {(VIDEO_OUT / f"{name}.webm").stat().st_size // 1024} KB, {total} frames, {total / FPS:.1f} s loop')


def main():
    args = sys.argv[1:]
    video = '--video' in args
    wanted = [arg for arg in args if arg != '--video'] or list(ANIMATIONS)
    (VIDEO_OUT if video else OUT).mkdir(parents=True, exist_ok=True)
    for name in wanted:
        (render if video else export_stills)(name, ANIMATIONS[name])


if __name__ == '__main__':
    main()
