import { describe, expect, it } from "vitest"
import { clearSequenceGeometry, defaultProject, makeSequence, treatmentPresetPatch } from "./defaults"
import {
  birdScaleAt,
  buildMotionPath,
  depthScaleAt,
  formationSpacingAt,
  landingCounts,
  landingZones,
  motionClock,
  naturalWingPhase,
  orientationForMotion,
  perchActionPhase,
  resolveLandingPosition,
  sequenceBirdCount,
  sequenceDuration,
} from "./engine"

describe("flock motion timing", () => {
  it("changes runtime predictably with the speed multiplier", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.durationSeconds = 10
    sequence.landing = { x: 0.5, y: 0.5, w: 0.12, h: 0.1 }
    sequence.perchCount = 1
    sequence.dwellSeconds = 2
    sequence.speedMultiplier = 2

    const fast = sequenceDuration(sequence)

    sequence.speedMultiplier = 0.5
    const slow = sequenceDuration(sequence)

    expect(fast).toBeCloseTo(6.7756, 5)
    expect(slow).toBeCloseTo(21.1024, 5)
    expect(slow).toBeGreaterThan(fast)
  })

  it("routes the sampled flight path through the landing center", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.landing = { x: 0.72, y: 0.72, w: 0.12, h: 0.1 }
    const { path } = buildMotionPath(sequence, { w: 1000, h: 600 })
    const center = { x: 780, y: 462 }
    const nearest = Math.min(...path.points.map((point) => Math.hypot(point.x - center.x, point.y - center.y)))

    expect(nearest).toBeLessThan(1)
  })

  it("keeps the same travel speed into the landing instead of rushing", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.landing = { x: 0.5, y: 0.5, w: 0.12, h: 0.1 }
    sequence.arrivalMode = "Perch"
    sequence.perchCount = 1
    sequence.dwellSeconds = 2
    sequence.speedMultiplier = 1
    const { path, landDistance } = buildMotionPath(sequence, { w: 1000, h: 600 })
    const initial = motionClock(sequence, path, landDistance, 0)
    const arrivalTime = landDistance / initial.speed
    const beforeA = motionClock(sequence, path, landDistance, arrivalTime - 0.2)
    const beforeB = motionClock(sequence, path, landDistance, arrivalTime - 0.1)
    const dwelling = motionClock(sequence, path, landDistance, arrivalTime + 0.2)

    expect((beforeB.distance - beforeA.distance) / 0.1).toBeCloseTo(initial.speed, 5)
    expect(dwelling.distance).toBeCloseTo(landDistance, 5)
    expect(dwelling.dwelling).toBe(true)
  })

  it("uses authored approach, perch, and launch tracks around a landing", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.landing = { x: 0.5, y: 0.5, w: 0.12, h: 0.1 }
    sequence.arrivalMode = "Perch"
    sequence.perchCount = 1
    sequence.dwellSeconds = 2
    const { path, landDistance } = buildMotionPath(sequence, { w: 1000, h: 600 })
    const base = motionClock(sequence, path, landDistance, 0, "Perch")
    const arriveAt = landDistance / base.speed

    expect(motionClock(sequence, path, landDistance, 0, "Perch").action).toBe("flight")
    expect(motionClock(sequence, path, landDistance, arriveAt - 0.05, "Perch").action).toBe("approach")
    expect(motionClock(sequence, path, landDistance, arriveAt + 0.2, "Perch").action).toBe("perch")
    expect(motionClock(sequence, path, landDistance, arriveAt + sequence.dwellSeconds + 0.05, "Perch").action).toBe("launch")
    expect(motionClock(sequence, path, landDistance, arriveAt + sequence.dwellSeconds + 3, "Perch").action).toBe("flight")
  })

  it("folds and settles once, holds quietly, then prepares for launch automatically", () => {
    expect(perchActionPhase(0, 2)).toBeCloseTo(0, 6)
    expect(perchActionPhase(0.4, 2)).toBeGreaterThan(0)
    expect(perchActionPhase(0.4, 2)).toBeLessThan(0.5)
    expect(perchActionPhase(1.1, 2)).toBeGreaterThanOrEqual(0.5)
    expect(perchActionPhase(1.1, 2)).toBeLessThan(0.875)
    expect(perchActionPhase(1.85, 2)).toBeGreaterThanOrEqual(0.875)
    expect(perchActionPhase(2, 2)).toBeCloseTo(0.999999, 6)
  })

  it("supports zero, one, or multiple ordered landing events on one route", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.durationSeconds = 14
    sequence.perchCount = 2
    sequence.dwellSeconds = 1.5
    sequence.landings = [
      { x: 0.72, y: 0.24, w: 0.1, h: 0.1 },
      { x: 0.24, y: 0.62, w: 0.12, h: 0.12 },
    ]
    sequence.landing = sequence.landings[0]
    const { path, landingDistances } = buildMotionPath(sequence, { w: 1000, h: 600 })

    expect(landingZones(sequence)).toHaveLength(2)
    expect(landingDistances).toHaveLength(2)
    expect(landingDistances[0]).toBeLessThan(landingDistances[1])

    const base = motionClock(sequence, path, landingDistances, 0, "Perch")
    const firstArrival = landingDistances[0] / base.speed
    const secondArrival = landingDistances[1] / base.speed + sequence.dwellSeconds
    expect(motionClock(sequence, path, landingDistances, firstArrival + 0.2, "Perch").landingIndex).toBe(0)
    expect(motionClock(sequence, path, landingDistances, firstArrival + sequence.dwellSeconds + 0.05, "Perch").action).toBe("launch")
    const secondStop = motionClock(sequence, path, landingDistances, secondArrival + 0.2, "Perch")
    expect(secondStop.action).toBe("perch")
    expect(secondStop.landingIndex).toBe(1)

    sequence.landings = []
    sequence.landing = null
    expect(landingZones(sequence)).toEqual([])
  })

  it("settles formation offsets without pulling the path head toward landing", () => {
    const before = resolveLandingPosition(
      { x: 400, y: 250 },
      { dx: -30, dy: 12 },
      { dx: 8, dy: -4 },
      0.65,
    )
    const after = resolveLandingPosition(
      { x: 412, y: 257 },
      { dx: -30, dy: 12 },
      { dx: 8, dy: -4 },
      0.65,
    )

    expect(after.x - before.x).toBeCloseTo(12, 8)
    expect(after.y - before.y).toBeCloseTo(7, 8)
  })

  it("lets exact perch and gather counts land while the remainder fly through", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.landing = { x: 0.5, y: 0.5, w: 0.12, h: 0.1 }
    sequence.perchCount = 5
    sequence.gatherCount = 7
    const counts = landingCounts(sequence)
    expect(counts).toEqual({ perch: 5, gather: 7, flyThrough: 32, total: 44 })

    const { path, landDistance } = buildMotionPath(sequence, { w: 1000, h: 600 })
    const speed = motionClock(sequence, path, landDistance, 0, "Perch").speed
    const justAfterArrival = landDistance / speed + 0.2
    const percher = motionClock(sequence, path, landDistance, justAfterArrival, "Perch")
    const flyThrough = motionClock(sequence, path, landDistance, justAfterArrival, "Fly through")

    expect(percher.dwelling).toBe(true)
    expect(percher.distance).toBeCloseTo(landDistance, 5)
    expect(flyThrough.dwelling).toBe(false)
    expect(flyThrough.distance).toBeGreaterThan(landDistance)
  })
})

describe("grounded quick starts", () => {
  it("opens a fresh project as a calm fly-through instead of a forced landing pile", () => {
    const sequence = defaultProject().sequences[0]

    expect(sequence.name).toBe("Calm Editorial")
    expect(sequence.treatment).toBe("Calm Glide")
    expect(sequenceBirdCount(sequence)).toBe(22)
    expect(sequence.landing).toBeNull()
    expect(landingCounts(sequence)).toEqual({ perch: 0, gather: 0, flyThrough: 22, total: 22 })
  })

  it("reproduces the supplied large-flock roster counts with one preset patch", () => {
    const waterfall = { ...makeSequence("Calm Glide"), ...treatmentPresetPatch("Waterfall Bloom") }
    const vortex = { ...makeSequence("Calm Glide"), ...treatmentPresetPatch("Vortex Pull") }

    expect(sequenceBirdCount(waterfall)).toBe(68)
    expect(sequenceBirdCount(vortex)).toBe(74)
    expect(waterfall.points).toHaveLength(5)
    expect(vortex.points).toHaveLength(5)
    expect(landingCounts(waterfall).flyThrough).toBe(68)
    expect(landingCounts(vortex).flyThrough).toBe(74)
  })

  it("keeps a left-moving pullout travelling left while it rises", () => {
    const sequence = makeSequence("Vortex Pull")
    const { path } = buildMotionPath(sequence, { w: 1600, h: 900 })
    const last = path.points.at(-1)!
    const earlier = path.points.at(-65)!

    expect(last.x).toBeLessThan(earlier.x)
    expect(last.x).toBeLessThan(0)
    expect(last.y).toBeLessThan(0)
  })

  it("allows an exact count between the four density shortcuts", () => {
    const sequence = makeSequence("Calm Glide")
    sequence.birdCount = 31
    sequence.perchCount = 4
    sequence.gatherCount = 6

    expect(landingCounts(sequence)).toEqual({ perch: 4, gather: 6, flyThrough: 21, total: 31 })
  })
})

describe("depth travel", () => {
  it("scales from far to near and reverses deterministically", () => {
    const sequence = makeSequence("Calm Glide")
    sequence.depthDirection = "Background to foreground"
    expect(depthScaleAt(sequence, 0.05)).toBeLessThan(depthScaleAt(sequence, 0.95))

    sequence.depthDirection = "Foreground to background"
    expect(depthScaleAt(sequence, 0.05)).toBeGreaterThan(depthScaleAt(sequence, 0.95))

    sequence.depthDirection = "Flat plane"
    expect(depthScaleAt(sequence, 0.05)).toBe(1)
    expect(depthScaleAt(sequence, 0.95)).toBe(1)
  })

  it("supports a tiny-background to giant-foreground pass", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.depthDirection = "Background to foreground"
    sequence.depthStrength = 1.5
    sequence.sizeScale = 3.5

    const startScale = sequence.sizeScale * depthScaleAt(sequence, 0)
    const endScale = sequence.sizeScale * depthScaleAt(sequence, 1)
    expect(startScale).toBeLessThan(0.8)
    expect(endScale).toBeGreaterThan(7.5)
    expect(endScale / startScale).toBeGreaterThan(10)
  })

  it("makes only the chosen foreground bird giant while support birds stay readable", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.depthDirection = "Background to foreground"
    sequence.depthStrength = 1.5
    sequence.sizeScale = 1.1
    sequence.spacingScale = 3.2
    sequence.foregroundBirdCount = 1
    sequence.foregroundBoost = 2

    const heroStart = birdScaleAt(sequence, 0, 0)
    const heroEnd = birdScaleAt(sequence, 1, 0)
    const supportStart = birdScaleAt(sequence, 0, 1)
    const supportEnd = birdScaleAt(sequence, 1, 1)

    expect(heroStart).toBeLessThan(0.3)
    expect(heroEnd).toBeGreaterThan(4.4)
    expect(supportStart).toBeGreaterThan(0.8)
    expect(supportEnd).toBeLessThan(1.25)
    expect(formationSpacingAt(sequence, 1)).toBeGreaterThan(3.5)
  })
})

describe("background loop and lead-in", () => {
  it("starts a normal right-side entry close to the visible edge", () => {
    const sequence = makeSequence("Dive and Pullout")
    const { path } = buildMotionPath(sequence, { w: 1000, h: 600 })
    expect(path.points[0].x).toBeLessThanOrEqual(870)
    expect(path.points[0].x).toBeGreaterThanOrEqual(850)
  })

  it("builds a periodic closed path with matching seam state", () => {
    const sequence = makeSequence("Ribbon Wave")
    sequence.loopPath = true
    sequence.speedMultiplier = 2
    const { path } = buildMotionPath(sequence, { w: 1000, h: 600 })
    const first = path.points[0]
    const last = path.points.at(-1)!

    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeLessThan(0.001)
    expect(sequenceDuration(sequence)).toBeCloseTo(sequence.durationSeconds / 2, 8)
    expect(depthScaleAt(sequence, 0)).toBeCloseTo(depthScaleAt(sequence, 1), 8)
    expect(landingCounts(sequence).flyThrough).toBe(22)
  })
})

describe("artwork directionality", () => {
  it("mirrors a left-facing source for rightward travel without rotating it upside down", () => {
    const sequence = makeSequence("Calm Glide")
    sequence.entry = "Enter from left"
    sequence.exit = "Exit right"
    const orientation = orientationForMotion(sequence, 0, "left")

    expect(orientation.movingRight).toBe(true)
    expect(orientation.mirrorX).toBe(true)
    expect(orientation.rotation).toBeCloseTo(0, 8)
  })

  it("keeps a left-facing source upright for leftward travel", () => {
    const sequence = makeSequence("Calm Glide")
    sequence.entry = "Enter from right"
    sequence.exit = "Exit left"
    const orientation = orientationForMotion(sequence, Math.PI, "left")

    expect(orientation.movingRight).toBe(false)
    expect(orientation.mirrorX).toBe(false)
    expect(orientation.rotation).toBeCloseTo(0, 8)
  })

  it("limits steep path banking so artwork can never turn upside down", () => {
    const sequence = makeSequence("Calm Glide")
    for (const heading of [-Math.PI * 1.5, -Math.PI / 2, Math.PI / 2, Math.PI * 1.5]) {
      const orientation = orientationForMotion(sequence, heading, "left")
      expect(Math.abs(orientation.rotation)).toBeLessThanOrEqual(0.48)
    }
  })
})

describe("natural wing cadence", () => {
  it("preserves chronological source-frame progress without a neutral hold", () => {
    expect(naturalWingPhase(0)).toBeCloseTo(naturalWingPhase(1), 8)
    expect(naturalWingPhase(0.25)).toBeCloseTo(0.25, 8)
    expect(naturalWingPhase(0.5)).toBeCloseTo(0.5, 8)
    expect(naturalWingPhase(0.75)).toBeCloseTo(0.75, 8)
    expect(naturalWingPhase(-0.25)).toBeCloseTo(0.75, 8)
  })
})

describe("start over", () => {
  it("clears only the selected flock geometry and landing state", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.sizeScale = 3.5
    sequence.speedMultiplier = 0.75
    sequence.depthDirection = "Background to foreground"
    sequence.depthStrength = 1.5
    sequence.loopPath = true
    sequence.gatherCount = 7

    const cleared = clearSequenceGeometry(sequence)

    expect(cleared.points).toEqual([])
    expect(cleared.landing).toBeNull()
    expect(cleared.landings).toEqual([])
    expect(cleared.arrivalMode).toBe("Fly through")
    expect(cleared.perchCount).toBe(0)
    expect(cleared.gatherCount).toBe(0)
    expect(cleared.loopPath).toBe(false)
    expect(cleared.id).toBe(sequence.id)
    expect(cleared.sizeScale).toBe(3.5)
    expect(cleared.speedMultiplier).toBe(0.75)
    expect(cleared.depthDirection).toBe("Background to foreground")
    expect(cleared.depthStrength).toBe(1.5)
  })
})
