from pathlib import Path
import math
import subprocess
import cv2
import numpy as np
from PIL import Image

SRC = Path('/home/ubuntu/birds_exact_pixels/birds_only_original_pixels_v2.png')
OUT = Path('/home/ubuntu/birds_exact_pixels')
FPS = 24
DURATION = 8.0
FRAME_COUNT = int(FPS * DURATION)
W, H = 1672, 941
ENTRY_START = 0.75
EXIT_END = 6.50

src = np.asarray(Image.open(SRC).convert('RGBA'))
alpha = src[:, :, 3]
num, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
components = []
for label in range(1, num):
    x, y, bw, bh, area = stats[label]
    if area < 18:
        continue
    ys, xs = np.where(labels == label)
    pad = 8
    x0, x1 = max(0, xs.min()-pad), min(W, xs.max()+pad+1)
    y0, y1 = max(0, ys.min()-pad), min(H, ys.max()+pad+1)
    layer = np.zeros((H, W, 4), dtype=np.uint8)
    layer[ys, xs] = src[ys, xs]
    # Wing joint is near the low central point of the original V. Scaling about this joint flexes both wings,
    # rather than rocking the full bird around an outside-edge hinge.
    low_y = int(ys.max())
    joint_x = float(np.median(xs[ys >= low_y - 2]))
    joint_y = float(low_y)
    components.append({
        'layer': layer,
        'joint': (joint_x, joint_y),
        'area': int(area),
        'cadence': 3.00 + (len(components) % 3) * 0.24, # fast: 3.00–3.48 flap cycles/sec
        'phase': (len(components) % 5) * 0.38,
    })

# All birds start fully off-frame left and exit fully off-frame right.
source_min_x = min(np.where(alpha > 0)[1])
source_max_x = max(np.where(alpha > 0)[1])
start_dx = -float(source_max_x + 80)
end_dx = float(W - source_min_x + 80)

manifest = [
    'source=birds_only_original_pixels_v2.png',
    f'components_animated={len(components)}',
    f'fps={FPS}', f'duration_seconds={DURATION}', f'frames={FRAME_COUNT}',
    f'entry_blank_seconds={ENTRY_START}', f'exit_blank_seconds={DURATION-EXIT_END}',
    'flight_path=left_offscreen_to_right_offscreen',
    'wing_motion=fast symmetric joint-centered flex; no outside-edge hinge rotation',
    'style=original blue line-art pixels only; no generative redraw or realistic rendering',
]
(OUT / 'fast_flight_render_manifest.txt').write_text('\n'.join(manifest) + '\n')

cmd = [
    'ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS),
    '-i', '-', '-an', '-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le',
    '-movflags', '+faststart', str(OUT / 'birds-fast-flight-transparent-prores4444.mov')
]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for frame_index in range(FRAME_COUNT):
    t = frame_index / FPS
    canvas = np.zeros((H, W, 4), dtype=np.uint8)
    if ENTRY_START <= t <= EXIT_END:
        u = (t - ENTRY_START) / (EXIT_END - ENTRY_START)
        # Ease across frame without velocity popping at entry/exit.
        ease = u * u * (3.0 - 2.0 * u)
        dx = start_dx + (end_dx - start_dx) * ease
        travel_bob = 3.0 * math.sin(math.pi * u)
        for component in components:
            # Symmetric flex compresses/extends the wing span around the true lower-wing joint.
            flap = math.sin(2.0 * math.pi * component['cadence'] * t + component['phase'])
            sx = 1.0 + 0.17 * flap
            sy = 1.0 - 0.11 * flap
            # A small in-style pitch gives forward flight without a hinge-like pivot.
            pitch = 1.1 * flap
            jx, jy = component['joint']
            c = math.cos(math.radians(pitch))
            s = math.sin(math.radians(pitch))
            transform = np.array([
                [c * sx, -s * sy, jx + dx - c * sx * jx + s * sy * jy],
                [s * sx,  c * sy, jy + travel_bob - s * sx * jx - c * sy * jy],
            ], dtype=np.float32)
            moved = cv2.warpAffine(
                component['layer'], transform, (W, H), flags=cv2.INTER_NEAREST,
                borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0)
            )
            active = moved[:, :, 3] > 0
            canvas[active] = moved[active]
    proc.stdin.write(canvas.tobytes())

proc.stdin.close()
if proc.wait() != 0:
    raise SystemExit('FFmpeg master render failed')
print('Wrote birds-fast-flight-transparent-prores4444.mov')
