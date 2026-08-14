"""Variation 2 - Split and Rejoin.

The flock enters as one group, divides into a high stream and a low stream around
an open center, then reunites behind the lead bird before the leftward exit.
"""
import math
from flock_rig import W, render, wing, clamp, bank, place, ROOT

DURATION = 10.0


def route(u):
    x = W + 460 - (W + 940) * u
    y = 600 - 250 * math.sin(math.pi * u) - 70 * math.sin(2 * math.pi * u)
    return x, y


# key, lag, base-y, width, wing Hz, wing phase, wing strength, stream (+1 high, -1 low), sway phase
birds = [
    ('C', 0.000, 0, 420, .25, 0.15, 1.00, 0, 0.0),
    ('B', 0.030, -54, 236, .30, 2.10, .86, 1, 0.4),
    ('C', 0.058, 62, 252, .22, 4.00, .76, -1, 1.2),
    ('A', 0.086, -118, 186, .33, 1.25, .74, 1, 2.1),
    ('D', 0.112, 96, 160, .27, 3.20, .68, -1, 3.1),
    ('D', 0.138, -168, 138, .30, 5.15, .62, 1, 4.0),
    ('A', 0.162, 146, 128, .35, 2.75, .60, -1, 5.0),
    ('B', 0.186, -214, 150, .19, 4.65, .64, 1, 0.8),
    ('D', 0.210, 190, 112, .32, 0.95, .56, -1, 1.7),
    ('A', 0.234, -74, 116, .24, 3.80, .60, 1, 2.6),
    ('B', 0.256, 244, 122, .29, 1.85, .57, -1, 3.6),
    ('D', 0.280, -262, 98, .34, 5.65, .53, 1, 4.5),
    ('A', 0.302, 122, 102, .21, 2.40, .51, -1, 5.3),
    ('D', 0.324, -142, 90, .35, 4.20, .49, 1, 0.2),
    ('B', 0.344, 296, 104, .26, 0.60, .52, -1, 1.0),
    ('A', 0.364, -308, 84, .30, 3.05, .47, 1, 2.0),
    ('D', 0.384, 206, 78, .23, 5.00, .45, -1, 2.9),
    ('D', 0.404, -46, 72, .33, 1.55, .43, 1, 4.1),
]


def draw(canvas, u, t):
    fade = math.sin(math.pi * u)
    # separation opens after entry, peaks mid-flight, closes before exit
    if u < 0.20:
        sep = 0.0
    elif u < 0.50:
        p = (u - 0.20) / 0.30
        sep = p * p * (3 - 2 * p)
    elif u < 0.78:
        sep = 1.0
    else:
        p = (u - 0.78) / 0.22
        sep = 1.0 - p * p * (3 - 2 * p)
    for key, lag, by, width, hz, wphase, strength, stream, sway in reversed(birds):
        fu = clamp(u - lag * (0.45 + 0.55 * fade))
        x, y = route(fu)
        y += by * (0.34 + 0.66 * fade)
        # streams pull apart vertically and lean slightly forward/back while divided
        y += stream * 210 * sep
        x += stream * 54 * sep * math.sin(math.pi * sep)
        y += 7 * math.sin(2 * math.pi * 0.15 * t + sway)
        angle = bank(route, fu) + stream * 5.0 * sep
        place(canvas, wing(key, 2 * math.pi * hz * t + wphase, strength), x, y, width, angle)


render(ROOT / 'split_rejoin_flock_prores4444.mov', DURATION, draw, active=(0.8, 9.2))
