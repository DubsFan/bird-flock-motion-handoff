// Shared types for the Bird Flock Video Builder.
// Coordinates are normalized (0..1) relative to the stage.

export type Point = { x: number; y: number }

export const TREATMENTS = [
  "Calm Glide",
  "Symmetric Murmuration",
  "Dive and Pullout",
  "Curl and Release",
  "Ribbon Wave",
  "Split and Rejoin",
  "Waterfall Bloom",
  "Vortex Pull",
] as const
export type Treatment = (typeof TREATMENTS)[number]

export const DENSITIES = ["Sparse", "Medium", "Dense", "Murmuration"] as const
export type Density = (typeof DENSITIES)[number]

export const WING_INTENSITIES = ["Soft", "Medium", "Strong"] as const
export type WingIntensity = (typeof WING_INTENSITIES)[number]

export const ENTRIES = [
  "Enter from right",
  "Enter from left",
  "Enter from top",
  "Enter from bottom",
] as const
export type Entry = (typeof ENTRIES)[number]

export const EXITS = ["Pull upward", "Exit right", "Exit left", "Drift down", "Scatter"] as const
export type Exit = (typeof EXITS)[number]

export const ARRIVAL_MODES = ["Fly through", "Perch", "Gather"] as const
export type ArrivalMode = (typeof ARRIVAL_MODES)[number]

export type LandingZone = { x: number; y: number; w: number; h: number }

export type Sequence = {
  id: string
  name: string
  treatment: Treatment
  density: Density
  wingIntensity: WingIntensity
  entry: Entry
  exit: Exit
  points: Point[]
  landing: LandingZone | null
  arrivalMode: ArrivalMode
  dwellSeconds: number
  durationSeconds: number
  seed: number
  notes: string
  color: string
}

export type Style = {
  inkColor: string
  transparentBackground: boolean
  backgroundColor: string
}

export type SceneSource =
  | { kind: "none" }
  | { kind: "image"; dataUrl: string; name: string }
  | { kind: "html"; html: string; css: string; name: string }
  | { kind: "url"; url: string; name: string }

export type BirdTemplate = {
  id: string
  name: string
  kind: "builtin" | "svg" | "raster" | "sprites"
  previewDataUrl?: string
  frames: string[]
}

export type Project = {
  name: string
  viewport: { width: number; height: number }
  // Legacy field retained so old saved projects migrate without data loss.
  backdropDataUrl: string | null
  scene: SceneSource
  birdTemplate: BirdTemplate
  sequences: Sequence[]
  style: Style
  fps: number
}

export const BUILTIN_BIRD_TEMPLATE: BirdTemplate = {
  id: "builtin-ink-bird",
  name: "Ink bird",
  kind: "builtin",
  frames: [],
}

export const DENSITY_COUNT: Record<Density, number> = {
  Sparse: 9,
  Medium: 22,
  Dense: 44,
  Murmuration: 90,
}

export const WING_RATE: Record<WingIntensity, number> = {
  Soft: 6.5,
  Medium: 9,
  Strong: 12.5,
}
