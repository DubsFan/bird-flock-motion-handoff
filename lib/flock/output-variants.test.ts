import { describe, expect, it } from "vitest"
import { defaultProject } from "./defaults"
import { switchOutputVariant } from "./output-variants"

describe("output variations", () => {
  it("creates a new variation at its real device viewport", () => {
    const desktop = defaultProject()
    desktop.sequences[0].points = [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7 }]

    const mobile = switchOutputVariant(desktop, "mobile")

    expect(mobile.activeVariant).toBe("mobile")
    expect(mobile.viewport).toEqual({ width: 390, height: 844 })
    expect(mobile.sequences[0].points).toEqual(desktop.sequences[0].points)
    expect(mobile.sequences[0].points).not.toBe(desktop.sequences[0].points)
  })

  it("preserves independent path and landing edits when switching back", () => {
    const desktop = defaultProject()
    desktop.sequences[0].points = [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7 }]
    const mobile = switchOutputVariant(desktop, "mobile")
    mobile.sequences[0].points = [{ x: 0.2, y: 0.1 }, { x: 0.6, y: 0.9 }]
    mobile.sequences[0].landings = [{ x: 0.4, y: 0.7, w: 0.2, h: 0.1 }]

    const restoredDesktop = switchOutputVariant(mobile, "desktop")
    const restoredMobile = switchOutputVariant(restoredDesktop, "mobile")

    expect(restoredDesktop.viewport).toEqual({ width: 1600, height: 900 })
    expect(restoredDesktop.sequences[0].points).toEqual([{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7 }])
    expect(restoredDesktop.sequences[0].landings).toEqual([])
    expect(restoredMobile.viewport).toEqual({ width: 390, height: 844 })
    expect(restoredMobile.sequences[0].points).toEqual([{ x: 0.2, y: 0.1 }, { x: 0.6, y: 0.9 }])
    expect(restoredMobile.sequences[0].landings).toEqual([{ x: 0.4, y: 0.7, w: 0.2, h: 0.1 }])
  })
})
