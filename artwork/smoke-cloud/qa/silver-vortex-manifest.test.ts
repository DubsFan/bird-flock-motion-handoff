import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseBirdArtworkManifest } from "../../../lib/flock/artwork-manifest"

const manifestPath = new URL("../delivery/silver-vortex-smoke-v1/manifest.json", import.meta.url)
const bundlePath = new URL("../delivery/silver-vortex-smoke-v1/", import.meta.url)

function frame(path: string) {
  return readFileSync(new URL(path, bundlePath))
}

describe("Silver Vortex Smoke bundle", () => {
  it("is accepted as four aligned 15-frame Murmur tracks", () => {
    const parsed = parseBirdArtworkManifest(JSON.parse(readFileSync(manifestPath, "utf8")))

    expect(parsed.name).toBe("Silver Vortex Smoke")
    expect(parsed.direction).toBe("right")
    expect(parsed.canvases.flight).toMatchObject({
      width: 2048,
      height: 1280,
      anchor: { x: 1024, y: 640 },
      normalizedAnchor: { x: 0.5, y: 0.5 },
    })
    expect(parsed.canvases.action).toEqual(parsed.canvases.flight)
    expect(parsed.tracks.flight).toHaveLength(15)
    expect(parsed.tracks.approach).toHaveLength(15)
    expect(parsed.tracks.perch).toHaveLength(15)
    expect(parsed.tracks.launch).toHaveLength(15)
  })

  it("has exact pixel seams between every runtime track transition", () => {
    expect(frame("flight/15_neutral_seam.png")).toEqual(frame("flight/01_neutral_flow.png"))
    expect(frame("01_landing_approach/15_compressed_ready.png")).toEqual(frame("02_perch_settle_hold/01_compressed_contact.png"))
    expect(frame("02_perch_settle_hold/15_ready_release.png")).toEqual(frame("03_launch_flyoff/01_compressed_ready.png"))
    expect(frame("03_launch_flyoff/15_reformed_flow.png")).toEqual(frame("flight/01_neutral_flow.png"))
  })
})
