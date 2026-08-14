"""Single final symmetric murmuration.

Design rules:
  * every bird follows one live right-to-left flight path
  * 11 mirrored left/right pairs plus one center leader = 23 visible birds
  * each mirrored pair shares a strong, readable wing cycle
  * all birds use the same center-notch source-contour rig (C/A/B/D only)
  * symmetry breathes as the flock crosses, without static formation slots
"""
import math
from PIL import Image
import numpy as np
from flock_rig import W, H, FPS, ROOT, wing, clamp, smooth, bank, place, open_encoder

DURATION = 10.0
ACTIVE_START, ACTIVE_END = 0.75, 9.25
FRAMES = int(DURATION * FPS)

# key, rank, x trailing offset, mirrored y offset, width, phase offset
# Each record below becomes two birds: upper and lower, with identical wing phase.
PAIRS = [
    ('A', 1,  72,  56, 228, 0.03),
    ('B', 2, 132, 116, 202, 0.12),
    ('D', 3, 194, 176, 182, 0.21),
    ('A', 4, 256, 236, 166, 0.30),
    ('B', 5, 318, 292, 154, 0.39),
    ('D', 6, 378, 346, 144, 0.48),
    ('A', 7, 434, 394, 134, 0.57),
    ('D', 8, 488, 436, 124, 0.66),
    ('B', 9, 536, 472, 116, 0.75),
    ('D',10, 578, 504, 108, 0.84),
    ('D',11, 614, 532, 100, 0.93),
]
LEADER = ('C', 378)


def route(u):
    """A slow, graceful group-level glide from offscreen right to offscreen left."""
    x = W + 390 - (W + 820) * u
    y = 610 - 255 * math.sin(math.pi * u) - 78 * math.sin(2 * math.pi * u)
    return x, y


def draw(canvas, u, t):
    edge = math.sin(math.pi * u)
    # The silhouette begins compact, opens into a broad symmetric murmuration,
    # then closes before leaving. It remains anchored to one moving group route.
    breathe = 0.68 + 0.32 * edge
    pulse = 1.0 + 0.10 * math.sin(2 * math.pi * (0.20 * t - 0.08))
    gx, gy = route(u)
    base_phase = 2 * math.pi * 0.48 * t

    # Outer / smaller members render first. Every member below receives wing().
    members = []
    for key, rank, xoff, yoff, width, phaseoff in PAIRS:
        for side in (-1, 1):
            members.append((key, rank, xoff, side * yoff, width, phaseoff, side))
    members.append((LEADER[0], 0, 0, 0, LEADER[1], 0.0, 0))

    for key, rank, xoff, yoff, width, phaseoff, side in sorted(members, key=lambda m: m[4]):
        # All followers have small delay, keeping them a true moving flock.
        fu = clamp(u - 0.010 * rank * edge)
        x, y = route(fu)
        # Symmetric fan follows the moving center, with a gentle paired wave.
        pair_wave = 1.0 + 0.085 * math.sin(2 * math.pi * 0.18 * t + rank * 0.42)
        x += xoff * breathe * (0.76 + 0.24 * edge)
        y += yoff * breathe * pulse * pair_wave
        y += side * 5.0 * math.sin(2 * math.pi * 0.14 * t + rank * 0.36)
        # Identical up/down wing beats per mirrored pair, slight rank stagger.
        phase = base_phase + 2 * math.pi * phaseoff
        angle = bank(route, fu) + side * 1.2 * math.sin(2 * math.pi * 0.18 * t + rank * 0.35)
        # Full strength, readable wing articulation for EVERY visible bird.
        place(canvas, wing(key, phase, 1.0), x, y, width, angle)


def main():
    out = ROOT / 'symmetric_murmuration_final_prores4444.mov'
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
