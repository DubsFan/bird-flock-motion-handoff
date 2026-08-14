"""Corrected flock variations.

This intentionally starts from the accepted moving-flock rig. Every bird follows
a delayed sample of one continuous right-to-left route. Murmuration is only a
moving offset field around that flight, never a static target-position system.
"""
import math
import sys
from pathlib import Path
from PIL import Image
import numpy as np

from flock_rig import W, H, FPS, ROOT, wing, clamp, smooth, bank, place, open_encoder

DURATION = 10.0
FRAMES = int(DURATION * FPS)
ACTIVE_START, ACTIVE_END = 0.75, 9.25

# key, route lag, baseline y, width, wing Hz, phase, wing strength, formation rank, alternating stream
BIRDS = [
    ('C', .000,    0, 410, .33, .20, 1.00, .00,  0),
    ('B', .030,  -62, 230, .38, 2.05, .88, .08,  1),
    ('C', .058,   78, 258, .32, 4.10, .80, .15, -1),
    ('A', .086, -148, 184, .40, 1.18, .78, .21,  1),
    ('D', .112,  -30, 158, .35, 3.17, .72, .27, -1),
    ('D', .138,  150, 136, .39, 5.02, .67, .33,  1),
    ('A', .164, -228, 128, .34, 2.69, .64, .39, -1),
    ('B', .188,  214, 150, .41, 4.57, .68, .45,  1),
    ('D', .212,   58, 110, .36, .89, .60, .51, -1),
    ('A', .236, -102, 116, .38, 3.73, .63, .57,  1),
    ('B', .258,  280, 122, .33, 1.80, .60, .63, -1),
    ('D', .282, -286,  98, .40, 5.56, .56, .69,  1),
    ('A', .304,   96, 102, .35, 2.34, .54, .75, -1),
    ('D', .326, -178,  90, .39, 4.11, .52, .81,  1),
    ('B', .346,  326, 104, .34, .55, .55, .86, -1),
    ('A', .366, -330,  84, .37, 2.99, .50, .90,  1),
    ('D', .386,  220,  78, .42, 4.91, .48, .95, -1),
    ('D', .406,  -44,  72, .36, 1.48, .46, 1.00,  1),
]
# Extra distant members provide murmuration density without obscuring the artist's
# recognizable foreground contours. They use the same four extracted source birds.
BIRDS += [
    ('D', .095, -112, 88, .40, .72, .52, .12, -1),
    ('D', .128,   94, 82, .37, 2.90, .50, .18,  1),
    ('A', .154, -182, 94, .35, 5.18, .55, .25, -1),
    ('D', .176,  172, 76, .42, 1.67, .47, .31,  1),
    ('B', .202,  -58, 98, .34, 3.45, .56, .38, -1),
    ('D', .226,  246, 70, .39, .31, .45, .50,  1),
    ('A', .248, -266, 82, .36, 4.41, .49, .60, -1),
    ('D', .270,  118, 68, .41, 2.13, .43, .70,  1),
    ('B', .292, -148, 86, .33, 5.72, .50, .82, -1),
    ('D', .314,   36, 64, .40, 1.04, .42, .94,  1),
]
# Keep the group compact: every bird still has a follower delay, but the tail
# never becomes a separate cross-screen event.
BIRDS = [(key, lag * 0.78, by, width, hz, phase, strength, rank, stream)
         for key, lag, by, width, hz, phase, strength, rank, stream in BIRDS]


def route_spiral(u):
    return W + 520 - (W + 1040) * u, 650 - 330 * math.sin(math.pi * u) - 105 * math.sin(2 * math.pi * u)


def route_split(u):
    return W + 500 - (W + 1000) * u, 600 - 255 * math.sin(math.pi * u) - 60 * math.sin(2 * math.pi * u)


def route_ribbon(u):
    return W + 540 - (W + 1080) * u, 585 - 230 * math.sin(math.pi * u) - 70 * math.sin(2 * math.pi * u)


def window(u, a, b):
    if u <= a or u >= b:
        return 0.0
    return math.sin(math.pi * (u - a) / (b - a))


def draw_spiral(canvas, u, t):
    """Moving cloud with two curling layers, then an orderly leftward unwrap."""
    edge = math.sin(math.pi * u)
    curl = window(u, .16, .82)
    for key, lag, by, width, hz, phase, strength, rank, stream in reversed(BIRDS):
        fu = clamp(u - lag * (0.48 + 0.52 * edge))
        x, y = route_spiral(fu)
        theta = phase + stream * 2 * math.pi * (0.46 + 0.20 * rank) * u
        radius = (30 + 112 * rank) * curl
        x += radius * .58 * math.cos(theta)
        y += by * (0.32 + 0.68 * edge) + radius * math.sin(theta)
        y += 7 * math.sin(2 * math.pi * .15 * t + phase)
        angle = bank(route_spiral, fu) + 2.2 * math.sin(theta) * curl
        place(canvas, wing(key, 2 * math.pi * hz * t + phase, strength), x, y, width, angle)


def draw_split(canvas, u, t):
    """One moving flock becomes two traveling lobes, then merges while still flying."""
    edge = math.sin(math.pi * u)
    split = window(u, .20, .80)
    for key, lag, by, width, hz, phase, strength, rank, stream in reversed(BIRDS):
        fu = clamp(u - lag * (0.52 + 0.48 * edge))
        x, y = route_split(fu)
        # Stream displacement is an offset around the live group route, not a target slot.
        y += by * (0.35 + 0.65 * edge) + stream * 205 * split
        x += stream * 38 * split * math.sin(math.pi * u)
        y += 12 * math.sin(2 * math.pi * (.12 * t + rank) + phase) * split
        angle = bank(route_split, fu) + stream * 5.5 * split
        place(canvas, wing(key, 2 * math.pi * hz * t + phase, strength), x, y, width, angle)


def draw_ribbon(canvas, u, t):
    """A connected moving S-ribbon that compresses into a compact exit flock."""
    edge = math.sin(math.pi * u)
    stretch = window(u, .10, .90)
    for key, lag, by, width, hz, phase, strength, rank, stream in reversed(BIRDS):
        # Rank extends the flock backward along the same moving route.
        fu = clamp(u - (lag + .10 * rank * stretch) * (0.48 + 0.52 * edge))
        x, y = route_ribbon(fu)
        body_phase = 2 * math.pi * rank - 1.35 * math.pi * u
        x += 58 * stretch * math.cos(body_phase)
        y += by * (.20 + .52 * edge) + 158 * stretch * math.sin(body_phase)
        y += 6 * math.sin(2 * math.pi * .14 * t + phase)
        angle = bank(route_ribbon, fu) + 5.0 * stretch * math.cos(body_phase)
        place(canvas, wing(key, 2 * math.pi * hz * t + phase, strength), x, y, width, angle)


VARIATIONS = {
    'spiral': ('corrected_spiral_crest_prores4444.mov', draw_spiral),
    'split': ('corrected_split_rejoin_prores4444.mov', draw_split),
    'ribbon': ('corrected_murmuration_ribbon_prores4444.mov', draw_ribbon),
}


def render(name):
    out_name, draw = VARIATIONS[name]
    proc = open_encoder(ROOT / out_name)
    for frame in range(FRAMES):
        t = frame / FPS
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        if ACTIVE_START <= t <= ACTIVE_END:
            u = smooth((t - ACTIVE_START) / (ACTIVE_END - ACTIVE_START))
            draw(canvas, u, t)
        proc.stdin.write(np.asarray(canvas).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit(f'Failed: {out_name}')
    print(f'Wrote {out_name}')


if __name__ == '__main__':
    targets = sys.argv[1:] or list(VARIATIONS)
    for target in targets:
        render(target)
