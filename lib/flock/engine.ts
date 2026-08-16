import { makeRng, type Rng } from "./rng"
import { drawBirdTemplate, type BirdAnimationTrack } from "./template-renderer"
import { headingAt, pointAt, sampleClosedPath, samplePath, type SampledPath } from "./spline"
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
  rank: number
  depth: number
  lat: number
  vert: number
  sizeJ: number
  phase: number
  speedJ: number
  orbit: number
  sub: number
  asset: number
  bob: number
}

type Prepared = {
  path: SampledPath
  landU: number
  landDistance: number
  landingDistances: number[]
  orderedLandings: Sequence["landings"]
  seeds: BirdSeed[]
  sig: string
}

const cache = new Map<string, Prepared>()
function followerDelayFraction(index: number) {
  if (index <= 0) return 0
  // Match the accepted Waterfall roster's readable leader staging: the large
  // birds enter one after another instead of sharing a zero-delay point. The
  // tail then uses a smaller regular interval so the flock remains cohesive.
  if (index < 12) return index * 0.0105
  return 0.1155 + (index - 11) * 0.00245
}

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function landingZones(seq: Pick<Sequence, "landings" | "landing">) {
  if (seq.landings?.length) return seq.landings
  return seq.landing ? [seq.landing] : []
}

export function sequenceBirdCount(seq: Pick<Sequence, "birdCount" | "density">) {
  return clamp(Math.round(seq.birdCount ?? DENSITY_COUNT[seq.density]), 1, 120)
}

export function orientationForMotion(
  seq: Pick<Sequence, "entry" | "exit" | "points">,
  heading: number,
  sourceDirection: "left" | "right" = "left",
) {
  const horizontal = Math.cos(heading)
  let movingRight: boolean
  if (Math.abs(horizontal) > 0.12) {
    movingRight = horizontal > 0
  } else if (seq.entry === "Enter from left") {
    movingRight = true
  } else if (seq.entry === "Enter from right") {
    movingRight = false
  } else if (seq.exit === "Exit right") {
    movingRight = true
  } else if (seq.exit === "Exit left") {
    movingRight = false
  } else {
    const first = seq.points[0]
    const last = seq.points.at(-1)
    movingRight = !!first && !!last ? last.x >= first.x : sourceDirection === "right"
  }

  const sourceFacesRight = sourceDirection === "right"
  const horizontalRotation = heading - (movingRight ? 0 : Math.PI)
  // Artwork is a top/three-quarter-view bird, not an aircraft icon. Mirror it
  // for direction, but limit banking so a steep spline never turns it sideways
  // or upside down.
  const uprightBank = clamp(Math.atan2(Math.sin(horizontalRotation), Math.cos(horizontalRotation)), -0.48, 0.48)
  return {
    mirrorX: movingRight !== sourceFacesRight,
    rotation: uprightBank,
    movingRight,
  }
}

export function resolveLandingPosition(
  head: Point,
  travelOffset: { dx: number; dy: number },
  landingOffset: { dx: number; dy: number },
  landingBlend: number,
) {
  // Preserve the arc-length path position exactly. Only the bird's local
  // formation offset settles toward its perch/gather slot; blending the whole
  // position toward the landing center creates an artificial forward pull.
  return {
    x: head.x + lerp(travelOffset.dx, landingOffset.dx, landingBlend),
    y: head.y + lerp(travelOffset.dy, landingOffset.dy, landingBlend),
  }
}

function entryPoint(first: Point, entry: Sequence["entry"], d: Dims): Point {
  // Begin just inside the canvas. The old 35% offscreen runway plus an alpha
  // fade created seconds of empty video before the first bird appeared.
  const edge = 0.14
  switch (entry) {
    case "Enter from right": return { x: d.w * (1 - edge), y: first.y }
    case "Enter from left": return { x: d.w * edge, y: first.y }
    case "Enter from top": return { x: first.x, y: d.h * edge }
    case "Enter from bottom": return { x: first.x, y: d.h * (1 - edge) }
  }
}

function exitPoint(last: Point, exit: Sequence["exit"], d: Dims, previous?: Point): Point {
  // End just beyond the composition edge. The former 40% offscreen runway
  // produced seconds of empty tail after the final visible bird had gone.
  const off = 0.06
  switch (exit) {
    case "Pull upward": {
      // Continue the route's horizontal travel during the climb. A fixed
      // rightward nudge made left-moving Vortex flocks collapse into a
      // mechanical vertical column at the end.
      const horizontal = previous ? last.x - previous.x : 0
      const direction = Math.abs(horizontal) > 1 ? Math.sign(horizontal) : 1
      return { x: last.x + direction * d.w * 0.38, y: -d.h * off }
    }
    case "Exit right": return { x: d.w * (1 + off), y: last.y - d.h * 0.1 }
    case "Exit left": return { x: -d.w * off, y: last.y - d.h * 0.1 }
    case "Drift down": return { x: last.x, y: d.h * (1 + off) }
    case "Scatter": return { x: last.x + d.w * 0.05, y: -d.h * off * 0.6 }
  }
}

function buildBirdSeeds(seq: Sequence): BirdSeed[] {
  const rng: Rng = makeRng(seq.seed)
  const n = sequenceBirdCount(seq)
  const turn = rng() * Math.PI * 2
  return Array.from({ length: n }, (_, i) => {
    // A low-discrepancy sunflower layout gives every bird a stable readable
    // slot. Seeded rotation keeps reseed useful without allowing random stacks.
    const radius = Math.sqrt((i + 0.65) / Math.max(1, n))
    const rank = n <= 1 ? 0 : i / (n - 1)
    const angle = turn + i * 2.399963229728653
    const heroSlots = n > 30 ? [
      { lat: 0, vert: 0 },
      { lat: -1.05, vert: -0.62 },
      { lat: 1.05, vert: 0.55 },
      { lat: -0.95, vert: 0.88 },
      { lat: 1.16, vert: -0.78 },
      { lat: -0.32, vert: 1.28 },
      { lat: 0.38, vert: -1.25 },
      { lat: -1.46, vert: 0.12 },
      { lat: 1.5, vert: 0.16 },
      { lat: -0.9, vert: -1.1 },
      { lat: 0.95, vert: 1.08 },
      { lat: -0.08, vert: -1.52 },
    ] : [
      { lat: 0, vert: 0 },
      { lat: -0.72, vert: -0.62 },
      { lat: 0.78, vert: 0.58 },
      { lat: -0.96, vert: 0.28 },
      { lat: 0.92, vert: -0.38 },
      { lat: -0.18, vert: 0.92 },
    ]
    const slot = heroSlots[i] ?? {
      lat: Math.cos(angle) * radius * 1.35,
      vert: Math.sin(angle) * radius * 0.9,
    }
    const largeHeroSizes = [15, 10.6, 8.9, 7.9, 7, 6.3, 5.8, 5.3, 4.9, 4.6, 4.3, 4]
    const mediumHeroSizes = [11, 7.4, 6.2, 5.3, 4.7, 4.2, 3.8, 3.5]
    const calmHeroSizes = [8.8, 5.6, 4.6, 3.9, 3.4, 3]
    const heroSizes = n > 60 ? largeHeroSizes : n > 30 ? mediumHeroSizes : calmHeroSizes
    const supportSize = n > 60
      ? 1.65 + (1 - rank) * 2 + rng() * 0.45
      : n > 30
        ? 1.45 + (1 - rank) * 1.55 + rng() * 0.4
        : 1.25 + (1 - rank) * 1.3 + rng() * 0.35
    return {
    rank,
    // Delays are distance fractions, not time offsets. This preserves spacing
    // and prevents followers from compressing when the path curves.
    // The lead bird is present on frame zero. Every follower occupies its own
    // delayed path sample, preventing the large leaders from stacking at entry.
    depth: followerDelayFraction(i),
    lat: slot.lat,
    vert: slot.vert,
    // Match the approved renderer's hero/support hierarchy instead of making
    // every source contour a uniformly tiny mark.
    sizeJ: heroSizes[i] ?? supportSize,
    phase: rng(),
    speedJ: 0.9 + rng() * 0.22,
    orbit: rng() * Math.PI * 2,
    sub: i % 2,
    asset: i === 0 || (i > 0 && i % 17 === 0) ? 0 : 1 + (i % 3),
    bob: rng() * Math.PI * 2,
    }
  })
}

function sigFor(seq: Sequence, d: Dims): string {
  return [
    seq.id, seq.seed, seq.density, sequenceBirdCount(seq), seq.entry, seq.exit, seq.loopPath,
    seq.points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join("|"),
    landingZones(seq).map((landing) => `${landing.x},${landing.y},${landing.w},${landing.h}`).join("|") || "none",
    Math.round(d.w), Math.round(d.h),
  ].join(";")
}

export function buildMotionPath(seq: Sequence, d: Dims) {
  const px = seq.points.map((p) => ({ x: p.x * d.w, y: p.y * d.h }))
  const first = px[0] ?? { x: d.w * 0.5, y: d.h * 0.5 }
  const last = px.at(-1) ?? first
  let controls = seq.loopPath
    ? [...px]
    : [entryPoint(first, seq.entry, d), ...px, exitPoint(last, seq.exit, d, px.at(-2))]
  let landU = 0.55
  const zones = seq.loopPath ? [] : landingZones(seq)
  if (zones.length && controls.length >= 2) {
    const roughPath = samplePath(controls, 64)
    const insertions = zones.map((zone) => {
      const center = {
        x: (zone.x + zone.w / 2) * d.w,
        y: (zone.y + zone.h / 2) * d.h,
      }
      let nearestRoughIndex = 0
      let nearest = Infinity
      roughPath.points.forEach((point, index) => {
        const distance = (point.x - center.x) ** 2 + (point.y - center.y) ** 2
        if (distance < nearest) {
          nearest = distance
          nearestRoughIndex = index
        }
      })
      return {
        center,
        routeOrder: nearestRoughIndex,
        segment: Math.min(controls.length - 2, Math.floor(nearestRoughIndex / 64)),
      }
    }).sort((a, b) => a.routeOrder - b.routeOrder)

    // Every landing is a real route waypoint. Grouping insertions by their
    // original spline segment preserves chronological path order even when a
    // user adds several landing boxes to one stretch of the route.
    const expanded: Point[] = [controls[0]]
    for (let segment = 0; segment < controls.length - 1; segment++) {
      insertions
        .filter((insertion) => insertion.segment === segment)
        .forEach((insertion) => expanded.push(insertion.center))
      expanded.push(controls[segment + 1])
    }
    controls = expanded
  }

  const path = seq.loopPath ? sampleClosedPath(controls, 64) : samplePath(controls, 64)
  const orderedStops = zones.map((zone) => {
    const cx = (zone.x + zone.w / 2) * d.w
    const cy = (zone.y + zone.h / 2) * d.h
    let nearest = Infinity
    let distanceAlongPath = 0
    path.points.forEach((point, index) => {
      const distance = (point.x - cx) ** 2 + (point.y - cy) ** 2
      if (distance < nearest) {
        nearest = distance
        distanceAlongPath = path.cumulative[index]
      }
    })
    return { zone, distance: distanceAlongPath }
  }).sort((a, b) => a.distance - b.distance)
  const landingDistances = orderedStops.map((stop) => stop.distance)
  const orderedLandings = orderedStops.map((stop) => stop.zone)
  if (landingDistances.length) landU = landingDistances[0] / Math.max(1, path.length)

  return { path, landU, landDistance: landingDistances[0] ?? landU * path.length, landingDistances, orderedLandings }
}

function prepare(seq: Sequence, d: Dims): Prepared {
  const sig = sigFor(seq, d)
  const hit = cache.get(seq.id)
  if (hit?.sig === sig) return hit
  const motionPath = buildMotionPath(seq, d)
  const { path, landU, landDistance, landingDistances, orderedLandings } = motionPath
  const prepared = { path, landU, landDistance, landingDistances, orderedLandings, seeds: buildBirdSeeds(seq), sig }
  cache.set(seq.id, prepared)
  return prepared
}

function travelOffset(seq: Sequence, s: BirdSeed, u: number, seconds: number, scale: number) {
  const loopPhase = u * Math.PI * 2
  const groupBreath = 0.96 + 0.07 * Math.sin(seq.loopPath ? loopPhase : seconds * 0.28)
  const spread = scale * 0.9 * groupBreath
  // Independent low-frequency air drift keeps the group alive without losing
  // its formation. Frequencies and phases are seeded per bird.
  const driftXPhase = seq.loopPath ? loopPhase + s.bob : seconds * (0.31 + s.speedJ * 0.08) + s.bob
  const driftYPhase = seq.loopPath ? loopPhase * 2 + s.phase * Math.PI * 2 : seconds * (0.43 + s.speedJ * 0.06) + s.phase * Math.PI * 2
  const driftX = Math.sin(driftXPhase) * spread * 0.075
  const driftY = Math.sin(driftYPhase) * spread * 0.1
  const withDrift = (dx: number, dy: number) => ({ dx: dx + driftX, dy: dy + driftY })
  switch (seq.treatment) {
    case "Calm Glide": {
      const v = -Math.abs(s.lat) * spread * 0.4
      return withDrift(s.lat * spread * 0.78 + v * 0.2, s.vert * spread * 0.62 + v)
    }
    case "Symmetric Murmuration": {
      const breathe = 0.72 + 0.18 * Math.sin(seconds * 0.9 + s.bob)
      const side = s.sub ? 1 : -1
      return withDrift(side * Math.abs(s.lat) * spread * breathe, s.vert * spread * 0.8 * breathe)
    }
    case "Dive and Pullout": {
      const dive = Math.sin(u * Math.PI)
      return withDrift(s.lat * spread * (0.72 + dive * 0.28), s.vert * spread * lerp(0.95, 0.62, dive))
    }
    case "Curl and Release": {
      const angle = s.orbit + seconds * 0.95 + u * 2
      const radius = spread * (0.35 + u * 0.6) * (0.55 + Math.abs(s.lat))
      return withDrift(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.68)
    }
    case "Ribbon Wave": {
      const wave = Math.sin(s.lat * 3 + seconds * 2.2) * spread * 0.7
      return withDrift(s.lat * spread * 1.35, wave + s.vert * spread * 0.1)
    }
    case "Split and Rejoin": {
      const part = Math.sin(u * Math.PI)
      return withDrift(s.lat * spread * 0.3, (s.sub ? 1 : -1) * part * spread + s.vert * spread * 0.2)
    }
    case "Waterfall Bloom": {
      // Port the accepted 68-bird renderer's broad travelling body. It draws
      // together briefly at the low-center pulse, then releases asymmetrically
      // without ever becoming a top-center mechanical column.
      const edge = Math.sin(Math.PI * clamp01(u))
      const impact = Math.exp(-Math.pow((u - 0.48) / 0.15, 2))
      const bloom = u <= 0.42 || u >= 0.93
        ? 0
        : Math.sin(Math.PI * (u - 0.42) / (0.93 - 0.42))
      const rising = smoothstep(0.52, 0.9, u)
      const contract = 1 - 0.62 * impact
      const side = s.sub ? 1 : -1
      const bodyX = 0.16 + 0.84 * edge
      const bodyY = 0.18 + 0.82 * edge
      const fan = spread * (0.28 + 1.08 * s.rank) * bloom * (0.35 + 0.65 * rising)
      const ripple = Math.sin(seconds * 1.07 - s.rank * 4.15 + s.bob)
      return withDrift(
        s.lat * spread * bodyX * contract
          + side * fan * (0.48 + 0.22 * Math.sin(s.bob + 2.4 * u))
          + spread * 0.1 * ripple * bloom,
        s.vert * spread * bodyY * contract
          + side * fan * (0.32 + 0.14 * Math.cos(s.bob + 3.1 * u))
          + spread * 0.15 * ripple * bloom,
      )
    }
    case "Vortex Pull": {
      // The corrected supplied Vortex is a low banking sweep, not an orbit.
      // Use a broad body, a short elastic compression, and an asymmetric rise.
      const edge = Math.sin(Math.PI * clamp01(u))
      const compression = Math.exp(-Math.pow((u - 0.48) / 0.19, 2))
      const release = u <= 0.56 || u >= 0.97
        ? 0
        : Math.sin(Math.PI * (u - 0.56) / (0.97 - 0.56))
      const side = s.sub ? 1 : -1
      const body = 0.26 + 0.74 * edge
      const wave = Math.sin(seconds * 1.0 - s.rank * 3.9 + s.bob)
      return withDrift(
        side * spread * (0.24 + 0.9 * s.rank) * body
          + spread * 0.22 * Math.sin(s.bob + 1.7 * u) * edge
          - side * spread * (0.16 + 0.62 * s.rank) * compression
          - spread * (0.18 + 0.82 * s.rank) * release,
        s.vert * spread * body
          + spread * 0.26 * Math.sin(s.bob + 2.3 * u) * edge
          - s.vert * spread * 0.46 * compression
          - side * spread * (0.3 + 0.86 * s.rank) * release
          + spread * 0.14 * wave * release,
      )
    }
  }
}

function landingOffset(role: Sequence["arrivalMode"], s: BirdSeed, seconds: number, lz: { w: number; h: number }) {
  if (role === "Perch") {
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

export function landingCounts(seq: Sequence) {
  const total = sequenceBirdCount(seq)
  if (seq.loopPath) return { perch: 0, gather: 0, flyThrough: total, total }
  const legacyPerch = seq.arrivalMode === "Perch" ? total : 0
  const legacyGather = seq.arrivalMode === "Gather" ? total : 0
  const perch = Math.max(0, Math.min(total, Math.round(seq.perchCount ?? legacyPerch)))
  const gather = Math.max(0, Math.min(total - perch, Math.round(seq.gatherCount ?? legacyGather)))
  return { perch, gather, flyThrough: total - perch - gather, total }
}

function sequenceTiming(seq: Sequence) {
  if (seq.loopPath) {
    return {
      dwell: 0,
      dwellPerStop: 0,
      movingTime: Math.max(0.1, seq.durationSeconds) / Math.max(0.05, seq.speedMultiplier ?? 1),
    }
  }
  const counts = landingCounts(seq)
  const stopCount = landingZones(seq).length
  const hasLandingParticipants = stopCount > 0 && counts.perch + counts.gather > 0
  const requestedDwell = hasLandingParticipants ? Math.max(0, seq.dwellSeconds) * stopCount : 0
  const dwell = Math.min(requestedDwell, seq.durationSeconds * 0.65)
  const dwellPerStop = stopCount ? dwell / stopCount : 0
  const baseMovingTime = Math.max(0.1, seq.durationSeconds - dwell)
  const speedMultiplier = Math.max(0.05, seq.speedMultiplier ?? 1)
  const movingTime = baseMovingTime / speedMultiplier
  return { dwell, dwellPerStop, movingTime }
}

export function sequenceDuration(seq: Sequence) {
  const { dwell, movingTime } = sequenceTiming(seq)
  if (seq.loopPath) return movingTime
  // Followers start later rather than accelerating to erase their spacing.
  // Include that tail delay so the last bird can finish at the authored speed.
  return movingTime + dwell + movingTime * followerDelayFraction(sequenceBirdCount(seq) - 1)
}

export function perchActionPhase(elapsedSeconds: number, dwellSeconds: number) {
  const dwell = Math.max(0.001, dwellSeconds)
  const elapsed = clamp(elapsedSeconds, 0, dwell)
  // The authored perch track is semantic, not a looping flight flap:
  // contact -> fold -> settle -> quiet hold/micro-lift -> ready launch.
  const settleDuration = Math.min(0.8, dwell * 0.4)
  const readyDuration = Math.min(0.35, dwell * 0.18)
  if (elapsed < settleDuration) {
    return lerp(0, 0.499999, smoothstep(0, settleDuration, elapsed))
  }
  if (elapsed >= dwell - readyDuration) {
    return lerp(0.875, 0.999999, smoothstep(dwell - readyDuration, dwell, elapsed))
  }
  const holdElapsed = elapsed - settleDuration
  const quietHold = [0.53, 0.66, 0.78, 0.66]
  return quietHold[Math.floor(holdElapsed / 0.48) % quietHold.length]
}

export function motionClock(
  seq: Sequence,
  path: SampledPath,
  landDistance: number | number[],
  seconds: number,
  role: Sequence["arrivalMode"] = seq.arrivalMode,
) {
  const timing = sequenceTiming(seq)
  const dwell = role === "Fly through" ? 0 : timing.dwellPerStop
  const movingTime = timing.movingTime
  const speed = path.length / movingTime
  const distances = (Array.isArray(landDistance) ? landDistance : [landDistance])
    .filter((distance) => Number.isFinite(distance))
    .sort((a, b) => a - b)
  if (!dwell || !distances.length) return { distance: Math.min(path.length, seconds * speed), landingBlend: 0, dwelling: false, speed, action: "flight" as const, actionPhase: 0, landingIndex: -1 }
  const approachDistance = Math.max(path.length * 0.08, Math.min(path.length * 0.18, speed * 1.8))
  let completedDwell = 0
  for (let index = 0; index < distances.length; index++) {
    const stopDistance = distances[index]
    const arriveAt = stopDistance / speed + completedDwell
    const leaveAt = arriveAt + dwell
    if (seconds < arriveAt) {
      const distance = (seconds - completedDwell) * speed
      if (index > 0) {
        const previousStop = distances[index - 1]
        const release = smoothstep(0, approachDistance, distance - previousStop)
        if (release < 1) return {
          distance,
          landingBlend: 1 - release,
          dwelling: false,
          speed,
          action: "launch" as const,
          actionPhase: release,
          landingIndex: index - 1,
        }
      }
      const blend = smoothstep(Math.max(0, stopDistance - approachDistance), stopDistance, distance)
      return {
        distance,
        landingBlend: blend,
        dwelling: false,
        speed,
        action: blend > 0 ? "approach" as const : "flight" as const,
        actionPhase: blend,
        landingIndex: index,
      }
    }
    if (seconds <= leaveAt) return {
      distance: stopDistance,
      landingBlend: 1,
      dwelling: true,
      speed,
      action: "perch" as const,
      actionPhase: perchActionPhase(seconds - arriveAt, dwell),
      landingIndex: index,
    }
    completedDwell += dwell
  }
  const lastIndex = distances.length - 1
  const lastStop = distances[lastIndex]
  const distance = (seconds - completedDwell) * speed
  const release = smoothstep(0, approachDistance, distance - lastStop)
  return {
    distance: Math.min(path.length, distance),
    landingBlend: 1 - release,
    dwelling: false,
    speed,
    action: release < 1 ? "launch" as const : "flight" as const,
    actionPhase: release,
    landingIndex: lastIndex,
  }
}

export function depthScaleAt(seq: Sequence, u: number) {
  const direction = seq.depthDirection ?? "Flat plane"
  if (direction === "Flat plane") return 1
  const strength = Math.max(0, Math.min(1.5, seq.depthStrength ?? 0.75))
  const far = Math.max(0.22, 1 - strength * 0.58)
  const near = 1 + strength * 0.82
  // A closed path must return to the same scale at the seam.
  const progress = seq.loopPath
    ? (1 - Math.cos(Math.PI * 2 * clamp01(u))) / 2
    : smoothstep(0.02, 0.98, clamp01(u))
  return direction === "Background to foreground"
    ? lerp(far, near, progress)
    : lerp(near, far, progress)
}

export function birdScaleAt(seq: Sequence, u: number, index: number) {
  const perspective = depthScaleAt(seq, u)
  const foregroundCount = clamp(Math.round(seq.foregroundBirdCount ?? 0), 0, sequenceBirdCount(seq))
  const isForegroundBird = index < foregroundCount
  // Support birds share the travel cue subtly; only the explicitly selected
  // foreground count receives the full 10x perspective range.
  const depthContribution = isForegroundBird ? 1 : 0.18
  const supportedPerspective = lerp(1, perspective, depthContribution)
  const foregroundBoost = Math.max(1, seq.foregroundBoost ?? 1)
  let boost = 1
  if (isForegroundBird) {
    const progress = seq.loopPath
      ? (1 - Math.cos(Math.PI * 2 * clamp01(u))) / 2
      : smoothstep(0.02, 0.98, clamp01(u))
    boost = seq.depthDirection === "Background to foreground"
      ? lerp(1, foregroundBoost, progress)
      : seq.depthDirection === "Foreground to background"
        ? lerp(foregroundBoost, 1, progress)
        : foregroundBoost
  }
  return supportedPerspective * boost
}

export function formationSpacingAt(seq: Sequence, u: number) {
  const perspective = depthScaleAt(seq, u)
  const depthBreathing = lerp(1, perspective, 0.28)
  return Math.max(0.5, seq.spacingScale ?? 1.8)
    * Math.sqrt(Math.max(0.35, seq.sizeScale ?? 1))
    * depthBreathing
}

export function naturalWingPhase(rawPhase: number) {
  // Preserve chronological progress through the artist's eight source poses.
  // Do not add holds, reverse the sequence, or skip the peak frames.
  return ((rawPhase % 1) + 1) % 1
}

export function renderSequence(
  ctx: CanvasRenderingContext2D,
  seq: Sequence,
  t: number,
  style: Style,
  d: Dims,
  template: BirdTemplate = BUILTIN_BIRD_TEMPLATE,
) {
  const { path, landingDistances, orderedLandings, seeds } = prepare(seq, d)
  if (path.points.length < 2 || path.length <= 0) return
  const runtime = sequenceDuration(seq)
  const seconds = clamp01(t) * runtime
  const { movingTime } = sequenceTiming(seq)
  const counts = landingCounts(seq)
  const loopProgress = seq.loopPath ? (t >= 1 ? 0 : ((t % 1) + 1) % 1) : 0
  const scale = Math.min(d.w, d.h)
  const lzs = orderedLandings.map((landing) => ({
    cx: (landing.x + landing.w / 2) * d.w,
    cy: (landing.y + landing.h / 2) * d.h,
    w: landing.w * d.w,
    h: landing.h * d.h,
  }))
  const seam = seq.loopPath ? 1 : smoothstep(0, 0.035, 1 - t)
  const count = sequenceBirdCount(seq)
  const densitySize = count > 60 ? 0.7 : count > 30 ? 0.82 : count > 12 ? 0.94 : 1
  const baseSize = scale * 0.055 * densitySize
  const wingRate = WING_RATE[seq.wingIntensity]
  const ink = style.previewTheme === "dark"
    ? seq.darkColor || "#e2e8f0"
    : seq.lightColor || seq.color || style.inkColor

  seeds.forEach((s, index) => {
    let birdSeconds: number
    let role: Sequence["arrivalMode"]
    let clock: ReturnType<typeof motionClock>
    let u: number
    if (seq.loopPath) {
      birdSeconds = loopProgress * movingTime
      role = "Fly through"
      u = ((loopProgress - s.depth) % 1 + 1) % 1
      clock = { distance: u * path.length, landingBlend: 0, dwelling: false, speed: path.length / movingTime, action: "flight" as const, actionPhase: 0, landingIndex: -1 }
    } else {
      // Every bird uses the same constant-speed clock with a staggered start.
      // No follower is accelerated or position-blended forward to catch up.
      birdSeconds = seconds - s.depth * movingTime
      role = index < counts.perch
        ? "Perch"
        : index < counts.perch + counts.gather ? "Gather" : "Fly through"
      clock = motionClock(seq, path, landingDistances, birdSeconds, role)
      u = clock.distance / path.length
    }
    // Do not clamp parked followers onto edge points. They remain offscreen
    // until their true distance enters the sampled path.
    if (!seq.loopPath && (u < 0 || u >= 1)) return
    const head = pointAt(path, u)
    const tangent = seq.loopPath
      ? Math.atan2(
          pointAt(path, (u + 0.008) % 1).y - pointAt(path, (u - 0.008 + 1) % 1).y,
          pointAt(path, (u + 0.008) % 1).x - pointAt(path, (u - 0.008 + 1) % 1).x,
        )
      : headingAt(path, u)
    const aheadU = seq.loopPath ? (u + 0.018) % 1 : clamp01(u + 0.018)
    const ahead = seq.loopPath
      ? Math.atan2(
          pointAt(path, (aheadU + 0.008) % 1).y - pointAt(path, (aheadU - 0.008 + 1) % 1).y,
          pointAt(path, (aheadU + 0.008) % 1).x - pointAt(path, (aheadU - 0.008 + 1) % 1).x,
        )
      : headingAt(path, aheadU)
    const bank = tangent + shortestAngle(tangent, ahead) * 0.55
    const perspective = birdScaleAt(seq, u, index)
    const offset = travelOffset(seq, s, u, birdSeconds, baseSize * 2.2 * formationSpacingAt(seq, u))
    let x = head.x + offset.dx
    let y = head.y + offset.dy

    const lz = clock.landingIndex >= 0 ? lzs[clock.landingIndex] : null
    if (lz && role !== "Fly through" && clock.landingBlend > 0) {
      const target = landingOffset(role, s, birdSeconds, lz)
      const settled = resolveLandingPosition(head, offset, target, clock.landingBlend)
      x = settled.x
      y = settled.y
    }

    const edgeFade = seq.loopPath ? 1 : smoothstep(0, 0.035, 1 - u)
    const alpha = seam * edgeFade * 0.94
    if (alpha <= 0.01) return
    const size = Math.min(
      baseSize * (seq.sizeScale ?? 1) * s.sizeJ * perspective,
      d.w * 1.25,
    )
    const targetLoopRate = wingRate * 0.16
    const loopWingCycles = Math.max(1, Math.round(movingTime * targetLoopRate))
    const rawPhase = seq.loopPath
      ? loopProgress * loopWingCycles + s.phase
      : birdSeconds * wingRate * s.speedJ * 0.16 + s.phase
    const flightPhase = naturalWingPhase(rawPhase)
    const animationTrack: BirdAnimationTrack = clock.action
    const phase = animationTrack === "flight"
      ? flightPhase
      : Math.min(0.999999, Math.max(0, clock.actionPhase))

    ctx.save()
    ctx.translate(x, y)
    // Landing birds keep the correct source-facing direction while their bank
    // eases upright at contact and returns smoothly during launch.
    const templateDirection = template.direction ?? "left"
    const orientation = orientationForMotion(seq, bank, templateDirection)
    const uprightBlend = role === "Fly through" ? 0 : clock.landingBlend
    ctx.rotate(lerp(orientation.rotation, 0, uprightBlend))
    if (orientation.mirrorX) ctx.scale(-1, 1)
    // Strength is used only if this template is a one-still fallback. Ordered
    // source bundles render the artist's exact pixels and ignore this value.
    const wingStrength = 1
    // Never substitute a procedural bird while source artwork is loading or
    // unavailable. The Stage preloads the assigned templates and surfaces an
    // honest loading/error state; exports reject missing assets before render.
    drawBirdTemplate(ctx, template, phase, size, alpha, ink, s.asset, wingStrength, animationTrack)
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
    if (seq.points.length >= 2) renderSequence(ctx, seq, t, style, d, seq.birdTemplate ?? template)
  })
}

export function projectDuration(sequences: Sequence[]) {
  return sequences.reduce((max, sequence) => Math.max(max, sequenceDuration(sequence)), 0.001)
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
    renderSequence(
      ctx,
      sequence,
      clamp01(seconds / Math.max(0.001, sequenceDuration(sequence))),
      style,
      d,
      sequence.birdTemplate ?? template,
    )
  })
}

export function invalidateCache(id?: string) {
  if (id) cache.delete(id)
  else cache.clear()
}
