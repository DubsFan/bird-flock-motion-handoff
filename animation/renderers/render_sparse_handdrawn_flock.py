from pathlib import Path
from PIL import Image, ImageDraw
import math
import subprocess
import numpy as np

OUT = Path('/home/ubuntu/birds_exact_pixels')
W, H = 1672, 941
S = 2
RW, RH = W * S, H * S
FPS = 24
DURATION = 8.0
FRAMES = int(FPS * DURATION)
ENTRY = 0.45
EXIT = 7.25

# x, y, wingspan, flap Hz, phase, line weight multiplier
FLOCK = [
    (0.19, 0.37, 0.21, 2.80, 0.20, 0.75),
    (0.29, 0.68, 0.17, 3.20, 1.10, 0.68),
    (0.34, 0.22, 0.16, 3.35, 2.00, 0.65),
    (0.41, 0.48, 0.35, 2.55, 0.70, 1.15),
    (0.49, 0.70, 0.23, 2.95, 1.70, 0.82),
    (0.53, 0.29, 0.19, 3.15, 0.30, 0.72),
    (0.60, 0.15, 0.12, 3.50, 2.30, 0.55),
    (0.63, 0.52, 0.29, 2.65, 1.35, 0.98),
    (0.69, 0.36, 0.13, 3.40, 0.90, 0.58),
    (0.73, 0.66, 0.32, 2.60, 2.60, 1.05),
    (0.78, 0.19, 0.16, 3.25, 1.80, 0.70),
    (0.82, 0.47, 0.18, 3.05, 0.55, 0.74),
    (0.87, 0.72, 0.12, 3.65, 2.05, 0.53),
    (0.90, 0.32, 0.20, 2.90, 1.55, 0.80),
    (0.12, 0.53, 0.10, 3.60, 0.80, 0.50),
    (0.23, 0.15, 0.09, 3.75, 1.25, 0.46),
]

INK = (12, 72, 192, 255)
INK_LIGHT = (55, 118, 235, 245)


def cubic(p0, p1, p2, p3, count=22):
    points = []
    for i in range(count + 1):
        t = i / count
        u = 1 - t
        x = u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0]
        y = u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]
        points.append((int(x), int(y)))
    return points


def curve(draw, p0, p1, p2, p3, color, width):
    draw.line(cubic(p0, p1, p2, p3), fill=color, width=max(1, int(width)), joint='curve')


def draw_bird(draw, cx, cy, span, flap, weight, large):
    # The body stays centered. Wing tips and the elbow curvature change together, creating flex rather than a rigid pivot.
    up = -0.20 * span * flap
    down = 0.09 * span * flap
    shoulder_l = (cx - 0.035*span, cy + 0.010*span)
    shoulder_r = (cx + 0.035*span, cy + 0.010*span)

    # Left wing: shoulder -> curved elbow -> tip, then a light inner gesture line.
    left_tip = (cx - 0.56*span, cy - 0.18*span + up)
    curve(draw, shoulder_l,
          (cx - 0.15*span, cy - 0.13*span + 0.55*up),
          (cx - 0.38*span, cy - 0.26*span + up),
          left_tip, INK, weight)
    curve(draw, shoulder_l,
          (cx - 0.16*span, cy + 0.03*span + 0.28*down),
          (cx - 0.34*span, cy - 0.03*span + 0.60*up),
          (cx - 0.50*span, cy - 0.12*span + 0.86*up), INK_LIGHT, max(1, weight*0.58))

    # Right wing: an independent mirrored arc with the same shoulder; no entire-bird rotation.
    right_tip = (cx + 0.57*span, cy - 0.16*span + up)
    curve(draw, shoulder_r,
          (cx + 0.15*span, cy - 0.14*span + 0.52*up),
          (cx + 0.38*span, cy - 0.27*span + up),
          right_tip, INK, weight)
    curve(draw, shoulder_r,
          (cx + 0.16*span, cy + 0.03*span + 0.28*down),
          (cx + 0.35*span, cy - 0.02*span + 0.60*up),
          (cx + 0.51*span, cy - 0.10*span + 0.86*up), INK_LIGHT, max(1, weight*0.58))

    # Minimal body/head gesture, intentionally open and sparse.
    curve(draw, (cx - 0.08*span, cy + 0.018*span),
          (cx - 0.02*span, cy + 0.045*span),
          (cx + 0.08*span, cy + 0.035*span),
          (cx + 0.13*span, cy), INK, weight)
    if large:
        curve(draw, (cx + 0.08*span, cy + 0.012*span),
              (cx + 0.13*span, cy + 0.026*span),
              (cx + 0.17*span, cy + 0.016*span),
              (cx + 0.19*span, cy - 0.004*span), INK_LIGHT, max(1, weight*0.55))


def ease(u):
    return u*u*(3-2*u)

manifest = [
    'method=procedural 2D sparse line-art flock',
    'bird_forms=open blue Bezier gesture curves; no fills, feather details, white outlines, feet, or realistic anatomy',
    'motion=stationary body center with continuously redrawn wing arcs, elbows, and tips',
    'flap_rate=2.55_to_3.75_cycles_per_second',
    'timeline=empty_to_flock_crossing_to_empty',
]
(OUT / 'sparse_flock_manifest.txt').write_text('\n'.join(manifest)+'\n')

cmd = ['ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS),
       '-i', '-', '-an', '-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le',
       '-movflags', '+faststart', str(OUT / 'birds-sparse-natural-flight-prores4444.mov')]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for index in range(FRAMES):
    t = index / FPS
    image = Image.new('RGBA', (RW, RH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if ENTRY <= t <= EXIT:
        u = (t - ENTRY) / (EXIT - ENTRY)
        dx = (-1.30 + 2.60 * ease(u)) * W
        for n, (nx, ny, ns, hz, phase, wm) in enumerate(FLOCK):
            span = ns * W * S
            cx = (nx * W + dx) * S
            cy = (ny * H + math.sin(2*math.pi*(0.30*t) + phase) * (5 + 8*ns)) * S
            flap = math.sin(2*math.pi*hz*t + phase)
            draw_bird(draw, cx, cy, span, flap, max(2, 2.10*S*wm), ns >= 0.25)
    image = image.resize((W, H), Image.Resampling.LANCZOS)
    proc.stdin.write(np.asarray(image).tobytes())

proc.stdin.close()
if proc.wait() != 0:
    raise SystemExit('render failed')
print('Wrote birds-sparse-natural-flight-prores4444.mov')
