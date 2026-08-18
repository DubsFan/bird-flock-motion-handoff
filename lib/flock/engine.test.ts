import { describe, expect, it } from "vitest"
import { clearSequenceGeometry, defaultProject, makeSequence, treatmentPresetPatch } from "./defaults"
import {
  birdScaleAt,
  buildMotionPath,
  depthScaleAt,
  formationSpacingAt,
  flightPhaseAt,
  assertTemplateSamplingSupported,
  landingCounts,
  landingZones,
  loopFlightPhase,
  motionClock,
  naturalWingPhase,
  orientationForMotion,
  phaseLockedFlightPhase,
  perchActionPhase,
  resolveLandingPosition,
  requiredTemplateSamplingFps,
  sequenceBirdCount,
  sequenceDuration,
  templateCycleRate,
  templatePhysicalCycleRate,
} from "./engine"
import { frameIndexForPhase } from "./template-renderer"
import {
  BUILTIN_ARTWORK_OPTIONS,
  NATURAL_BAT_TEMPLATE,
  NATURAL_BUTTERFLY_TEMPLATE,
  NATURAL_CROW_TEMPLATE,
  NATURAL_HUMMINGBIRD_TEMPLATE,
  NATURAL_PIGEON_TEMPLATE,
  NATURAL_SWALLOW_TEMPLATE,
  type BirdTemplate,
  type WingIntensity,
} from "./types"

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

  it("decelerates continuously into contact instead of hitting a hard stop", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.landing = { x: 0.5, y: 0.5, w: 0.12, h: 0.1 }
    sequence.arrivalMode = "Perch"
    sequence.perchCount = 1
    sequence.dwellSeconds = 2
    sequence.speedMultiplier = 1
    const { path, landDistance } = buildMotionPath(sequence, { w: 1000, h: 600 })
    const initial = motionClock(sequence, path, landDistance, 0)
    const arrivalTime = landDistance / initial.speed
    const beforeA = motionClock(sequence, path, landDistance, arrivalTime - 0.3)
    const beforeB = motionClock(sequence, path, landDistance, arrivalTime - 0.2)
    const beforeC = motionClock(sequence, path, landDistance, arrivalTime - 0.1)
    const dwelling = motionClock(sequence, path, landDistance, arrivalTime + 0.2)

    const earlierSpeed = (beforeB.distance - beforeA.distance) / 0.1
    const laterSpeed = (beforeC.distance - beforeB.distance) / 0.1
    expect(earlierSpeed).toBeGreaterThan(laterSpeed)
    expect(laterSpeed).toBeGreaterThan(0)
    expect(laterSpeed).toBeLessThan(initial.speed)
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

  it("still runs approach and launch when dwell is zero", () => {
    const sequence = makeSequence("Dive and Pullout")
    sequence.landing = { x: 0.5, y: 0.5, w: 0.12, h: 0.1 }
    sequence.perchCount = 1
    sequence.dwellSeconds = 0
    const { path, landDistance } = buildMotionPath(sequence, { w: 1000, h: 600 })
    const base = motionClock(sequence, path, landDistance, 0, "Perch")
    const arriveAt = landDistance / base.speed

    expect(motionClock(sequence, path, landDistance, arriveAt - 0.05, "Perch").action).toBe("approach")
    expect(motionClock(sequence, path, landDistance, arriveAt + 0.05, "Perch").action).toBe("launch")
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

  it("pitches a side profile toward steep travel without turning it upside down", () => {
    const sequence = makeSequence("Calm Glide")
    for (const heading of [-Math.PI * 1.5, -Math.PI / 2, Math.PI / 2, Math.PI * 1.5]) {
      const orientation = orientationForMotion(sequence, heading, "left")
      expect(Math.abs(orientation.rotation)).toBeLessThanOrEqual(0.9)
    }
  })

  it("rotates top-down artwork from its authored forward axis onto travel", () => {
    const sequence = makeSequence("Calm Glide")
    const rightward = orientationForMotion(sequence, 0, "right", "follow-path", -Math.PI / 2)
    const downward = orientationForMotion(sequence, Math.PI / 2, "right", "follow-path", -Math.PI / 2)

    expect(rightward.mirrorX).toBe(false)
    expect(rightward.rotation).toBeCloseTo(Math.PI / 2, 8)
    expect(downward.rotation).toBeCloseTo(Math.PI, 8)
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

  it("uses physical cycle rates that do not change with authored frame count", () => {
    const eightFrames: BirdTemplate = {
      id: "eight",
      name: "Eight",
      kind: "sprites",
      frames: Array.from({ length: 8 }, (_, index) => `${index}.png`),
      cycleHz: { Medium: 1.4 },
    }
    const sixteenFrames = { ...eightFrames, id: "sixteen", frames: [...eightFrames.frames, ...eightFrames.frames] }

    expect(templateCycleRate(eightFrames, "Medium")).toBe(1.4)
    expect(templateCycleRate(sixteenFrames, "Medium")).toBe(1.4)
  })

  it("keeps the multiplier fallback for legacy saved and imported templates", () => {
    const legacy: BirdTemplate = {
      id: "legacy",
      name: "Legacy",
      kind: "sprites",
      frames: ["01.png", "02.png"],
      motionRateMultiplier: 1.6,
    }

    expect(templateCycleRate(legacy, "Medium", 1.1)).toBeCloseTo(1.76, 8)
  })

  it("retains physical species cadence as source metadata", () => {
    expect(NATURAL_CROW_TEMPLATE.cycleHz).toEqual({ Soft: 4, Medium: 4.5, Strong: 5 })
    expect(NATURAL_PIGEON_TEMPLATE.cycleHz).toEqual({ Soft: 5, Medium: 6, Strong: 7 })
    expect(NATURAL_SWALLOW_TEMPLATE.cycleHz).toEqual({ Soft: 7, Medium: 8, Strong: 9 })
    expect(NATURAL_BUTTERFLY_TEMPLATE.cycleHz).toEqual({ Soft: 8, Medium: 10, Strong: 12 })
    expect(NATURAL_BAT_TEMPLATE.cycleHz).toEqual({ Soft: 8, Medium: 10, Strong: 12 })
  })

  it("uses readable species display cadence coupled to route speed", () => {
    expect(templateCycleRate(NATURAL_CROW_TEMPLATE, "Medium", 1, 1)).toBe(2)
    expect(templateCycleRate(NATURAL_PIGEON_TEMPLATE, "Medium", 1, 1)).toBe(2.6)
    expect(templateCycleRate(NATURAL_SWALLOW_TEMPLATE, "Medium", 1, 1)).toBe(3.2)
    expect(templateCycleRate(NATURAL_BUTTERFLY_TEMPLATE, "Medium", 1, 1)).toBe(4)
    expect(templateCycleRate(NATURAL_BAT_TEMPLATE, "Medium", 1, 1)).toBe(3.3)
    expect(templateCycleRate(NATURAL_CROW_TEMPLATE, "Medium", 1, 0.25)).toBe(1.1)
    expect(templateCycleRate(NATURAL_CROW_TEMPLATE, "Medium", 1, 2.25)).toBe(2.7)
  })

  it("adds real flap-glide holds without reversing the authored wing cycle", () => {
    const rhythm = NATURAL_CROW_TEMPLATE.flightRhythm
    const rate = templateCycleRate(NATURAL_CROW_TEMPLATE, "Medium", 1)
    const flapDuration = 3 / rate
    const duringFlap = flightPhaseAt(flapDuration - 0.01, rate, 0, rhythm)
    const duringGlideA = flightPhaseAt(flapDuration + 0.05, rate, 0, rhythm)
    const duringGlideB = flightPhaseAt(flapDuration + 0.3, rate, 0, rhythm)

    expect(duringFlap).not.toBeCloseTo(0, 3)
    expect(duringGlideA).toBeCloseTo(0, 8)
    expect(duringGlideB).toBeCloseTo(0, 8)
  })

  it("supports every packaged fast animal at the normal 30 fps delivery rate", () => {
    const fastAnimals = [
      NATURAL_CROW_TEMPLATE,
      NATURAL_PIGEON_TEMPLATE,
      NATURAL_SWALLOW_TEMPLATE,
      NATURAL_BUTTERFLY_TEMPLATE,
      NATURAL_BAT_TEMPLATE,
    ]
    for (const template of fastAnimals) {
      expect(template.samplingPolicy?.mode).toBe("temporal-blur")
      expect(() => assertTemplateSamplingSupported(template, "Strong", 30)).not.toThrow()
      expect(requiredTemplateSamplingFps(template, "Strong")).toBe(30)
    }
  })

  it("enforces chronological sampling policy at 24, 30, and 60 fps", () => {
    const intensities: WingIntensity[] = ["Soft", "Medium", "Strong"]
    const fpsValues = [24, 30, 60]
    const fastestSeedJitter = 1.12
    const expectNoPoseSkip = (template: BirdTemplate, intensity: WingIntensity, fps: number) => {
      const frameCount = Math.max(1, template.framesPerVariant ?? template.frames.length)
      const rate = templateCycleRate(template, intensity, fastestSeedJitter)
      let previous = frameIndexForPhase(0.37, frameCount)
      for (let frame = 1; frame <= fps * 5; frame++) {
        const phase = frame / fps * rate + 0.37
        const current = frameIndexForPhase(phase, frameCount)
        const advance = (current - previous + frameCount) % frameCount
        expect(advance, `${template.id} ${intensity} at ${fps} fps`).toBeLessThanOrEqual(1)
        previous = current
      }
    }

    for (const template of BUILTIN_ARTWORK_OPTIONS.filter((option) => option.samplingPolicy?.mode === "chronological")) {
      for (const intensity of intensities) {
        expect(template.cycleHz?.[intensity], `${template.id} ${intensity} cycleHz`).toBeGreaterThan(0)
        const requiredFps = requiredTemplateSamplingFps(template, intensity, fastestSeedJitter)
        for (const fps of fpsValues) {
          if (fps < requiredFps) {
            expect(() => assertTemplateSamplingSupported(template, intensity, fps, fastestSeedJitter)).toThrow(/requires at least/)
            continue
          }
          expect(() => assertTemplateSamplingSupported(template, intensity, fps, fastestSeedJitter)).not.toThrow()
          expectNoPoseSkip(template, intensity, fps)
        }
        expect(() => assertTemplateSamplingSupported(template, intensity, requiredFps, fastestSeedJitter)).not.toThrow()
        expectNoPoseSkip(template, intensity, requiredFps)
      }
    }
  })

  it("declares hummingbird physical motion separately from its motion-blur shimmer", () => {
    expect(NATURAL_HUMMINGBIRD_TEMPLATE.samplingPolicy?.mode).toBe("motion-blur-shimmer")
    expect(templatePhysicalCycleRate(NATURAL_HUMMINGBIRD_TEMPLATE, "Medium")).toBe(50)
    expect(templateCycleRate(NATURAL_HUMMINGBIRD_TEMPLATE, "Medium")).toBe(2.1)
    expect(() => assertTemplateSamplingSupported(NATURAL_HUMMINGBIRD_TEMPLATE, "Strong", 24)).toThrow(/at least 30 fps/)
    expect(() => assertTemplateSamplingSupported(NATURAL_HUMMINGBIRD_TEMPLATE, "Strong", 30)).not.toThrow()
    expect(() => assertTemplateSamplingSupported(NATURAL_HUMMINGBIRD_TEMPLATE, "Strong", 60)).not.toThrow()
  })

  it("samples a loop deterministically and returns to the seeded seam phase", () => {
    const rate = templateCycleRate(NATURAL_HUMMINGBIRD_TEMPLATE, "Strong", 1.07)
    const samples = [0.83, 0.12, 0.83, 0.41].map((progress) => loopFlightPhase(progress, 9.4, rate, 0.37))

    expect(samples[0]).toBeCloseTo(samples[2], 12)
    expect(loopFlightPhase(0, 9.4, rate, 0.37)).toBeCloseTo(loopFlightPhase(1, 9.4, rate, 0.37), 12)
  })

  it("closes each landing-adjacent flight segment on the seam pose", () => {
    expect(phaseLockedFlightPhase(400, 1000, [500], 100, 100, 1.6)).toBeCloseTo(0, 8)
    expect(phaseLockedFlightPhase(600, 1000, [500], 100, 100, 1.6)).toBeCloseTo(0, 8)
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
