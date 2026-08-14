"""Three murmuration variations built on the reference mechanics.

  1. murmuration_flash   - flash expansion into a funnel/teardrop, then dilution
  2. murmuration_split   - one mass divides into two lobes, then merges
  3. murmuration_ribbon  - long sheared ribbon that folds into a dense core
"""
import math
import sys
from murmuration_engine import Murmuration, render_murmuration
from flock_rig import W, ROOT

DURATION = 10.0
ACTIVE = (0.7, 9.3)
# Enough members to read as a mass, but not so many full line-art contours overlap into visual noise.
COUNT = 72


def ease(v):
    v = max(0.0, min(1.0, v))
    return v * v * (3 - 2 * v)


def pulse(u, a, b):
    """0 -> 1 -> 0 window between a and b."""
    if u <= a or u >= b:
        return 0.0
    p = (u - a) / (b - a)
    return math.sin(math.pi * p)


# ---------------------------------------------------------------- variation 1
def path_flash(u):
    x = W + 430 - (W + 900) * u
    y = 600 - 210 * math.sin(math.pi * u) - 60 * math.sin(2 * math.pi * u)
    return x, y


def envelope_flash(u):
    # compact entry -> flash expansion -> tall funnel -> dilution before exit
    flash = pulse(u, 0.14, 0.52)
    funnel = pulse(u, 0.40, 0.86)
    dilute = ease((u - 0.70) / 0.30)
    rx = 280 + 175 * flash + 70 * dilute
    ry = 175 + 105 * flash + 185 * funnel
    shear = -0.46 * funnel
    # A flash expansion changes spacing and envelope size. It is not a stable donut.
    hollow = 0.0
    return rx, ry, shear, hollow, 0.0, 0.0


# ---------------------------------------------------------------- variation 2
def path_split(u):
    x = W + 430 - (W + 900) * u
    y = 560 - 170 * math.sin(math.pi * u)
    return x, y


def envelope_split(u):
    open_amt = pulse(u, 0.16, 0.78)
    # A compact cloud splits into two dense lobes, then visibly merges again.
    rx = 230 + 80 * open_amt
    ry = 145 + 18 * open_amt
    shear = 0.20 * math.sin(math.pi * u)
    hollow = 0.0
    split = 235 * open_amt
    return rx, ry, shear, hollow, split, 0.0


# ---------------------------------------------------------------- variation 3
def path_ribbon(u):
    x = W + 460 - (W + 960) * u
    y = 540 - 140 * math.sin(math.pi * u) - 40 * math.sin(2 * math.pi * u)
    return x, y


def envelope_ribbon(u):
    stretch = ease(u / 0.58) if u < 0.58 else 1.0 - 0.85 * ease((u - 0.58) / 0.42)
    # A long but thick S-body, then a fold back into a compact cloud.
    rx = 220 + 390 * stretch
    ry = 145 - 45 * stretch
    shear = 0.42 * stretch * math.sin(math.pi * (0.25 + u))
    hollow = 0.0
    ribbon = 190 * stretch
    return rx, ry, shear, hollow, 0.0, ribbon


VARIATIONS = {
    'flash': dict(path=path_flash, envelope=envelope_flash, seed=1,
                  out='murmuration_flash_prores4444.mov',
                  cohesion=0.024, separation=0.090, alignment=0.060, sep_radius=48.0),
    'split': dict(path=path_split, envelope=envelope_split, seed=2,
                  out='murmuration_split_prores4444.mov',
                  cohesion=0.028, separation=0.082, alignment=0.052, sep_radius=44.0),
    'ribbon': dict(path=path_ribbon, envelope=envelope_ribbon, seed=3,
                   out='murmuration_ribbon_prores4444.mov',
                   cohesion=0.020, separation=0.078, alignment=0.066, sep_radius=42.0),
}


def build(name):
    cfg = VARIATIONS[name]
    flock = Murmuration(
        COUNT, cfg['envelope'], cfg['path'], seed=cfg['seed'],
        cohesion=cfg['cohesion'], separation=cfg['separation'],
        alignment=cfg['alignment'], sep_radius=cfg['sep_radius'],
        size_range=(38, 225),
    )
    render_murmuration(ROOT / cfg['out'], DURATION, flock, ACTIVE)


if __name__ == '__main__':
    targets = sys.argv[1:] or list(VARIATIONS)
    for name in targets:
        build(name)
