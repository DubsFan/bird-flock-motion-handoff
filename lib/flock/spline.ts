import type { Point } from "./types"

// Catmull-Rom spline sampled with arc-length parameterization so that a
// constant t-step yields constant travel speed along the curve.

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

export type SampledPath = {
  points: Point[] // densely sampled points
  cumulative: number[] // cumulative arc length at each sample
  length: number
}

// Densely sample a Catmull-Rom curve through the given control points.
export function samplePath(control: Point[], perSegment = 48): SampledPath {
  const pts: Point[] = []
  if (control.length === 0) {
    return { points: [], cumulative: [0], length: 0 }
  }
  if (control.length === 1) {
    return { points: [control[0]], cumulative: [0], length: 0 }
  }
  if (control.length === 2) {
    for (let i = 0; i <= perSegment; i++) {
      const t = i / perSegment
      pts.push({
        x: control[0].x + (control[1].x - control[0].x) * t,
        y: control[0].y + (control[1].y - control[0].y) * t,
      })
    }
  } else {
    const c = control
    for (let i = 0; i < c.length - 1; i++) {
      const p0 = c[i - 1] ?? c[i]
      const p1 = c[i]
      const p2 = c[i + 1]
      const p3 = c[i + 2] ?? c[i + 1]
      for (let j = 0; j < perSegment; j++) {
        pts.push(catmullRom(p0, p1, p2, p3, j / perSegment))
      }
    }
    pts.push(c[c.length - 1])
  }

  const cumulative: number[] = [0]
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    cumulative.push(len)
  }
  return { points: pts, cumulative, length: len }
}

// Periodic Catmull-Rom sampling for a path whose final segment returns to the
// first control point with matching incoming/outgoing tangents.
export function sampleClosedPath(control: Point[], perSegment = 48): SampledPath {
  if (control.length < 3) return samplePath([...control, ...control.slice(0, 1)], perSegment)
  const pts: Point[] = []
  const count = control.length
  for (let i = 0; i < count; i++) {
    const p0 = control[(i - 1 + count) % count]
    const p1 = control[i]
    const p2 = control[(i + 1) % count]
    const p3 = control[(i + 2) % count]
    for (let j = 0; j < perSegment; j++) {
      pts.push(catmullRom(p0, p1, p2, p3, j / perSegment))
    }
  }
  pts.push({ ...pts[0] })

  const cumulative: number[] = [0]
  let length = 0
  for (let i = 1; i < pts.length; i++) {
    length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    cumulative.push(length)
  }
  return { points: pts, cumulative, length }
}

// Position at normalized distance u in [0,1] along the arc-length.
export function pointAt(path: SampledPath, u: number): Point {
  const { points, cumulative, length } = path
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1 || length === 0) return points[0]
  const target = Math.max(0, Math.min(1, u)) * length
  // binary search
  let lo = 0
  let hi = cumulative.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cumulative[mid] < target) lo = mid + 1
    else hi = mid
  }
  const i = Math.max(1, lo)
  const segStart = cumulative[i - 1]
  const segEnd = cumulative[i]
  const f = segEnd - segStart === 0 ? 0 : (target - segStart) / (segEnd - segStart)
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * f,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * f,
  }
}

// Heading (radians) of the path at normalized distance u.
export function headingAt(path: SampledPath, u: number): number {
  const a = pointAt(path, Math.max(0, u - 0.008))
  const b = pointAt(path, Math.min(1, u + 0.008))
  return Math.atan2(b.y - a.y, b.x - a.x)
}
