"""Variation 3 - Murmuration Ribbon.

The flock stretches into a long S-shaped ribbon, a slow wave travels from the tail
to the leader, then the ribbon folds into a compact cluster for the exit.
"""
import math
from flock_rig import W, render, wing, clamp, bank, place, ROOT

DURATION = 10.0


def route(u):
    x = W + 500 - (W + 1000) * u
    y = 560 - 190 * math.sin(math.pi * u) - 55 * math.sin(2 * math.pi * u)
    return x, y


# key, rank (0 leader .. 1 tail), base-y, width, wing Hz, wing phase, wing strength
birds = [
    ('C', 0.00, 0, 410, .25, 0.15, 1.00),
    ('B', 0.06, -40, 238, .30, 2.10, .86),
    ('C', 0.12, 44, 250, .22, 4.00, .76),
    ('A', 0.18, -70, 188, .33, 1.25, .74),
    ('D', 0.24, 64, 162, .27, 3.20, .68),
    ('D', 0.30, -96, 140, .30, 5.15, .62),
    ('A', 0.36, 88, 130, .35, 2.75, .60),
    ('B', 0.42, -110, 152, .19, 4.65, .64),
    ('D', 0.48, 104, 114, .32, 0.95, .56),
    ('A', 0.54, -84, 118, .24, 3.80, .60),
    ('B', 0.60, 118, 124, .29, 1.85, .57),
    ('D', 0.66, -126, 100, .34, 5.65, .53),
    ('A', 0.72, 92, 104, .21, 2.40, .51),
    ('D', 0.78, -104, 92, .35, 4.20, .49),
    ('B', 0.84, 132, 106, .26, 0.60, .52),
    ('A', 0.89, -140, 86, .30, 3.05, .47),
    ('D', 0.94, 110, 80, .23, 5.00, .45),
    ('D', 1.00, -60, 74, .33, 1.55, .43),
]


def draw(canvas, u, t):
    fade = math.sin(math.pi * u)
    # ribbon extends through the first half, then folds into a cluster
    if u < 0.55:
        p = u / 0.55
        stretch = p * p * (3 - 2 * p)
    else:
        p = (u - 0.55) / 0.45
        stretch = 1.0 - 0.88 * (p * p * (3 - 2 * p))
    for key, rank, by, width, hz, wphase, strength in reversed(birds):
        # tail members lag further behind, creating the long ribbon body
        fu = clamp(u - rank * (0.055 + 0.400 * stretch) * (0.30 + 0.70 * fade))
        x, y = route(fu)
        # S-curve: two opposing lateral lobes along the ribbon length
        wave = math.sin(math.pi * rank * 2.0 - 1.35 * math.pi * u)
        y += by * (0.28 + 0.72 * fade) * (0.45 + 0.55 * stretch)
        y += 168 * stretch * wave
        x += 46 * stretch * math.cos(math.pi * rank * 2.0 - 1.35 * math.pi * u)
        y += 6 * math.sin(2 * math.pi * 0.13 * t + rank * 6.0)
        angle = bank(route, fu) + 4.5 * wave * stretch
        place(canvas, wing(key, 2 * math.pi * hz * t + wphase, strength), x, y, width, angle)


render(ROOT / 'murmuration_ribbon_flock_prores4444.mov', DURATION, draw, active=(0.8, 9.2))
