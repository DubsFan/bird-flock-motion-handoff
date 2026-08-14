// Shared types for the Bird Flock Video Builder.
// Coordinates in the brief are normalized (0..1) relative to the backdrop.

export type Point = { x: number; y: number }

export const TREATMENTS = [
  "Calm Glide",
  "Symmetric Murmuration",
  "Dive and Pullout",
  "Curl and Release",
  "Ribbon Wave",
  "Split and Rejoin",
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

export const EXITS = [
  "Pull upward",
  "Exit right",
  "Exit left",
  "Drift down",
  "Scatter",
] as const
export type Exit = (typeof EXITS)[number]

// A landing zone is a rectangle (normalized) the flock gathers over and dwells.
export type LandingZone = {
  x: number
  y: number
  w: number
  h: number
}

// A single choreographed flock flight.
export type Sequence = {
  id: string
  name: string
  treatment: Treatment
  density: Density
  wingIntensity: WingIntensity
  entry: Entry
  exit: Exit
  // Normalized control points defining the travel spline.
  points: Point[]
  // Optional landing zone the flock settles over mid-flight.
  landing: LandingZone | null
  // Seconds the flock holds/orbits at the landing zone.
  dwellSeconds: number
  // Total sequence duration in seconds.
  durationSeconds: number
  // Deterministic seed so playback + export match exactly.
  seed: number
  notes: string
  color: string
}

export type Style = {
  inkColor: string
  transparentBackground: boolean
  backgroundColor: string
}

export type Project = {
  name: string
  viewport: { width: number; height: number }
  backdropDataUrl: string | null
  sequences: Sequence[]
  style: Style
  fps: number
}

export const DENSITY_COUNT: Record<Density, number> = {
  Sparse: 9,
  Medium: 22,
  Dense: 44,
  Murmuration: 90,
}

// Wing flap speed multiplier + stroke weight influence.
export const WING_RATE: Record<WingIntensity, number> = {
  Soft: 6.5,
  Medium: 9,
  Strong: 12.5,
}
