"""Dramatic site-background flock: dive, curl, and pullout.

The flock enters high from the right, drops into a dense descending curl near the
lower center, then pulls upward and exits left. Every member is on a delayed
sample of the same moving route and receives full-strength center-notch wings.
"""
import math
from PIL import Image
import numpy as np
from flock_rig import W, H, FPS, ROOT, wing, clamp, smooth, bank, place, open_encoder

DURATION = 10.0
ACTIVE_START, ACTIVE_END = 0.65, 9.35
FRAMES = int(FPS * DURATION)

# key, lag, base vertical offset, width, wing frequency, phase, curl radius, curl sign
BIRDS = [
    ('C', .000,    0, 438, .49, .00,   0,  0),
    ('C', .018,   70, 292, .47, .13,  38,  1),
    ('A', .034,  -78, 244, .51, .26,  52, -1),
    ('B', .052,  125, 222, .45, .39,  66,  1),
    ('A', .070, -150, 202, .50, .52,  78, -1),
    ('D', .088,   32, 178, .46, .65,  86,  1),
    ('B', .106,  192, 170, .52, .78,  94, -1),
    ('A', .124, -218, 160, .48, .91, 102,  1),
    ('D', .142,  268, 145, .50, 1.04, 110, -1),
    ('B', .160, -272, 142, .46, 1.17, 116,  1),
    ('A', .178,  110, 132, .51, 1.30, 122, -1),
    ('D', .196, -102, 124, .47, 1.43, 128,  1),
    ('B', .214,  326, 118, .52, 1.56, 134, -1),
    ('D', .232, -328, 106, .48, 1.69, 140,  1),
    ('A', .250,   14, 112, .50, 1.82, 146, -1),
    ('D', .268,  208,  98, .46, 1.95, 152,  1),
    ('B', .286, -184, 104, .51, 2.08, 158, -1),
    ('D', .304,  366,  90, .47, 2.21, 164,  1),
    ('A', .322, -374,  96, .52, 2.34, 170, -1),
    ('D', .340,  156,  84, .48, 2.47, 174,  1),
    ('B', .358,  -48,  90, .50, 2.60, 180, -1),
    ('D', .376,  286,  76, .46, 2.73, 184,  1),
    ('D', .394, -254,  72, .51, 2.86, 188, -1),
    ('A', .412,   72,  82, .47, 2.99, 192,  1),
    ('D', .430, -128,  68, .50, 3.12, 196, -1),
    ('B', .448,  408,  74, .48, 3.25, 200,  1),
    ('D', .466, -406,  62, .52, 3.38, 204, -1),
]


def route(u):
    """High right entry -> deep lower-center dive -> high left pullout."""
    x = W + 500 - (W + 1020) * u
    y = 248 + 800 * (math.sin(math.pi * u) ** 2) * (1.0 - 0.48 * u)
    return x, y


def draw(canvas, u, t):
    edge = math.sin(math.pi * u)
    # Curl peaks during the dive and collapses during the upward pullout.
    dive = math.sin(math.pi * u) ** 1.25
    curl = dive * (0.80 + 0.20 * math.sin(math.pi * u))
    for key, lag, base_y, width, hz, phase, radius, sign in reversed(BIRDS):
        fu = clamp(u - lag * (0.48 + 0.52 * edge))
        x, y = route(fu)
        # A different but coherent half-to-three-quarter rotation per layer creates
        # a tight diving curl around a moving group center, never a static orbit.
        theta = phase + sign * (1.15 * math.pi * u + 0.55 * math.pi * (u ** 2))
        r = radius * curl
        x += r * 0.72 * math.cos(theta)
        y += base_y * (0.28 + 0.72 * edge) + r * math.sin(theta)
        # A travelling compression ripple keeps the cloud active during the curl.
        y += 11 * math.sin(2 * math.pi * (.19 * t) + phase) * dive
        angle = bank(route, fu) + 5.0 * math.sin(theta) * curl
        # Full amplitude wing stroke on EVERY bird. No pose cache, no flattened distant wings.
        wing_phase = 2 * math.pi * hz * t + phase
        place(canvas, wing(key, wing_phase, 1.0), x, y, width, angle)


def main():
    out = ROOT / 'dive_curl_murmuration_prores4444.mov'
    proc = open_encoder(out)
    for frame in range(FRAMES):
        t = frame / FPS
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        if ACTIVE_START <= t <= ACTIVE_END:
            u = smooth((t - ACTIVE_START) / (ACTIVE_END - ACTIVE_START))
            draw(canvas, u, t)
        proc.stdin.write(np.asarray(canvas).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('render failed')
    print(f'Wrote {out}')


if __name__ == '__main__':
    main()
