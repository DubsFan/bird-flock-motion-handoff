"""Murmuration engine.

Implements the mechanics documented in MURMURATION_REFERENCE_RULES.md:
  * boid-style local flocking against the ~7 nearest neighbors
  * a shape-shifting group envelope (flash expansion, split, merge, dilution)
  * an orientation wave that sweeps wing phase across the flock by position
  * blank alpha at both loop edges via a presence ramp

Rendering still uses only the locked extracted contours C/A/B/D with
center-notch wing rotation, so the art style is unchanged.
"""
import math
import numpy as np
from PIL import Image

from flock_rig import W, H, FPS, wing, place, open_encoder

RNG = np.random.default_rng(20260813)

KEYS = ('C', 'A', 'B', 'D')


class Murmuration:
    def __init__(self, count, envelope, path, seed=0,
                 cohesion=0.020, separation=0.085, alignment=0.055,
                 neighbors=7, sep_radius=46.0, wave_hz=0.26, size_range=(64, 300)):
        self.n = count
        self.envelope = envelope          # envelope(u) -> (rx, ry, shear, hollow)
        self.path = path                  # path(u) -> (cx, cy)
        self.cohesion = cohesion
        self.separation = separation
        self.alignment = alignment
        self.target_weight = 0.16
        self.neighbors = neighbors
        self.sep_radius = sep_radius
        self.wave_hz = wave_hz
        rng = np.random.default_rng(20260813 + seed)
        self.rng = rng
        # home slot inside the unit disc, kept for envelope mapping
        ang = rng.uniform(0, 2 * math.pi, count)
        # Slight core bias: murmuration cores are visually denser than edges.
        rad = rng.uniform(0.0, 1.0, count) ** 1.45
        self.hx = np.cos(ang) * rad
        self.hy = np.sin(ang) * rad
        self.rad0 = rad
        # Stable lobe membership is used only for reference-like split/merge events.
        self.lobe = rng.choice(np.array([-1.0, 1.0]), size=count)
        # per-bird identity
        big = max(3, count // 9)
        idx = rng.permutation(count)
        self.kind = np.array([KEYS[i % 4] for i in range(count)], dtype=object)
        self.kind[idx[:big]] = 'C'
        lo, hi = size_range
        # depth: a few large foreground birds, many small distant ones
        depth = rng.beta(2.4, 1.5, count)
        self.width = lo + (hi - lo) * (depth ** 2.2)
        self.width[idx[:big]] = np.maximum(self.width[idx[:big]], hi * 0.72)
        self.wing_hz = rng.uniform(0.19, 0.36, count)
        self.wing_phase = rng.uniform(0, 2 * math.pi, count)
        self.wing_strength = 0.42 + 0.58 * (self.width - lo) / max(1.0, hi - lo)
        self.bob_phase = rng.uniform(0, 2 * math.pi, count)
        self.jitter = rng.uniform(0.55, 1.45, count)
        # live state
        self.x = np.zeros(count)
        self.y = np.zeros(count)
        self.vx = np.zeros(count)
        self.vy = np.zeros(count)
        self.started = False
        # Quantized pose cache preserves the same notch-rig motion while avoiding
        # thousands of identical PIL rotations across dense flock frames.
        self._wing_cache = {}

    def target(self, u):
        """Envelope-mapped target slot for every member."""
        cx, cy = self.path(u)
        spec = self.envelope(u)
        # Backward-compatible base tuple plus optional split/ribbon deformation.
        rx, ry, shear, hollow = spec[:4]
        split = spec[4] if len(spec) > 4 else 0.0
        ribbon = spec[5] if len(spec) > 5 else 0.0
        # hollow is available for a brief shockwave only; ordinary murmuration
        # formations remain filled clouds.
        r = self.rad0 * (1.0 - hollow) + hollow
        hx = self.hx / np.maximum(self.rad0, 1e-6) * r
        hy = self.hy / np.maximum(self.rad0, 1e-6) * r
        tx = cx + hx * rx + hy * shear * rx * 0.35
        ty = cy + hy * ry
        # Real split / merge: two coherent lobes pull apart, not a circular void.
        ty += self.lobe * split
        # Real ribbon: the whole mass follows a continuous sinuous spine.
        ty += ribbon * np.sin(1.30 * math.pi * hx)
        return tx, ty

    def step(self, u, dt):
        tx, ty = self.target(u)
        if not self.started:
            self.x, self.y = tx.copy(), ty.copy()
            self.vx = np.full(self.n, -90.0)
            self.vy = np.zeros(self.n)
            self.started = True
            return
        pts = np.stack([self.x, self.y], axis=1)
        d2 = ((pts[:, None, :] - pts[None, :, :]) ** 2).sum(axis=2)
        np.fill_diagonal(d2, np.inf)
        k = min(self.neighbors, self.n - 1)
        nb = np.argpartition(d2, k - 1, axis=1)[:, :k]
        rows = np.arange(self.n)[:, None]
        # cohesion toward local neighbor centroid
        cx_local = self.x[nb].mean(axis=1)
        cy_local = self.y[nb].mean(axis=1)
        ax = (cx_local - self.x) * self.cohesion
        ay = (cy_local - self.y) * self.cohesion
        # alignment with local neighbor heading
        ax += (self.vx[nb].mean(axis=1) - self.vx) * self.alignment
        ay += (self.vy[nb].mean(axis=1) - self.vy) * self.alignment
        # separation from crowded neighbors
        dx = self.x[rows] - self.x[nb]
        dy = self.y[rows] - self.y[nb]
        dist = np.sqrt(dx * dx + dy * dy) + 1e-6
        push = np.clip(self.sep_radius - dist, 0, None) / self.sep_radius
        # Separation is deliberately modest: the reference is a cohesive mass,
        # not an evenly-spaced ring of isolated birds.
        ax += (dx / dist * push).sum(axis=1) * self.separation * 10.0
        ay += (dy / dist * push).sum(axis=1) * self.separation * 10.0
        # A stronger envelope pull preserves a filled, shape-shifting mass.
        ax += (tx - self.x) * self.target_weight
        ay += (ty - self.y) * self.target_weight
        self.vx = (self.vx + ax) * 0.90
        self.vy = (self.vy + ay) * 0.90
        speed = np.sqrt(self.vx ** 2 + self.vy ** 2) + 1e-6
        cap = 420.0
        over = speed > cap
        self.vx[over] *= cap / speed[over]
        self.vy[over] *= cap / speed[over]
        self.x += self.vx * dt
        self.y += self.vy * dt
        # Soft positional relaxation prevents local separation from turning a
        # constrained cloud into an artificial hollow ring. The boid forces
        # still perturb the members, but the mass retains its reference shape.
        self.x = 0.62 * self.x + 0.38 * tx
        self.y = 0.62 * self.y + 0.38 * ty

    def draw(self, canvas, u, t, presence):
        # orientation wave: a phase pulse sweeping across the flock by x position
        xs = self.x
        span = max(1.0, xs.max() - xs.min())
        wave = (xs - xs.min()) / span
        order = np.argsort(self.width)  # small/distant first, large in front
        for i in order:
            ph = 2 * math.pi * self.wing_hz[i] * t + self.wing_phase[i] + 2.2 * math.pi * wave[i] - 2 * math.pi * self.wave_hz * t
            hdg = math.degrees(math.atan2(self.vy[i], -self.vx[i]))
            angle = max(-16.0, min(16.0, hdg)) + 3.0 * math.sin(ph) * 0.35
            y = self.y[i] + 6.0 * self.jitter[i] * math.sin(2 * math.pi * 0.13 * t + self.bob_phase[i])
            w = self.width[i] * (0.55 + 0.45 * presence)
            if w < 8:
                continue
            sin_q = int(round(math.sin(ph) * 24))
            strength_q = round(float(self.wing_strength[i]) * 8) / 8
            pose_key = (self.kind[i], sin_q, strength_q)
            im = self._wing_cache.get(pose_key)
            if im is None:
                # asin restores a phase with the exact desired sine value.
                pose_phase = math.asin(sin_q / 24.0)
                im = wing(self.kind[i], pose_phase, strength_q)
                self._wing_cache[pose_key] = im
            place(canvas, im, self.x[i], y, w, angle)


def render_murmuration(out_path, duration, flock, active, warmup=36):
    frames = int(FPS * duration)
    start, end = active
    dt = 1.0 / FPS
    # settle the boid state before the flock becomes visible
    for j in range(warmup):
        flock.step(0.0, dt)
    proc = open_encoder(out_path)
    for f in range(frames):
        t = f / FPS
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        if start <= t <= end:
            v = (t - start) / (end - start)
            u = v * v * (3 - 2 * v)
            flock.step(u, dt)
            presence = math.sin(math.pi * min(1.0, max(0.0, v))) ** 0.45
            flock.draw(canvas, u, t, presence)
        proc.stdin.write(np.asarray(canvas).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit(f'render failed: {out_path}')
    print(f'Wrote {out_path}')
