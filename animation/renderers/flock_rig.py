"""Shared rig for source-contour flock variations.

Locked rules preserved here:
  * only the normalized extracted contours C/A/B/D are used
  * wings rotate around the original center notch (no door hinge)
  * leftward flight orientation for every bird
"""
from pathlib import Path
from PIL import Image
import numpy as np
import math
import subprocess

ROOT = Path('/home/ubuntu/birds_exact_pixels')
ASSET = ROOT / 'orientation_locked_flock_assets'
W, H, FPS = 1672, 941, 24
PAD = 82

_raw = {
    'C': ASSET / 'C_leftward.png',
    'A': ASSET / 'A_leftward.png',
    'B': ASSET / 'B_leftward.png',
    'D': ASSET / 'D_leftward_mirrored.png',
}
_pivot = {'C': (0.53, 0.66), 'A': (0.49, 0.62), 'B': (0.42, 0.61), 'D': (0.50, 0.66)}


def _trim(im):
    box = im.getbbox()
    return im.crop(box) if box else im


def _prep(path, ratio):
    im = _trim(Image.open(path).convert('RGBA'))
    base = Image.new('RGBA', (im.width + 2 * PAD, im.height + 2 * PAD), (0, 0, 0, 0))
    base.alpha_composite(im, (PAD, PAD))
    px = PAD + im.width * ratio[0]
    py = PAD + im.height * ratio[1]
    arr = np.asarray(base)
    a = arr[:, :, 3]
    xx = np.arange(base.width)[None, :]
    yy = np.arange(base.height)[:, None]
    lm = (xx <= px + 8) & (a > 0)
    rm = (xx >= px - 8) & (a > 0)
    cm = (np.hypot(xx - px, yy - py) <= 22) & (a > 0)
    left = np.zeros_like(arr); left[lm] = arr[lm]
    right = np.zeros_like(arr); right[rm] = arr[rm]
    center = np.zeros_like(arr); center[cm] = arr[cm]
    return base, (px, py), Image.fromarray(left, 'RGBA'), Image.fromarray(right, 'RGBA'), Image.fromarray(center, 'RGBA')


SOURCES = {k: _prep(v, _pivot[k]) for k, v in _raw.items()}


def wing(key, phase, strength):
    """Center-notch wing rotation: independent left/right halves, center on top."""
    base, (px, py), left, right, center = SOURCES[key]
    s = math.sin(phase)
    up = max(s, 0.0)
    down = max(-s, 0.0)
    left = left.rotate((-34 * up + 30 * down) * strength, resample=Image.Resampling.BICUBIC, center=(px, py), expand=False)
    right = right.rotate((34 * up - 32 * down) * strength, resample=Image.Resampling.BICUBIC, center=(px, py), expand=False)
    out = Image.new('RGBA', base.size, (0, 0, 0, 0))
    out.alpha_composite(left)
    out.alpha_composite(right)
    out.alpha_composite(center)
    return out


def clamp(v):
    return max(0.0, min(1.0, v))


def smooth(v):
    v = clamp(v)
    return v * v * (3 - 2 * v)


def bank(route, u, limit=13.0):
    e = 0.001
    x0, y0 = route(clamp(u - e))
    x1, y1 = route(clamp(u + e))
    return max(-limit, min(limit, math.degrees(math.atan2(y1 - y0, -(x1 - x0)))))


def place(canvas, im, x, y, width, angle):
    s = width / im.width
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.Resampling.LANCZOS)
    im = im.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(im, (int(x - im.width / 2), int(y - im.height / 2)))


def open_encoder(out_path):
    cmd = ['ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS),
           '-i', '-', '-an', '-c:v', 'prores_ks', '-profile:v', '4', '-pix_fmt', 'yuva444p10le',
           '-movflags', '+faststart', str(out_path)]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


def render(out_path, duration, draw_frame, active=(0.9, None)):
    """draw_frame(canvas, u, t) is called only inside the active window."""
    frames = int(FPS * duration)
    start, end = active
    if end is None:
        end = duration - 0.9
    proc = open_encoder(out_path)
    for f in range(frames):
        t = f / FPS
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        if start <= t <= end:
            u = smooth((t - start) / (end - start))
            draw_frame(canvas, u, t)
        proc.stdin.write(np.asarray(canvas).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit(f'render failed: {out_path}')
    print(f'Wrote {out_path}')
