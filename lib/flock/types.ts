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

export const DEPTH_DIRECTIONS = [
  "Flat plane",
  "Background to foreground",
  "Foreground to background",
] as const
export type DepthDirection = (typeof DEPTH_DIRECTIONS)[number]

export type LandingZone = { x: number; y: number; w: number; h: number }

export type Sequence = {
  id: string
  name: string
  treatment: Treatment
  density: Density
  birdCount: number
  wingIntensity: WingIntensity
  entry: Entry
  exit: Exit
  points: Point[]
  landing: LandingZone | null
  arrivalMode: ArrivalMode
  perchCount: number
  gatherCount: number
  dwellSeconds: number
  durationSeconds: number
  loopPath: boolean
  speedMultiplier: number
  sizeScale: number
  spacingScale: number
  foregroundBirdCount: number
  foregroundBoost: number
  depthDirection: DepthDirection
  depthStrength: number
  seed: number
  notes: string
  color: string
  // Optional per-flock override. When absent, the project-level artist set is used.
  birdTemplate?: BirdTemplate
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
  framesPerVariant?: number
  direction?: "left" | "right"
  // Ordered source-library playback is canonical. The continuous rig remains
  // available only as a fallback for a single centered still.
  playbackMode?: "sequence" | "continuous-rig"
  actionFrames?: {
    approach: string[]
    perch: string[]
    launch: string[]
  }
  // Normalized center-notch pivot for the single-still fallback rig. Ordered
  // source sequences do not need or use a runtime deformation pivot.
  wingPivot?: Point
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

const CURATED_FLIGHT_FRAMES = [
  "01_neutral_settle.png",
  "02_upstroke_lift.png",
  "03_upstroke_peak.png",
  "04_upstroke_return.png",
  "05_level_glide.png",
  "06_downstroke_drive.png",
  "07_downstroke_peak.png",
  "08_recovery.png",
]

const CURATED_APPROACH_FRAMES = [
  "01_approach_glide.png",
  "02_brake_lift.png",
  "03_brake_peak.png",
  "04_brake_release.png",
  "05_contact_lower.png",
  "06_touchdown.png",
  "07_settle_fold.png",
  "08_perch_ready.png",
]

const CURATED_PERCH_FRAMES = [
  "01_perch_contact.png",
  "02_wing_fold.png",
  "03_settle_1.png",
  "04_settle_2.png",
  "05_hold_1.png",
  "06_micro_lift.png",
  "07_hold_2.png",
  "08_ready_launch.png",
]

const CURATED_LAUNCH_FRAMES = [
  "01_crouch_ready.png",
  "02_release_lift.png",
  "03_launch_drive.png",
  "04_launch_peak.png",
  "05_clear_perch.png",
  "06_flyoff_glide.png",
  "07_flyoff_drive.png",
  "08_depart_recovery.png",
]

export const CURATED_VARIANT_IDS = [
  "c_hero_glide",
  "c_hero_climb",
  "c_hero_dive",
  "a_support_glide",
  "a_support_lift",
  "a_support_drop",
  "b_flock_glide",
  "b_flock_lift",
  "b_flock_drop",
  "d_distant_glide",
] as const

const CURATED_VARIANT_LABELS: Record<(typeof CURATED_VARIANT_IDS)[number], string> = {
  c_hero_glide: "Hero · wide glide",
  c_hero_climb: "Hero · climbing bank",
  c_hero_dive: "Hero · diving bank",
  a_support_glide: "Support A · glide",
  a_support_lift: "Support A · lift",
  a_support_drop: "Support A · drop",
  b_flock_glide: "Flock B · glide",
  b_flock_lift: "Flock B · lift",
  b_flock_drop: "Flock B · drop",
  d_distant_glide: "Distant D · glide",
}

function curatedPaths(variant: string, track: "flight" | "approach" | "perch" | "launch", filenames: string[]) {
  return filenames.map((frame) => `/artist-birds/curated/${variant}/${track}/${frame}`)
}

function curatedVariantTemplate(id: (typeof CURATED_VARIANT_IDS)[number]): BirdTemplate {
  return {
    id: `curated-${id}-v1`,
    name: CURATED_VARIANT_LABELS[id],
    kind: "builtin",
    direction: "left",
    playbackMode: "sequence",
    previewDataUrl: curatedPaths(id, "flight", CURATED_FLIGHT_FRAMES)[0],
    framesPerVariant: 8,
    frames: curatedPaths(id, "flight", CURATED_FLIGHT_FRAMES),
    actionFrames: {
      approach: curatedPaths(id, "approach", CURATED_APPROACH_FRAMES),
      perch: curatedPaths(id, "perch", CURATED_PERCH_FRAMES),
      launch: curatedPaths(id, "launch", CURATED_LAUNCH_FRAMES),
    },
  }
}

export const CURATED_BIRD_TEMPLATES = CURATED_VARIANT_IDS.map(curatedVariantTemplate)

const DEFAULT_ROLE_VARIANTS = ["c_hero_glide", "a_support_glide", "b_flock_glide", "d_distant_glide"] as const

export const BUILTIN_BIRD_TEMPLATE: BirdTemplate = {
  id: "builtin-curated-source-library-v2",
  name: "Curated artist source library · four roles",
  kind: "builtin",
  direction: "left",
  playbackMode: "sequence",
  previewDataUrl: curatedPaths("c_hero_glide", "flight", CURATED_FLIGHT_FRAMES)[0],
  framesPerVariant: CURATED_FLIGHT_FRAMES.length,
  frames: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "flight", CURATED_FLIGHT_FRAMES)),
  actionFrames: {
    approach: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "approach", CURATED_APPROACH_FRAMES)),
    perch: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "perch", CURATED_PERCH_FRAMES)),
    launch: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "launch", CURATED_LAUNCH_FRAMES)),
  },
}

export const DENSITY_COUNT: Record<Density, number> = {
  Sparse: 9,
  Medium: 22,
  Dense: 44,
  Murmuration: 90,
}

export const WING_RATE: Record<WingIntensity, number> = {
  // Eight canonical source frames should display at roughly 6, 8, or 10 fps.
  // The engine multiplies these values by 0.16 to obtain cycles/second.
  Soft: 4.6875,
  Medium: 6.25,
  Strong: 7.8125,
}
