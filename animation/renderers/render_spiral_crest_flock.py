"""Variation 1 - Spiral Crest.

Two follower shells orbit a shared moving center, complete a visible curl at the
crest, then unwrap and align into a clean leftward exit.
"""
import math
from flock_rig import W, render, wing, clamp, bank, place, ROOT

DURATION = 10.0


def route(u):
    x = W + 480 - (W + 980) * u
    y = 640 - 300 * math.sin(math.pi * u) - 90 * math.sin(2 * math.pi * u)
    return x, y


# key, lag, base-y, width, wing Hz, wing phase, wing strength, orbit radius, orbit phase, turns, shell
birds = [
    ('C', 0.000, 0, 415, .25, 0.15, 1.00, 0, 0.00, 0.00, 0),
    ('B', 0.032, -66, 232, .30, 2.10, .86, 46, 0.40, 1.15, 1),
    ('C', 0.062, 82, 258, .22, 4.00, .76, 60, 1.25, 1.05, -1),
    ('A', 0.092, -150, 182, .33, 1.25, .74, 74, 2.10, 1.25, 1),
    ('D', 0.120, -22, 158, .27, 3.20, .68, 84, 3.05, 1.10, -1),
    ('D', 0.146, 150, 134, .30, 5.15, .62, 92, 4.00, 1.30, 1),
    ('A', 0.172, -235, 126, .35, 2.75, .60, 100, 5.00, 1.12, -1),
    ('B', 0.196, 212, 148, .19, 4.65, .64, 110, 0.80, 1.28, 1),
    ('D', 0.220, 56, 108, .32, 0.95, .56, 118, 1.70, 1.08, -1),
    ('A', 0.244, -98, 114, .24, 3.80, .60, 124, 2.60, 1.32, 1),
    ('B', 0.266, 288, 120, .29, 1.85, .57, 132, 3.60, 1.14, -1),
    ('D', 0.290, -300, 96, .34, 5.65, .53, 138, 4.50, 1.26, 1),
    ('A', 0.312, 98, 100, .21, 2.40, .51, 144, 5.30, 1.06, -1),
    ('D', 0.334, -182, 88, .35, 4.20, .49, 150, 0.20, 1.30, 1),
    ('B', 0.354, 340, 102, .26, 0.60, .52, 156, 1.00, 1.10, -1),
    ('A', 0.374, -342, 82, .30, 3.05, .47, 160, 2.00, 1.22, 1),
    ('D', 0.394, 232, 76, .23, 5.00, .45, 166, 2.90, 1.04, -1),
    ('D', 0.414, -36, 70, .33, 1.55, .43, 172, 4.10, 1.28, 1),
]


def draw(canvas, u, t):
    fade = math.sin(math.pi * u)
    # curl is strongest just before mid-flight, then unwraps toward the exit
    curl = math.sin(math.pi * min(1.0, u * 1.18)) ** 1.35
    spread = fade * (0.70 + 0.62 * math.sin(math.pi * u))
    for key, lag, by, width, hz, wphase, strength, radius, ophase, turns, shell in reversed(birds):
        fu = clamp(u - lag * fade)
        x, y = route(fu)
        theta = ophase + shell * 2 * math.pi * turns * u
        x += radius * 0.70 * curl * math.cos(theta)
        y += by * spread + radius * curl * math.sin(theta) + 6 * math.sin(2 * math.pi * 0.14 * t + ophase)
        angle = bank(route, fu) + 2.0 * math.sin(theta) * curl
        place(canvas, wing(key, 2 * math.pi * hz * t + wphase, strength), x, y, width, angle)


render(ROOT / 'spiral_crest_flock_prores4444.mov', DURATION, draw, active=(0.8, 9.2))
