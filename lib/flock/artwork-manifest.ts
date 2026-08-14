export type BirdArtworkTrackName = "flight" | "approach" | "perch" | "launch"

export type ParsedArtworkCanvas = {
  width: number
  height: number
  anchor: { x: number; y: number }
  normalizedAnchor: { x: number; y: number }
}

export type ParsedBirdArtworkManifest = {
  name?: string
  direction: "left" | "right"
  // Legacy aliases retained for the original one-track manifest contract.
  canvas: { width: number; height: number }
  pivot: { x: number; y: number }
  normalizedPivot: { x: number; y: number }
  frames: string[]
  tracks: {
    flight: string[]
    approach?: string[]
    perch?: string[]
    launch?: string[]
  }
  canvases: {
    flight: ParsedArtworkCanvas
    action?: ParsedArtworkCanvas
  }
}

function orderedFrames(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 16 || value.some((frame) => typeof frame !== "string")) {
    throw new Error(`${label} must list 2–16 filenames`)
  }
  const frames = value as string[]
  const basenames = frames.map((frame) => frame.replace(/\\/g, "/").split("/").at(-1) ?? frame)
  if (
    new Set(frames).size !== frames.length
    || basenames.some((frame, index) => !new RegExp(`^${String(index + 1).padStart(2, "0")}[_-]`).test(frame))
  ) {
    throw new Error(`${label} must be unique and numbered in order`)
  }
  return frames
}

function parsedCanvas(
  input: unknown,
  fallbackAnchor: unknown,
  label: string,
): ParsedArtworkCanvas {
  const canvas = input && typeof input === "object" ? input as {
    width?: unknown
    height?: unknown
    anchor?: { x?: unknown; y?: unknown }
  } : {}
  const fallback = fallbackAnchor && typeof fallbackAnchor === "object"
    ? fallbackAnchor as { x?: unknown; y?: unknown }
    : {}
  const width = Number(canvas.width)
  const height = Number(canvas.height)
  const anchorX = Number(canvas.anchor?.x ?? fallback.x)
  const anchorY = Number(canvas.anchor?.y ?? fallback.y)
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`${label} width and height must be positive integers`)
  }
  if (
    !Number.isFinite(anchorX)
    || !Number.isFinite(anchorY)
    || anchorX < 0
    || anchorX > width
    || anchorY < 0
    || anchorY > height
  ) {
    throw new Error(`${label} anchor must be inside the canvas`)
  }
  return {
    width,
    height,
    anchor: { x: anchorX, y: anchorY },
    normalizedAnchor: { x: anchorX / width, y: anchorY / height },
  }
}

export function parseBirdArtworkManifest(input: unknown): ParsedBirdArtworkManifest {
  if (!input || typeof input !== "object") throw new Error("manifest must be an object")
  const sets = (input as { sets?: unknown }).sets
  if (!Array.isArray(sets) || sets.length !== 1 || !sets[0] || typeof sets[0] !== "object") {
    throw new Error("manifest must contain exactly one artwork set")
  }
  const set = sets[0] as {
    name?: unknown
    direction?: unknown
    canvas?: { width?: unknown; height?: unknown }
    pivot?: { x?: unknown; y?: unknown }
    canvases?: {
      flight?: unknown
      action?: unknown
    }
    frames?: unknown
    tracks?: {
      flight?: unknown
      approach?: unknown
      perch?: unknown
      launch?: unknown
    }
  }

  const directionValue = String(set.direction ?? "").toLowerCase()
  const direction = directionValue.startsWith("right")
    ? "right"
    : directionValue.startsWith("left")
      ? "left"
      : null
  if (!direction) throw new Error("manifest direction must be left or right")

  const tracks = set.tracks && typeof set.tracks === "object"
    ? {
        flight: orderedFrames(set.tracks.flight, "manifest flight frames"),
        approach: set.tracks.approach == null ? undefined : orderedFrames(set.tracks.approach, "manifest approach frames"),
        perch: set.tracks.perch == null ? undefined : orderedFrames(set.tracks.perch, "manifest perch frames"),
        launch: set.tracks.launch == null ? undefined : orderedFrames(set.tracks.launch, "manifest launch frames"),
      }
    : {
        flight: orderedFrames(set.frames, "manifest frames"),
        approach: undefined,
        perch: undefined,
        launch: undefined,
      }

  const actionTracks = [tracks.approach, tracks.perch, tracks.launch]
  if (actionTracks.some(Boolean) && !actionTracks.every(Boolean)) {
    throw new Error("manifest action tracks must include approach, perch, and launch together")
  }

  const flightCanvas = parsedCanvas(
    set.canvases?.flight ?? set.canvas,
    set.canvases?.flight && typeof set.canvases.flight === "object"
      ? (set.canvases.flight as { anchor?: unknown }).anchor
      : set.pivot,
    "manifest flight canvas",
  )
  const actionCanvas = actionTracks.every(Boolean)
    ? parsedCanvas(
        set.canvases?.action ?? set.canvases?.flight ?? set.canvas,
        set.canvases?.action && typeof set.canvases.action === "object"
          ? (set.canvases.action as { anchor?: unknown }).anchor
          : set.pivot,
        "manifest action canvas",
      )
    : undefined

  return {
    name: typeof set.name === "string" && set.name.trim() ? set.name.trim() : undefined,
    direction,
    canvas: { width: flightCanvas.width, height: flightCanvas.height },
    pivot: flightCanvas.anchor,
    normalizedPivot: flightCanvas.normalizedAnchor,
    frames: tracks.flight,
    tracks,
    canvases: { flight: flightCanvas, action: actionCanvas },
  }
}
