from pathlib import Path
import math
import subprocess
import cv2
import numpy as np
from PIL import Image

SRC = Path('/home/ubuntu/birds_exact_pixels/birds_only_original_pixels_v2.png')
OUT = Path('/home/ubuntu/birds_exact_pixels')
FPS = 24
DURATION = 8
FRAME_COUNT = FPS * DURATION
W, H = 1672, 941

src = np.asarray(Image.open(SRC).convert('RGBA'))
alpha = src[:, :, 3]
num, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
components = []
for label in range(1, num):
    x, y, bw, bh, area = stats[label]
    if area < 18:
        continue
    ys, xs = np.where(labels == label)
    # The lower central point of each V-shaped original line drawing is its wing joint.
    max_y = int(ys.max())
    at_lowest = xs[ys >= max_y - 2]
    anchor_x = float(np.median(at_lowest))
    anchor_y = float(max_y)
    left = (xs <= anchor_x)
    right = (xs >= anchor_x)
    components.append({
        'xs': xs, 'ys': ys, 'left': left, 'right': right,
        'anchor': (anchor_x, anchor_y), 'area': int(area),
        'phase': (label * 0.77) % (2 * math.pi),
    })

render_log = [
    f'source={SRC.name}',
    f'components={len(components)}',
    f'fps={FPS}',
    f'duration_seconds={DURATION}',
    f'frames={FRAME_COUNT}',
    'method=original-pixel left/right wing rotation around existing lower wing joint',
    'interpolation=nearest-neighbor',
]
(OUT / 'wing_flap_render_log.txt').write_text('\n'.join(render_log) + '\n')

# ProRes 4444 retains the alpha channel and the native source dimensions.
cmd = [
    'ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}',
    '-r', str(FPS), '-i', '-', '-an', '-c:v', 'prores_ks', '-profile:v', '4',
    '-pix_fmt', 'yuva444p10le', '-movflags', '+faststart',
    str(OUT / 'birds-only-wing-flap-transparent-prores4444.mov')
]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for i in range(FRAME_COUNT):
    t = (i / (FRAME_COUNT - 1)) * DURATION
    canvas = np.zeros((H, W, 4), dtype=np.uint8)
    for n, comp in enumerate(components):
        # A varied, cyclic flap. First and last frames share the original pose exactly.
        # Integer harmonics vary cadence without changing the original pose at the loop boundary.
        harmonic = 1 + (n % 3)
        flap = math.sin(2 * math.pi * harmonic * t / DURATION)
        amplitude = 12.0 if comp['area'] >= 140 else 7.0
        theta = amplitude * flap
        ax, ay = comp['anchor']
        for selector, sign in ((comp['left'], 1.0), (comp['right'], -1.0)):
            layer = np.zeros((H, W, 4), dtype=np.uint8)
            xs = comp['xs'][selector]
            ys = comp['ys'][selector]
            layer[ys, xs] = src[ys, xs]
            matrix = cv2.getRotationMatrix2D((ax, ay), sign * theta, 1.0)
            moved = cv2.warpAffine(
                layer, matrix, (W, H), flags=cv2.INTER_NEAREST,
                borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0)
            )
            active = moved[:, :, 3] > 0
            canvas[active] = moved[active]
    proc.stdin.write(canvas.tobytes())

proc.stdin.close()
return_code = proc.wait()
if return_code:
    raise SystemExit(return_code)
print(f'Wrote {OUT / "birds-only-wing-flap-transparent-prores4444.mov"}')
