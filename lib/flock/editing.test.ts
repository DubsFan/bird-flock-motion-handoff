import { describe, expect, it } from "vitest"
import { makeSequence } from "./defaults"
import { deleteLanding, deletePathPoint } from "./editing"

describe("canvas editing", () => {
  it("deletes exactly the selected path point", () => {
    const sequence = makeSequence("Calm Glide")
    const expected = [sequence.points[0], ...sequence.points.slice(2)]

    const edited = deletePathPoint(sequence, 1)

    expect(edited.points).toEqual(expected)
    expect(edited.points).toHaveLength(sequence.points.length - 1)
  })

  it("deletes exactly the selected landing and preserves the remaining stop", () => {
    const sequence = makeSequence("Calm Glide")
    sequence.landings = [
      { x: 0.2, y: 0.3, w: 0.1, h: 0.1 },
      { x: 0.7, y: 0.6, w: 0.12, h: 0.12 },
    ]
    sequence.landing = sequence.landings[0]
    sequence.perchCount = 2

    const edited = deleteLanding(sequence, 0)

    expect(edited.landings).toEqual([{ x: 0.7, y: 0.6, w: 0.12, h: 0.12 }])
    expect(edited.landing).toEqual(edited.landings[0])
    expect(edited.perchCount).toBe(2)
  })

  it("returns to fly-through when the final landing is deleted", () => {
    const sequence = makeSequence("Calm Glide")
    sequence.landings = [{ x: 0.2, y: 0.3, w: 0.1, h: 0.1 }]
    sequence.landing = sequence.landings[0]
    sequence.arrivalMode = "Perch"
    sequence.perchCount = 3
    sequence.gatherCount = 2

    const edited = deleteLanding(sequence, 0)

    expect(edited.landings).toEqual([])
    expect(edited.landing).toBeNull()
    expect(edited.arrivalMode).toBe("Fly through")
    expect(edited.perchCount).toBe(0)
    expect(edited.gatherCount).toBe(0)
  })
})
