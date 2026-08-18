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
  // Ordered landing stops. The singular field remains for projects saved by
  // older Murmur releases and is migrated into this array on load.
  landings: LandingZone[]
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
  lightColor: string
  darkColor: string
  color: string
  // Optional per-flock override. When absent, the project-level artist set is used.
  birdTemplate?: BirdTemplate
}

export type Style = {
  inkColor: string
  transparentBackground: boolean
  backgroundColor: string
  darkBackgroundColor: string
  previewTheme: "light" | "dark"
}

export type SceneSource =
  | { kind: "none" }
  | { kind: "image"; dataUrl: string; name: string }
  | { kind: "html"; html: string; css: string; name: string }
  | { kind: "url"; url: string; name: string }

export type BirdTemplate = {
  id: string
  name: string
  description?: string
  kind: "builtin" | "svg" | "raster" | "sprites"
  previewDataUrl?: string
  frames: string[]
  framesPerVariant?: number
  // Physical authored-cycle rates in cycles per second. These remain stable
  // when a source sequence gains or loses in-between poses.
  cycleHz?: Partial<Record<WingIntensity, number>>
  samplingPolicy?:
    | {
        mode: "chronological"
        minFps: number
      }
    | {
        // The source poses are authored motion-blur/shimmer samples of motion
        // that is physically much faster than the delivery frame rate.
        mode: "motion-blur-shimmer"
        minFps: number
        displayCycleHz: Partial<Record<WingIntensity, number>>
      }
    | {
        // Several chronological wing poses can cross one delivery-frame
        // shutter. Composite those poses instead of dropping them or silently
        // slowing the animal to the output frame rate.
        mode: "temporal-blur"
        minFps: number
        shutterFraction: number
        displayCycleHz: Partial<Record<WingIntensity, number>>
      }
  flightRhythm?: {
    mode: "continuous" | "flap-glide"
    flapCycles?: number
    glideSeconds?: number
    glidePhase?: number
  }
  // Legacy relative cadence retained for imported and previously saved
  // templates that predate cycleHz.
  motionRateMultiplier?: number
  // Legacy sampling hint retained for saved-project compatibility. New
  // packaged templates are authored with cycleHz values that satisfy the
  // supported delivery rates directly.
  maxPoseChangesPerSecond?: number
  // Stationary hover/alight artwork may use a different cadence from flight.
  dwellCyclesPerSecond?: number
  // Hummingbirds dwell in a continuous hover instead of freezing on a perch.
  perchPlayback?: "once" | "loop"
  landingBehavior?: "perch" | "alight" | "hover" | "inverted-roost" | "none"
  direction?: "left" | "right"
  // Side profiles mirror and pitch with travel; follow-path artwork rotates
  // its authored forward axis directly onto the route tangent.
  orientationMode?: "side-profile" | "follow-path" | "screen-upright"
  sourceHeadingRadians?: number
  trackAnchors?: Partial<Record<"flight" | "approach" | "perch" | "launch", Point>>
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
  activeVariant: OutputVariantId
  variantStates: Partial<Record<OutputVariantId, OutputVariantState>>
  // Legacy field retained so old saved projects migrate without data loss.
  backdropDataUrl: string | null
  scene: SceneSource
  birdTemplate: BirdTemplate
  sequences: Sequence[]
  style: Style
  fps: number
}

export type OutputVariantId = "desktop" | "tablet" | "mobile"

export type OutputVariantState = {
  viewport: { width: number; height: number }
  sequences: Sequence[]
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

const CLEAN_ALPHA_GULL_FLIGHT_FRAMES = [
  "01_level_glide.png",
  "02_glide_feather_adjust.png",
  "03_shallow_dihedral_glide.png",
  "04_transition_lift.png",
  "05_quarter_upstroke.png",
  "06_half_upstroke.png",
  "07_three_quarter_upstroke.png",
  "08_upstroke_peak.png",
  "09_peak_release.png",
  "10_quarter_downstroke.png",
  "11_half_downstroke.png",
  "12_three_quarter_downstroke.png",
  "13_full_downstroke.png",
  "14_recovery_to_level.png",
  "15_shallow_glide_return.png",
  "16_level_glide_loop.png",
]

const SWALLOW_FLIGHT_FRAMES = [
  "01_swallow_rig_flight.png", "02_swallow_rig_flight.png", "03_swallow_rig_flight.png",
  "04_swallow_rig_flight.png", "05_swallow_rig_flight.png", "06_swallow_rig_flight.png",
  "07_swallow_rig_flight.png",
]

const CROW_FLIGHT_FRAMES = [
  "01_crow_rig_flight.png", "02_crow_rig_flight.png", "03_crow_rig_flight.png", "04_crow_rig_flight.png",
  "05_crow_rig_flight.png", "06_crow_rig_flight.png", "07_crow_rig_flight.png", "08_crow_rig_flight.png",
  "09_crow_rig_flight.png", "10_crow_rig_flight.png", "11_crow_rig_flight.png", "12_crow_rig_flight.png",
]

const PIGEON_FLIGHT_FRAMES = [
  "01_pigeon_rig_flight.png", "02_pigeon_rig_flight.png", "03_pigeon_rig_flight.png",
  "04_pigeon_rig_flight.png", "05_pigeon_rig_flight.png", "06_pigeon_rig_flight.png",
  "07_pigeon_rig_flight.png", "08_pigeon_rig_flight.png", "09_pigeon_rig_flight.png",
  "10_pigeon_rig_flight.png",
]

const packagedActionFrames = (track: "approach" | "perch" | "launch") =>
  Array.from({ length: 15 }, (_, index) => `${String(index + 1).padStart(2, "0")}_${track}.png`)

const SWALLOW_APPROACH_FRAMES = packagedActionFrames("approach")
const SWALLOW_PERCH_FRAMES = packagedActionFrames("perch")
const SWALLOW_LAUNCH_FRAMES = packagedActionFrames("launch")

const BUTTERFLY_FLIGHT_FRAMES = [
  "01_butterfly_rig_flight.png", "02_butterfly_rig_flight.png", "03_butterfly_rig_flight.png",
  "04_butterfly_rig_flight.png", "05_butterfly_rig_flight.png", "06_butterfly_rig_flight.png",
]

const BUTTERFLY_APPROACH_FRAMES = packagedActionFrames("approach")
const BUTTERFLY_PERCH_FRAMES = packagedActionFrames("perch")
const BUTTERFLY_LAUNCH_FRAMES = packagedActionFrames("launch")

const BAT_FLIGHT_FRAMES = [
  "01_bat_rig_flight.png", "02_bat_rig_flight.png", "03_bat_rig_flight.png",
  "04_bat_rig_flight.png", "05_bat_rig_flight.png", "06_bat_rig_flight.png",
]

const BAT_APPROACH_FRAMES = packagedActionFrames("approach")
const BAT_PERCH_FRAMES = packagedActionFrames("perch")
const BAT_LAUNCH_FRAMES = packagedActionFrames("launch")

const HUMMINGBIRD_FLIGHT_FRAMES = [
  "01_hummingbird_rig_flight.png", "02_hummingbird_rig_flight.png",
  "03_hummingbird_rig_flight.png", "04_hummingbird_rig_flight.png",
]

const HUMMINGBIRD_APPROACH_FRAMES = packagedActionFrames("approach")
const HUMMINGBIRD_PERCH_FRAMES = packagedActionFrames("perch")
const HUMMINGBIRD_LAUNCH_FRAMES = packagedActionFrames("launch")

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
  name: "Calm editorial flock",
  description: "Minimal open-line birds with automatic hero, support, flock, and distant roles.",
  kind: "builtin",
  direction: "left",
  playbackMode: "sequence",
  cycleHz: { Soft: 0.75, Medium: 1, Strong: 1.25 },
  samplingPolicy: { mode: "chronological", minFps: 24 },
  previewDataUrl: curatedPaths("c_hero_glide", "flight", CURATED_FLIGHT_FRAMES)[0],
  framesPerVariant: CURATED_FLIGHT_FRAMES.length,
  frames: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "flight", CURATED_FLIGHT_FRAMES)),
  actionFrames: {
    approach: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "approach", CURATED_APPROACH_FRAMES)),
    perch: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "perch", CURATED_PERCH_FRAMES)),
    launch: DEFAULT_ROLE_VARIANTS.flatMap((variant) => curatedPaths(variant, "launch", CURATED_LAUNCH_FRAMES)),
  },
}

function naturalGullPaths(track: "flight" | "approach" | "perch" | "launch", filenames: string[]) {
  return filenames.map((frame) => `/artist-birds/natural-gull-clean-alpha/${track}/${frame}`)
}

export const NATURAL_GULL_TEMPLATE: BirdTemplate = {
  id: "clean-alpha-smooth-gliding-gull-v3",
  name: "Clean-alpha gliding gull",
  description: "True-transparent, one-color gull with a smooth 16-frame flight cycle and matched landing motion.",
  // Packaged one-color artwork is an alpha mask. The renderer replaces its
  // canonical source blue with the operator-selected flock color.
  kind: "builtin",
  direction: "left",
  playbackMode: "sequence",
  cycleHz: { Soft: 0.75, Medium: 1, Strong: 1.25 },
  samplingPolicy: { mode: "chronological", minFps: 24 },
  previewDataUrl: "/artist-birds/natural-gull-clean-alpha/preview.png",
  framesPerVariant: CLEAN_ALPHA_GULL_FLIGHT_FRAMES.length,
  frames: naturalGullPaths("flight", CLEAN_ALPHA_GULL_FLIGHT_FRAMES),
  actionFrames: {
    approach: naturalGullPaths("approach", CURATED_APPROACH_FRAMES),
    perch: naturalGullPaths("perch", CURATED_PERCH_FRAMES),
    launch: naturalGullPaths("launch", CURATED_LAUNCH_FRAMES),
  },
}

function packagedAnimalPaths(slug: string, track: "flight" | "approach" | "perch" | "launch", filenames: string[]) {
  return filenames.map((frame) => `/artist-birds/${slug}/${track}/${frame}`)
}

export const NATURAL_SWALLOW_TEMPLATE: BirdTemplate = {
  id: "natural-engraved-swallow-v1",
  name: "Natural engraved swallow",
  description: "Fast, aerodynamic fork-tailed swallow with a body-locked layered flight cycle and implied-wire landing motion.",
  kind: "builtin",
  direction: "right",
  playbackMode: "sequence",
  cycleHz: { Soft: 7, Medium: 8, Strong: 9 },
  samplingPolicy: { mode: "temporal-blur", minFps: 30, shutterFraction: 0.72, displayCycleHz: { Soft: 2.5, Medium: 3.2, Strong: 4 } },
  flightRhythm: { mode: "flap-glide", flapCycles: 2, glideSeconds: 0.62, glidePhase: 0 },
  landingBehavior: "perch",
  orientationMode: "side-profile",
  trackAnchors: {
    flight: { x: 0.5, y: 501 / 1200 },
    approach: { x: 801 / 1600, y: 750 / 1200 },
    perch: { x: 801 / 1600, y: 750 / 1200 },
    launch: { x: 801 / 1600, y: 750 / 1200 },
  },
  previewDataUrl: "/artist-birds/natural-swallow/preview.png",
  framesPerVariant: SWALLOW_FLIGHT_FRAMES.length,
  frames: packagedAnimalPaths("natural-swallow", "flight", SWALLOW_FLIGHT_FRAMES),
  actionFrames: {
    approach: packagedAnimalPaths("natural-swallow", "approach", SWALLOW_APPROACH_FRAMES),
    perch: packagedAnimalPaths("natural-swallow", "perch", SWALLOW_PERCH_FRAMES),
    launch: packagedAnimalPaths("natural-swallow", "launch", SWALLOW_LAUNCH_FRAMES),
  },
}

export const NATURAL_CROW_TEMPLATE: BirdTemplate = {
  id: "natural-engraved-crow-v1",
  name: "Natural engraved crow",
  description: "Broad-winged crow with weighty flapping, braking flare, grounded settle, and launch motion.",
  kind: "builtin",
  direction: "right",
  playbackMode: "sequence",
  cycleHz: { Soft: 4, Medium: 4.5, Strong: 5 },
  samplingPolicy: { mode: "temporal-blur", minFps: 30, shutterFraction: 0.62, displayCycleHz: { Soft: 1.6, Medium: 2, Strong: 2.5 } },
  flightRhythm: { mode: "flap-glide", flapCycles: 3, glideSeconds: 0.42, glidePhase: 0 },
  landingBehavior: "perch",
  orientationMode: "side-profile",
  trackAnchors: {
    flight: { x: 0.5, y: 501 / 1200 },
    approach: { x: 801 / 1600, y: 750 / 1200 },
    perch: { x: 801 / 1600, y: 750 / 1200 },
    launch: { x: 801 / 1600, y: 750 / 1200 },
  },
  previewDataUrl: "/artist-birds/natural-crow/preview.png",
  framesPerVariant: CROW_FLIGHT_FRAMES.length,
  frames: packagedAnimalPaths("natural-crow", "flight", CROW_FLIGHT_FRAMES),
  actionFrames: {
    approach: packagedAnimalPaths("natural-crow", "approach", SWALLOW_APPROACH_FRAMES),
    perch: packagedAnimalPaths("natural-crow", "perch", SWALLOW_PERCH_FRAMES),
    launch: packagedAnimalPaths("natural-crow", "launch", SWALLOW_LAUNCH_FRAMES),
  },
}

export const NATURAL_PIGEON_TEMPLATE: BirdTemplate = {
  id: "natural-engraved-pigeon-v1",
  name: "Natural engraved pigeon",
  description: "Compact pigeon with quick wingbeats, tail braking, grounded settle, and explosive departure.",
  kind: "builtin",
  direction: "right",
  playbackMode: "sequence",
  cycleHz: { Soft: 5, Medium: 6, Strong: 7 },
  samplingPolicy: { mode: "temporal-blur", minFps: 30, shutterFraction: 0.66, displayCycleHz: { Soft: 2, Medium: 2.6, Strong: 3.2 } },
  flightRhythm: { mode: "flap-glide", flapCycles: 5, glideSeconds: 0.18, glidePhase: 0 },
  landingBehavior: "perch",
  orientationMode: "side-profile",
  trackAnchors: {
    flight: { x: 0.5, y: 501 / 1200 },
    approach: { x: 801 / 1600, y: 750 / 1200 },
    perch: { x: 801 / 1600, y: 750 / 1200 },
    launch: { x: 801 / 1600, y: 750 / 1200 },
  },
  previewDataUrl: "/artist-birds/natural-pigeon/preview.png",
  framesPerVariant: PIGEON_FLIGHT_FRAMES.length,
  frames: packagedAnimalPaths("natural-pigeon", "flight", PIGEON_FLIGHT_FRAMES),
  actionFrames: {
    approach: packagedAnimalPaths("natural-pigeon", "approach", SWALLOW_APPROACH_FRAMES),
    perch: packagedAnimalPaths("natural-pigeon", "perch", SWALLOW_PERCH_FRAMES),
    launch: packagedAnimalPaths("natural-pigeon", "launch", SWALLOW_LAUNCH_FRAMES),
  },
}

export const NATURAL_BUTTERFLY_TEMPLATE: BirdTemplate = {
  id: "natural-engraved-butterfly-v1",
  name: "Natural engraved butterfly",
  description: "Four-wing butterfly flutter with a soft alight, closed-wing settle, and relaunch.",
  kind: "builtin",
  direction: "right",
  playbackMode: "sequence",
  cycleHz: { Soft: 8, Medium: 10, Strong: 12 },
  samplingPolicy: { mode: "temporal-blur", minFps: 30, shutterFraction: 0.82, displayCycleHz: { Soft: 3, Medium: 4, Strong: 5 } },
  flightRhythm: { mode: "continuous" },
  landingBehavior: "alight",
  orientationMode: "side-profile",
  trackAnchors: {
    flight: { x: 0.5, y: 501 / 1200 },
    approach: { x: 801 / 1600, y: 750 / 1200 },
    perch: { x: 801 / 1600, y: 750 / 1200 },
    launch: { x: 801 / 1600, y: 750 / 1200 },
  },
  previewDataUrl: "/artist-birds/natural-butterfly/preview.png",
  framesPerVariant: BUTTERFLY_FLIGHT_FRAMES.length,
  frames: packagedAnimalPaths("natural-butterfly", "flight", BUTTERFLY_FLIGHT_FRAMES),
  actionFrames: {
    approach: packagedAnimalPaths("natural-butterfly", "approach", BUTTERFLY_APPROACH_FRAMES),
    perch: packagedAnimalPaths("natural-butterfly", "perch", BUTTERFLY_PERCH_FRAMES),
    launch: packagedAnimalPaths("natural-butterfly", "launch", BUTTERFLY_LAUNCH_FRAMES),
  },
}

export const NATURAL_BAT_TEMPLATE: BirdTemplate = {
  id: "natural-engraved-bat-v1",
  name: "Natural engraved bat",
  description: "Membranous bat flight with feet-up braking, inverted roost, and drop-launch motion.",
  kind: "builtin",
  direction: "right",
  playbackMode: "sequence",
  cycleHz: { Soft: 8, Medium: 10, Strong: 12 },
  samplingPolicy: { mode: "temporal-blur", minFps: 30, shutterFraction: 0.78, displayCycleHz: { Soft: 2.5, Medium: 3.3, Strong: 4.2 } },
  flightRhythm: { mode: "continuous" },
  landingBehavior: "inverted-roost",
  orientationMode: "side-profile",
  trackAnchors: {
    flight: { x: 0.5, y: 501 / 1200 },
    approach: { x: 801 / 1600, y: 450 / 1200 },
    perch: { x: 801 / 1600, y: 450 / 1200 },
    launch: { x: 801 / 1600, y: 450 / 1200 },
  },
  previewDataUrl: "/artist-birds/natural-bat/preview.png",
  framesPerVariant: BAT_FLIGHT_FRAMES.length,
  frames: packagedAnimalPaths("natural-bat", "flight", BAT_FLIGHT_FRAMES),
  actionFrames: {
    approach: packagedAnimalPaths("natural-bat", "approach", BAT_APPROACH_FRAMES),
    perch: packagedAnimalPaths("natural-bat", "perch", BAT_PERCH_FRAMES),
    launch: packagedAnimalPaths("natural-bat", "launch", BAT_LAUNCH_FRAMES),
  },
}

export const NATURAL_HUMMINGBIRD_TEMPLATE: BirdTemplate = {
  id: "natural-engraved-hummingbird-v1",
  name: "Natural engraved hummingbird",
  description: "Rapid figure-eight wing motion with braking hover, looping dwell, and forward acceleration.",
  kind: "builtin",
  direction: "right",
  playbackMode: "sequence",
  cycleHz: { Soft: 40, Medium: 50, Strong: 60 },
  samplingPolicy: {
    mode: "motion-blur-shimmer",
    minFps: 30,
    displayCycleHz: { Soft: 1.8, Medium: 2.1, Strong: 2.4 },
  },
  dwellCyclesPerSecond: 3,
  landingBehavior: "hover",
  orientationMode: "side-profile",
  perchPlayback: "loop",
  trackAnchors: {
    flight: { x: 0.5, y: 501 / 1200 },
    approach: { x: 0.5, y: 620 / 1200 },
    perch: { x: 0.5, y: 620 / 1200 },
    launch: { x: 0.5, y: 620 / 1200 },
  },
  previewDataUrl: "/artist-birds/natural-hummingbird/preview.png",
  framesPerVariant: HUMMINGBIRD_FLIGHT_FRAMES.length,
  frames: packagedAnimalPaths("natural-hummingbird", "flight", HUMMINGBIRD_FLIGHT_FRAMES),
  actionFrames: {
    approach: packagedAnimalPaths("natural-hummingbird", "approach", HUMMINGBIRD_APPROACH_FRAMES),
    perch: packagedAnimalPaths("natural-hummingbird", "perch", HUMMINGBIRD_PERCH_FRAMES),
    launch: packagedAnimalPaths("natural-hummingbird", "launch", HUMMINGBIRD_LAUNCH_FRAMES),
  },
}

// Keep the normal artwork workflow identity-first. Role-specific curated
// templates remain internal building blocks, not operator-facing designs.
export const BUILTIN_ARTWORK_OPTIONS = [
  BUILTIN_BIRD_TEMPLATE,
  NATURAL_GULL_TEMPLATE,
  NATURAL_SWALLOW_TEMPLATE,
  NATURAL_CROW_TEMPLATE,
  NATURAL_PIGEON_TEMPLATE,
  NATURAL_BUTTERFLY_TEMPLATE,
  NATURAL_BAT_TEMPLATE,
  NATURAL_HUMMINGBIRD_TEMPLATE,
]

export function refreshPackagedArtworkTemplate(
  template: BirdTemplate | undefined,
  fallback: BirdTemplate = BUILTIN_BIRD_TEMPLATE,
) {
  if (template?.id === "builtin-natural-outlined-gull-v1") return NATURAL_GULL_TEMPLATE
  if (template?.id === "natural-outlined-gull-detailed-v2") return NATURAL_GULL_TEMPLATE
  const packaged = BUILTIN_ARTWORK_OPTIONS.find((option) => option.id === template?.id)
  if (packaged) return packaged
  if (template?.kind === "builtin") return BUILTIN_BIRD_TEMPLATE
  return template ?? fallback
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
