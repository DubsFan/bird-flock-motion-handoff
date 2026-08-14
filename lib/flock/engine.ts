import { drawBird } from "./bird"
import { makeRng, type Rng } from "./rng"
import { drawBirdTemplate } from "./template-renderer"
import { headingAt, pointAt, samplePath, type SampledPath } from "./spline"
import {
  BUILTIN_BIRD_TEMPLATE,
  DENSITY_COUNT,
  WING_RATE,
  type BirdTemplate,
  type Point,
  type Sequence,
  type Style,
} from "./types"

type Dims = { w: number; h: number }

type BirdSeed = {
  depth: number
  lat: number
  vert: number
  sizeJ: number
  phase: number
  speedJ: number
  orbit: number
  sub: number
  bob: number
}

type Prepared = {
  path: SampledPath
  landU: number
  landDistance: number
  seeds: BirdSeed[]
  sig: string
}

const cache = new Map<string, Prepared>()

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function smoothstep(a: number, b: number, value: number) {
  const t = clamp01((value - a) / Math.max(0.00001, b - a))
  return t * t * (3 - 2 * t)
}
function shortestAngle(a: number, b: number) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a))
}

function unit(dx: number, dy: number): Point {
  const m = Math.hypot(dx, dy) || 1
  return { x: dx / m, y: dy / m }
}

// The flock must fly INTO the drawn path along its own opening direction and
// leave continuing its closing direction. Deriving the lead-in / lead-out from
// the path tangent (instead of a fixed compass edge) is what makes the flock
// actually follow the stroke the user drew, rather than swooping across the
// screen to reach a mismatched entry edge.
function entryPoint(px: Point[], entry: Sequence["entry"], d: Dims): Point {
  const off = 0.42 * Math.max(d.w, d.h)
  const first = px[0]
  if (px.length >= 2) {
    const dir = unit(px[1].x - first.x, px[1].y - first.y) // heading into the path
    return { x: first.x - dir.x * off, y: first.y - dir.y * off }
  }
  // Single-point fallback: honor the compass hint.
  switch (entry) {
    case "Enter from right": return { x: d.w + off, y: first.y }
    case "Enter from left": return { x: -off, y: first.y }
    case "Enter from top": return { x: first.x, y: -off }
    case "Enter from bottom": return { x: first.x, y: d.h + off }
  }
}

function exitPoint(px: Point[], exit: Sequence["exit"], d: Dims): Point {
  const off = 0.42 * Math.max(d.w, d.h)
  const last = px[px.length - 1]
  if (px.length >= 2) {
    const prev = px[px.length - 2]
    const dir = unit(last.x - prev.x, last.y - prev.y) // heading out of the path
    return { x: last.x + dir.x * off, y: last.y + dir.y * off }
  }
  switch (exit) {
    case "Pull upward": return { x: last.x, y: -off }
    case "Exit right": return { x: d.w + off, y: last.y }
    case "Exit left": return { x: -off, y: last.y }
    case "Drift down": return { x: last.x, y: d.h + off }
    case "Scatter": return { x: last.x, y: -off * 0.6 }
  }
}

function buildBirdSeeds(seq: Sequence): BirdSeed[] {
  const rng: Rng = makeRng(seq.seed)
  const n = DENSITY_COUNT[seq.density]
  return Array.from({ length: n }, (_, i) => ({
    // Delays are distance fractions, not time offsets. This preserves spacing
    // and prevents followers from compressing when the path curves.
    depth: 0.018 + rng() * 0.15,
    lat: rng() * 2 - 1,
    vert: rng() * 2 - 1,
    sizeJ: 0.72 + rng() * 0.6,
    phase: rng(),
    speedJ: 0.9 + rng() * 0.22,
    orbit: rng() * Math.PI * 2,
    sub: i % 2,
    bob: rng() * Math.PI * 2,
  }))
}

function sigFor(seq: Sequence, d: Dims): string {
  return [
    seq.id, seq.seed, seq.density, seq.entry, seq.exit,
    seq.points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join("|"),
    seq.landing ? `${seq.landing.x},${seq.landing.y},${seq.landing.w},${seq.landing.h}` : "none",
    Math.round(d.w), Math.round(d.h),
  ].join(";")
}

function prepare(seq: Sequence, d: Dims): Prepared {
  const sig = sigFor(seq, d)
  const hit = cache.get(seq.id)
  if (hit?.sig === sig) return hit
  const PER_SEGMENT = 64
  const px = seq.points.map((p) => ({ x: p.x * d.w, y: p.y * d.h }))
  const fallback = { x: d.w * 0.5, y: d.h * 0.5 }
  const safePx = px.length ? px : [fallback]
  const path = samplePath([entryPoint(safePx, seq.entry, d), ...safePx, exitPoint(safePx, seq.exit, d)], PER_SEGMENT)
  let landU = 0.55
  if (seq.landing) {
    const cx = (seq.landing.x + seq.landing.w / 2) * d.w
    const cy = (seq.landing.y + seq.landing.h / 2) * d.h
    // Only snap to the DRAWN portion of the path. Samples 0..PER_SEGMENT are
    // the off-screen lead-in and the tail is the lead-out; landing on those
    // would make the flock settle mid-swoop instead of on the visible stroke.
    const firstUserIdx = PER_SEGMENT
    const lastUserIdx = PER_SEGMENT * Math.max(1, safePx.length)
    let nearest = Infinity
    for (let index = firstUserIdx; index <= lastUserIdx && index < path.points.length; index++) {
      const point = path.points[index]
      const distance = (point.x - cx) ** 2 + (point.y - cy) ** 2
      if (distance < nearest) {
        nearest = distance
        landU = path.cumulative[index] / Math.max(1, path.length)
      }
    }
  }
  const prepared = { path, landU, landDistance: landU * path.length, seeds: buildBirdSeeds(seq), sig }
  cache.set(seq.id, prepared)
  return prepared
}

function travelOffset(seq: Sequence, s: BirdSeed, u: number, seconds: number, scale: number) {
  const spread = scale * 0.9
  switch (seq.treatment) {
    case "Calm Glide": {
      const v = -Math.abs(s.lat) * spread * 0.4
      return { dx: s.lat * spread * 0.5 + v * 0.2, dy: s.vert * spread * 0.35 + v }
    }
    case "Symmetric Murmuration": {
      const breathe = 0.72 + 0.18 * Math.sin(seconds * 0.9 + s.bob)
      const side = s.sub ? 1 : -1
      return { dx: side * Math.abs(s.lat) * spread * breathe, dy: s.vert * spread * 0.8 * breathe }
    }
    case "Dive and Pullout": {
      const dive = Math.sin(u * Math.PI)
      return { dx: s.lat * spread * (0.65 + dive * 0.35), dy: s.vert * spread * lerp(0.95, 0.48, dive) }
    }
    case "Curl and Release": {
      const angle = s.orbit + seconds * 0.95 + u * 2
      const radius = spread * (0.35 + u * 0.6) * (0.55 + Math.abs(s.lat))
      return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius * 0.68 }
    }
    case "Ribbon Wave": {
      const wave = Math.sin(s.lat * 3 + seconds * 2.2) * spread * 0.7
      return { dx: s.lat * spread * 1.35, dy: wave + s.vert * spread * 0.1 }
    }
    case "Split and Rejoin": {
      const part = Math.sin(u * Math.PI)
      return { dx: s.lat * spread * 0.3, dy: (s.sub ? 1 : -1) * part * spread + s.vert * spread * 0.2 }
    }
    case "Waterfall Bloom": {
      // The whole column descends; it blooms laterally without pinning birds.
      const bloom = smoothstep(0.38, 0.78, u)
      const stream = Math.sin(seconds * 1.45 + s.bob) * spread * 0.12
      return {
        dx: s.lat * spread * lerp(0.3, 1.6, bloom) + stream,
        dy: s.vert * spread * lerp(0.75, 1.08, bloom),
      }
    }
    case "Vortex Pull": {
      // A travelling swirl whose center advances with the convoy.
      const pull = smoothstep(0.18, 0.8, u)
      const angle = s.orbit + seconds * 1.25 + u * 2.4
      const radius = spread * (0.35 + Math.abs(s.lat)) * lerp(1, 0.42, pull)
      return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius * 0.78 }
    }
  }
}

function landingOffset(seq: Sequence, s: BirdSeed, seconds: number, lz: { w: number; h: number }) {
  if (seq.arrivalMode === "Perch") {
    // Stable individual perch slots with tiny breathing movement, not orbiting.
    return {
      dx: s.lat * lz.w * 0.43,
      dy: (0.26 + Math.abs(s.vert) * 0.16) * lz.h + Math.sin(seconds * 1.6 + s.bob) * lz.h * 0.012,
    }
  }
  const angle = s.orbit + seconds * 0.28 * s.speedJ
  const radius = 0.28 + 0.48 * Math.abs(s.lat)
  return {
    dx: Math.cos(angle) * lz.w * 0.5 * radius,
    dy: Math.sin(angle) * lz.h * 0.4 * radius + Math.sin(seconds + s.bob) * lz.h * 0.04,
  }
}

function motionClock(seq: Sequence, path: SampledPath, landDistance: number, t: number) {
  const dwell = seq.landing && seq.arrivalMode !== "Fly through" ? Math.min(seq.dwellSeconds, seq.durationSeconds * 0.65) : 0
  const movingTime = Math.max(0.1, seq.durationSeconds - dwell)
  const speed = path.length / movingTime
  if (!dwell) return { distance: Math.min(path.length, t * seq.durationSeconds * speed), landingBlend: 0, dwelling: false }
  const arriveAt = landDistance / speed
  const leaveAt = arriveAt + dwell
  const now = t * seq.durationSeconds
  if (now < arriveAt) {
    const blend = smoothstep(Math.max(0, arriveAt - 0.45), arriveAt, now)
    return { distance: now * speed, landingBlend: blend, dwelling: false }
  }
  if (now <= leaveAt) return { distance: landDistance, landingBlend: 1, dwelling: true }
  // Continue at the exact same pixels-per-second velocity after the dwell.
  const release = smoothstep(leaveAt, leaveAt + 0.45, now)
  return { distance: Math.min(path.length, landDistance + (now - leaveAt) * speed), landingBlend: 1 - release, dwelling: false }
}

export function renderSequence(
  ctx: CanvasRenderingContext2D,
  seq: Sequence,
  t: number,
  style: Style,
  d: Dims,
  template: BirdTemplate = BUILTIN_BIRD_TEMPLATE,
) {
  const { path, landU, landDistance, seeds } = prepare(seq, d)
  if (path.points.length < 2 || path.length <= 0) return
  const clock = motionClock(seq, path, landDistance, clamp01(t))
  const seconds = clamp01(t) * seq.durationSeconds
  const scale = Math.min(d.w, d.h)
  const lz = seq.landing ? {
    cx: (seq.landing.x + seq.landing.w / 2) * d.w,
    cy: (seq.landing.y + seq.landing.h / 2) * d.h,
    w: seq.landing.w * d.w,
    h: seq.landing.h * d.h,
  } : null
  const seam = smoothstep(0, 0.035, t) * smoothstep(0, 0.035, 1 - t)
  const baseSize = scale * 0.055 * (seq.density === "Murmuration" ? 0.7 : seq.density === "Dense" ? 0.82 : 1)
  const wingRate = WING_RATE[seq.wingIntensity]
  const ink = seq.color || style.inkColor

  seeds.forEach((s) => {
    const followerDistance = clock.distance - s.depth * path.length
    const u = followerDistance / path.length
    // Do not clamp parked followers onto edge points. They remain offscreen
    // until their true distance enters the sampled path.
    if (u <= 0 || u >= 1) return
    const head = pointAt(path, u)
    const tangent = headingAt(path, u)
    const ahead = headingAt(path, clamp01(u + 0.018))
    const bank = tangent + shortestAngle(tangent, ahead) * 0.55
    const offset = travelOffset(seq, s, u, seconds, baseSize * 2.2)
    let x = head.x + offset.dx
    let y = head.y + offset.dy

    if (lz && clock.landingBlend > 0) {
      const target = landingOffset(seq, s, seconds, lz)
      x = lerp(x, lz.cx + target.dx, clock.landingBlend)
      y = lerp(y, lz.cy + target.dy, clock.landingBlend)
    }

    const edgeFade = smoothstep(0, 0.025, u) * smoothstep(0, 0.035, 1 - u)
    const alpha = seam * edgeFade * 0.94
    if (alpha <= 0.01) return
    const size = baseSize * s.sizeJ
    const phase = seconds * wingRate * s.speedJ * 0.16 + s.phase

    ctx.save()
    ctx.translate(x, y)
    // Perched birds settle upright; airborne birds smoothly bank with path curvature.
    ctx.rotate(clock.dwelling && seq.arrivalMode === "Perch" ? 0 : bank)
    const drawn = drawBirdTemplate(ctx, template, phase, size, alpha, ink)
    if (!drawn) {
      drawBird(ctx, {
        phase,
        size,
        color: ink,
        alpha,
        weight: seq.wingIntensity === "Strong" ? 1.15 : seq.wingIntensity === "Soft" ? 0.85 : 1,
        asym: 0.4 + s.phase * 0.5,
      })
    }
    ctx.restore()
  })
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  sequences: Sequence[],
  style: Style,
  d: Dims,
  template: BirdTemplate = BUILTIN_BIRD_TEMPLATE,
) {
  ctx.clearRect(0, 0, d.w, d.h)
  sequences.forEach((seq) => {
    if (seq.points.length >= 2) renderSequence(ctx, seq, t, style, d, template)
  })
}

export function projectDuration(sequences: Sequence[]) {
  return sequences.reduce((max, sequence) => Math.max(max, sequence.durationSeconds), 0.001)
}

export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  globalT: number,
  sequences: Sequence[],
  style: Style,
  d: Dims,
  total?: number,
  template: BirdTemplate = BUILTIN_BIRD_TEMPLATE,
) {
  ctx.clearRect(0, 0, d.w, d.h)
  const duration = total ?? projectDuration(sequences)
  const seconds = clamp01(globalT) * duration
  sequences.forEach((sequence) => {
    if (sequence.points.length < 2) return
    renderSequence(ctx, sequence, clamp01(seconds / Math.max(0.001, sequence.durationSeconds)), style, d, template)
  })
}

export function invalidateCache(id?: string) {
  if (id) cache.delete(id)
  else cache.clear()
}
