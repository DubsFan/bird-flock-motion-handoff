import { describe, expect, it } from "vitest"
import { parseBirdArtworkManifest } from "./artwork-manifest"
import { buildApplicationGuide, buildBirdArtworkAgentPrompt, buildMotionBriefJson } from "./brief"
import { defaultProject } from "./defaults"
import { buildProResCommand, exportDims, safeExportName } from "./export"
import { BUILTIN_BIRD_TEMPLATE, CURATED_BIRD_TEMPLATES } from "./types"

describe("export naming", () => {
  it("normalizes a user filename once and removes a typed extension", () => {
    expect(safeExportName("  Hero Birds FINAL.mp4  ")).toBe("hero-birds-final")
    expect(safeExportName("***")).toBe("flock")
  })

  it("keeps encoder dimensions even", () => {
    const project = defaultProject()
    project.viewport = { width: 1001, height: 777 }
    const dimensions = exportDims(project, 1001)
    expect(dimensions.width % 2).toBe(0)
    expect(dimensions.height % 2).toBe(0)
  })

  it("builds a double-clickable ProRes 4444 alpha converter", () => {
    const command = buildProResCommand("hero-birds", 30, 3)
    expect(command).toContain("#!/bin/zsh")
    expect(command).toContain("-profile:v 4444")
    expect(command).toContain("-pix_fmt yuva444p10le")
    expect(command).toContain("frames/frame_%03d.png")
    expect(command).toContain("hero-birds-prores4444.mov")
  })
})

describe("application guide", () => {
  it("documents transparent fallbacks and the opaque MP4 boundary", () => {
    const guide = buildApplicationGuide(defaultProject(), "hero-birds")
    expect(guide).toContain("# Apply hero-birds")
    expect(guide).toContain("hero-birds-alpha.mov")
    expect(guide).toContain("hero-birds-alpha.webm")
    expect(guide).toContain("hero-birds.mp4")
    expect(guide).toContain("HEIC is a still-image/image-sequence container")
    expect(guide).toContain("prefers-reduced-motion")
  })
})

describe("bird artwork handoff", () => {
  it("defines the four-track source contract and per-flock assignment", () => {
    const prompt = buildBirdArtworkAgentPrompt()
    expect(prompt).toContain("01_neutral_settle.png")
    expect(prompt).toContain("08_recovery.png")
    expect(prompt).toContain("32 transparent PNGs per identity")
    expect(prompt).toContain("01_landing_approach")
    expect(prompt).toContain("02_perch_settle_hold")
    expect(prompt).toContain("03_launch_flyoff")
    expect(prompt).toContain("Preferred frame size: 1600 px wide")
    expect(prompt).toContain("exact same pixel coordinate")
    expect(prompt).toContain('"up_direction": "canvas_top"')
    expect(prompt).toContain("same bird identity")
    expect(prompt).toContain("MP4, WebM, and MOV are QA or delivery formats")
    expect(prompt).toContain("Do not give Murmur `.py`, `.sh`, `.mp4`, `.webm`")
    expect(prompt).toContain("select Flock 2")
    expect(prompt).toContain("Exact birds control")
  })

  it("ships ten curated identities with exact flight and landing tracks", () => {
    expect(CURATED_BIRD_TEMPLATES).toHaveLength(10)
    for (const template of CURATED_BIRD_TEMPLATES) {
      expect(template.playbackMode).toBe("sequence")
      expect(template.frames).toHaveLength(8)
      expect(template.actionFrames?.approach).toHaveLength(8)
      expect(template.actionFrames?.perch).toHaveLength(8)
      expect(template.actionFrames?.launch).toHaveLength(8)
    }
    expect(BUILTIN_BIRD_TEMPLATE.playbackMode).toBe("sequence")
    expect(BUILTIN_BIRD_TEMPLATE.frames).toHaveLength(32)
    expect(BUILTIN_BIRD_TEMPLATE.actionFrames?.approach).toHaveLength(32)
    expect(BUILTIN_BIRD_TEMPLATE.actionFrames?.perch).toHaveLength(32)
    expect(BUILTIN_BIRD_TEMPLATE.actionFrames?.launch).toHaveLength(32)
  })

  it("validates and normalizes a one-identity ordered-sequence manifest", () => {
    const frames = [
      "01_neutral.png",
      "02_upstroke_1.png",
      "03_upstroke_peak.png",
      "04_upstroke_return.png",
      "05_neutral_return.png",
      "06_downstroke_1.png",
      "07_downstroke_peak.png",
      "08_downstroke_return.png",
    ]
    const parsed = parseBirdArtworkManifest({
      sets: [{
        name: "Candidate 07",
        direction: "leftward",
        canvas: { width: 1600, height: 1085 },
        pivot: { x: 848, y: 716 },
        frames,
      }],
    })
    expect(parsed.name).toBe("Candidate 07")
    expect(parsed.direction).toBe("left")
    expect(parsed.frames).toEqual(frames)
    expect(parsed.normalizedPivot.x).toBeCloseTo(0.53, 8)
    expect(parsed.normalizedPivot.y).toBeCloseTo(716 / 1085, 8)
  })

  it("accepts one full flight, approach, perch, and launch bundle", () => {
    const numbered = (folder: string, label: string) => Array.from(
      { length: 8 },
      (_, index) => `${folder}/${String(index + 1).padStart(2, "0")}_${label}_${index + 1}.png`,
    )
    const parsed = parseBirdArtworkManifest({
      sets: [{
        name: "Hero landing bundle",
        direction: "left",
        canvases: {
          flight: { width: 1600, height: 1085, anchor: { x: 800, y: 542.5 } },
          action: { width: 1500, height: 1200, anchor: { x: 750, y: 600 } },
        },
        tracks: {
          flight: numbered("flight", "flight"),
          approach: numbered("01_landing_approach", "approach"),
          perch: numbered("02_perch_settle_hold", "perch"),
          launch: numbered("03_launch_flyoff", "launch"),
        },
      }],
    })

    expect(parsed.name).toBe("Hero landing bundle")
    expect(parsed.tracks.flight).toHaveLength(8)
    expect(parsed.tracks.approach).toHaveLength(8)
    expect(parsed.tracks.perch).toHaveLength(8)
    expect(parsed.tracks.launch).toHaveLength(8)
    expect(parsed.canvases.flight.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 })
    expect(parsed.canvases.action?.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 })
  })

  it("rejects incomplete landing-action bundles", () => {
    const frames = ["01_pose.png", "02_pose.png"]
    expect(() => parseBirdArtworkManifest({
      sets: [{
        direction: "left",
        canvas: { width: 1600, height: 1085 },
        pivot: { x: 800, y: 542 },
        tracks: { flight: frames, approach: frames },
      }],
    })).toThrow(/approach, perch, and launch together/)
  })

  it("rejects ambiguous manifests before artwork import", () => {
    expect(() => parseBirdArtworkManifest({ sets: [] })).toThrow(/exactly one/)
    expect(() => parseBirdArtworkManifest({
      sets: [{
        direction: "left",
        canvas: { width: 1600, height: 1085 },
        pivot: { x: 1800, y: 716 },
        frames: ["01_neutral.png", "02_upstroke.png"],
      }],
    })).toThrow(/inside the canvas/)
  })

  it("records a per-flock artwork override in the motion brief", () => {
    const project = defaultProject()
    project.sequences[0].birdTemplate = {
      id: "flock-one-art",
      name: "Flock one art",
      kind: "raster",
      frames: ["data:image/png;base64,AAAA"],
    }
    const brief = buildMotionBriefJson(project)
    expect(brief.paths[0].bird_artwork.name).toBe("Flock one art")
  })
})
