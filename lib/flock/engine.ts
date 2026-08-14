import { drawBird } from "./bird"
import { makeRng, type Rng } from "./rng"
import { headingAt, pointAt, samplePath, type SampledPath } from "./spline"
import { DENSITY_COUNT, WING_RATE, type Point, type Sequence, type Style } from "./types"

// ---------------------------------------------------------------------------
// The keystone: everything (live preview, PNG export, video capture) calls the
// SAME pure renderFrame(t). Given the same sequence + t it always produces the
// identical frame. All randomness comes from a seeded PRNG.
// ---------------------------------------------------------------------------

type Dims = { w: number; h: number }

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

// Offscreen lead/tail points so the flock enters and leaves cleanly.
function entryPoint(first: Point, entry: Sequence["entry"], d: Dims): Point {
  const off = 0.35
  switch (entry) {
    case "Enter from right":
      return { x: d.w * (1 + off), y: first.y - d.h * 0.08 }
    case "Enter from left":
      return { x: -d.w * off, y: first.y - d.h * 0.08 }
    case "Enter from top":
      return { x: first.x, y: -d.h * off }
    case "Enter from bottom":
      return { x: first.x, y: d.h * (1 + off) }
  }
}
function exitPoint(last: Point, exit: Sequence["exit"], d: Dims): Point {
  const off = 0.4
  switch (exit) {
    case "Pull upward":
      return { x: last.x + d.w * 0.05, y: -d.h * off }
    case "Exit right":
      return { x: d.w * (1 + off), y: last.y - d.h * 0.1 }
    case "Exit left":
      return { x: -d.w * off, y: last.y - d.h * 0.1 }
    case "Drift down":
      return { x: last.x, y: d.h * (1 + off) }
    case "Scatter":
      return { x: last.x + d.w * 0.05, y: -d.h * off * 0.6 }
  }
}

type BirdSeed = {
  depth: number // trailing offset along convoy (formation depth)
  lat: number // lateral offset -1..1
  vert: number // vertical offset -1..1
  sizeJ: number // 0.7..1.3
  phase: number // wing phase offset
  speedJ: number // wing speed jitter
  orbit: number // orbit angle base
  sub: number // subgroup 0/1
  bob: number // bob phase
}

function buildBirdSeeds(seq: Sequence): BirdSeed[] {
  const rng: Rng = makeRng(seq.seed)
  const n = DENSITY_COUNT[seq.density]
  const seeds: BirdSeed[] = []
  for (let i = 0; i < n; i++) {
    seeds.push({
      depth: 0.02 + rng() * 0.16,
      lat: rng() * 2 - 1,
      vert: rng() * 2 - 1,
      sizeJ: 0.72 + rng() * 0.6,
      phase: rng(),
      speedJ: 0.85 + rng() * 0.35,
      orbit: rng() * Math.PI * 2,
      sub: i % 2,
      bob: rng() * Math.PI * 2,
    })
  }
  return seeds
}

// Cache sampled path + seeds keyed by a cheap signature so scrubbing is fast.
const cache = new Map<string, { path: SampledPath; landU: number; seeds: BirdSeed[]; sig: string }>()

function sigFor(seq: Sequence, d: Dims): string {
  return [
    seq.id,
    seq.seed,
    seq.density,
    seq.points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join("|"),
    seq.landing ? `${seq.landing.x},${seq.landing.y},${seq.landing.w},${seq.landing.h}` : "none",
    seq.entry,
    seq.exit,
    Math.round(d.w),
    Math.round(d.h),
  ].join(";")
}

function prepare(seq: Sequence, d: Dims) {
  const sig = sigFor(seq, d)
  const hit = cache.get(seq.id)
  if (hit && hit.sig === sig) return hit

  const px: Point[] = seq.points.map((p) => ({ x: p.x * d.w, y: p.y * d.h }))
  const first = px[0] ?? { x: d.w * 0.5, y: d.h * 0.5 }
  const last = px[px.length - 1] ?? first
  const control = [entryPoint(first, seq.entry, d), ...px, exitPoint(last, seq.exit, d)]
  const path = samplePath(control, 40)

  // Landing param = nearest sampled point to landing-zone center.
  let landU = 0.55
  if (seq.landing) {
    const cx = (seq.landing.x + seq.landing.w / 2) * d.w
    const cy = (seq.landing.y + seq.landing.h / 2) * d.h
    let best = Infinity
    for (let i = 0; i < path.points.length; i++) {
      const p = path.points[i]
      const dist = (p.x - cx) ** 2 + (p.y - cy) ** 2
      if (dist < best) {
        best = dist
        landU = path.cumulative[i] / (path.length || 1)
      }
    }
  }
  const entry = { path, landU, seeds: buildBirdSeeds(seq), sig }
  cache.set(seq.id, entry)
  return entry
}

// Treatment-specific offset (in px) of a bird from the convoy head while travelling.
function travelOffset(
  seq: Sequence,
  s: BirdSeed,
  u: number,
  absTime: number,
  scale: number,
): { dx: number; dy: number } {
  const spread = scale * 0.9
  switch (seq.treatment) {
    case "Calm Glide": {
      // Loose, gentle cluster with a soft V bias.
      const v = -Math.abs(s.lat) * spread * 0.4
      return { dx: s.lat * spread * 0.5 + v * 0.2, dy: s.vert * spread * 0.35 + v }
    }
    case "Symmetric Murmuration": {
      // Mirrored breathing blob.
      const breathe = 0.6 + 0.4 * Math.sin(absTime * 1.4 + u * 6)
      const side = s.sub === 0 ? 1 : -1
      return {
        dx: side * Math.abs(s.lat) * spread * breathe,
        dy: s.vert * spread * 0.9 * breathe,
      }
    }
    case "Dive and Pullout": {
      // Compress vertically through the dive, expand on pull-out.
      const dive = Math.sin(u * Math.PI) // 0..1..0
      const compress = lerp(1, 0.35, dive)
      return { dx: s.lat * spread * (0.6 + dive * 0.6), dy: s.vert * spread * compress }
    }
    case "Curl and Release": {
      // Spiral around the head, radius releases toward the end.
      const ang = s.orbit + absTime * 1.8 + u * 3
      const radius = spread * (0.4 + u * 0.9) * (0.5 + Math.abs(s.lat))
      return { dx: Math.cos(ang) * radius, dy: Math.sin(ang) * radius * 0.7 }
    }
    case "Ribbon Wave": {
      // A line carrying a travelling sine wave.
      const along = s.lat // -1..1 position along the ribbon
      const wave = Math.sin(along * 3 + absTime * 3.2) * spread * 0.8
      return { dx: along * spread * 1.4, dy: wave + s.vert * spread * 0.1 }
    }
    case "Split and Rejoin": {
      // Two streams part in the middle, rejoin at both ends.
      const part = Math.sin(u * Math.PI) // max split mid-path
      const side = s.sub === 0 ? 1 : -1
      return {
        dx: s.lat * spread * 0.3,
        dy: side * part * spread * 1.3 + s.vert * spread * 0.25,
      }
    }
  }
}

// Gather offset while dwelling over the landing zone.
function dwellOffset(seq: Sequence, s: BirdSeed, absTime: number, lz: { w: number; h: number }) {
  const rx = lz.w * 0.5
  const ry = lz.h * 0.5
  const ang = s.orbit + absTime * (0.5 + s.speedJ * 0.4)
  const r = 0.35 + 0.6 * Math.abs(s.lat)
  const bob = Math.sin(absTime * 2 + s.bob) * ry * 0.15
  return { dx: Math.cos(ang) * rx * r, dy: Math.sin(ang) * ry * r * 0.8 + bob }
}

// Render one sequence at normalized time t in [0,1].
export function renderSequence(
  ctx: CanvasRenderingContext2D,
  seq: Sequence,
  t: number,
  style: Style,
  d: Dims,
) {
  const { path, landU, seeds } = prepare(seq, d)
  if (path.points.length < 2) return

  const dwellFrac = clamp01(seq.dwellSeconds / Math.max(0.001, seq.durationSeconds))
  const hasLanding = !!seq.landing
  const effDwell = hasLanding ? dwellFrac : 0
  const travelFrac = 1 - effDwell
  const ta = travelFrac * landU // reach landing
  const tb = ta + effDwell // leave landing
  const absTime = t * seq.durationSeconds
  const scale = Math.min(d.w, d.h)

  // Convoy head param over an extended range so trailing birds clear frame.
  const maxDepth = 0.18
  let cHead: number
  let dwellK = 0 // 0 travelling, 1 fully dwelling
  if (t <= ta) {
    cHead = ta <= 0 ? landU : (t / ta) * landU
  } else if (t <= tb) {
    cHead = landU
    const w = tb - ta
    dwellK = w > 0 ? smoothstep(0, 0.18, (t - ta) / w) * smoothstep(0, 0.18, (tb - t) / w) : 1
  } else {
    const f = (t - tb) / (1 - tb || 1)
    cHead = lerp(landU, 1 + maxDepth, f)
  }

  const lz = seq.landing
    ? { cx: (seq.landing.x + seq.landing.w / 2) * d.w, cy: (seq.landing.y + seq.landing.h / 2) * d.h, w: seq.landing.w * d.w, h: seq.landing.h * d.h }
    : null

  // Global seam envelope: blank alpha at loop start/end.
  const seam = smoothstep(0, 0.05, t) * smoothstep(0, 0.05, 1 - t)

  const baseSize = scale * 0.055 * (seq.density === "Murmuration" ? 0.7 : seq.density === "Dense" ? 0.82 : 1)
  const wingRate = WING_RATE[seq.wingIntensity]
  const ink = style.inkColor || seq.color

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i]
    const u = clamp01(cHead - s.depth)
    const head = pointAt(path, u)
    const heading = headingAt(path, u)

    const off = travelOffset(seq, s, u, absTime, baseSize * 2.2)
    let x = head.x + off.dx
    let y = head.y + off.dy

    // Blend toward landing-zone gather during dwell.
    if (lz && dwellK > 0) {
      const g = dwellOffset(seq, s, absTime, lz)
      const gx = lz.cx + g.dx
      const gy = lz.cy + g.dy
      x = lerp(x, gx, dwellK)
      y = lerp(y, gy, dwellK)
    }

    // Fade individual birds that are still parked at the offscreen ends.
    const edgeFade = smoothstep(0, 0.02, u) * smoothstep(0, 0.03, 1 - u)
    const alpha = seam * edgeFade * 0.92
    if (alpha <= 0.01) continue

    const size = baseSize * s.sizeJ
    const phase = absTime * wingRate * s.speedJ * 0.16 + s.phase

    ctx.save()
    ctx.translate(x, y)
    // Bank into turns a touch; wings flap around travel heading.
    ctx.rotate(heading)
    drawBird(ctx, {
      phase,
      size,
      color: ink,
      alpha,
      weight: seq.wingIntensity === "Strong" ? 1.15 : seq.wingIntensity === "Soft" ? 0.85 : 1,
      asym: 0.4 + s.phase * 0.5,
    })
    ctx.restore()
  }
}

// Render every sequence for a frame. Canvas is cleared to full transparency
// (never an opaque fill) so the source render is genuinely alpha.
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  sequences: Sequence[],
  style: Style,
  d: Dims,
) {
  ctx.clearRect(0, 0, d.w, d.h)
  for (const seq of sequences) {
    if (seq.points.length >= 2) renderSequence(ctx, seq, t, style, d)
  }
}

// Total project timeline length = longest sequence.
export function projectDuration(sequences: Sequence[]): number {
  return sequences.reduce((m, s) => Math.max(m, s.durationSeconds), 0.001)
}

// Render the whole project at a shared global time in [0,1]. Each sequence maps
// the global clock onto its own duration (shorter flocks finish and go blank).
export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  globalT: number,
  sequences: Sequence[],
  style: Style,
  d: Dims,
  total?: number,
) {
  ctx.clearRect(0, 0, d.w, d.h)
  const dur = total ?? projectDuration(sequences)
  const seconds = clamp01(globalT) * dur
  for (const seq of sequences) {
    if (seq.points.length < 2) continue
    const tSeq = clamp01(seconds / Math.max(0.001, seq.durationSeconds))
    renderSequence(ctx, seq, tSeq, style, d)
  }
}

export function invalidateCache(id?: string) {
  if (id) cache.delete(id)
  else cache.clear()
}
