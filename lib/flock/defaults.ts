import { BUILTIN_BIRD_TEMPLATE, type Project, type Sequence, type Treatment } from "./types"

export function uid(prefix = "seq"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}

export const FLOCK_INK = "#043a78"

// Treatment starter presets: sensible path shape + parameters per treatment.
export const TREATMENT_PRESETS: Record<
  Treatment,
  Pick<Sequence, "density" | "wingIntensity" | "entry" | "exit" | "dwellSeconds" | "durationSeconds"> & {
    points: { x: number; y: number }[]
  }
> = {
  "Calm Glide": {
    density: "Medium",
    // Eight authored poses at the natural 8 fps baseline. "Soft" remains
    // available for a slower 6 fps glide, but should not be the default when
    // the acceptance issue is visibly under-moving wings.
    wingIntensity: "Medium",
    entry: "Enter from right",
    exit: "Exit left",
    dwellSeconds: 0,
    durationSeconds: 10,
    points: [
      { x: 0.92, y: 0.28 },
      { x: 0.7, y: 0.36 },
      { x: 0.46, y: 0.48 },
      { x: 0.2, y: 0.38 },
    ],
  },
  "Symmetric Murmuration": {
    density: "Murmuration",
    wingIntensity: "Medium",
    entry: "Enter from right",
    exit: "Pull upward",
    dwellSeconds: 3,
    durationSeconds: 11,
    points: [
      { x: 0.92, y: 0.28 },
      { x: 0.66, y: 0.46 },
      { x: 0.42, y: 0.5 },
      { x: 0.22, y: 0.36 },
    ],
  },
  "Dive and Pullout": {
    density: "Dense",
    wingIntensity: "Strong",
    entry: "Enter from right",
    exit: "Pull upward",
    dwellSeconds: 1.5,
    durationSeconds: 10,
    points: [
      { x: 0.95, y: 0.18 },
      { x: 0.72, y: 0.32 },
      { x: 0.54, y: 0.7 },
      { x: 0.32, y: 0.56 },
      { x: 0.14, y: 0.2 },
    ],
  },
  "Curl and Release": {
    density: "Dense",
    wingIntensity: "Medium",
    entry: "Enter from bottom",
    exit: "Scatter",
    dwellSeconds: 3.5,
    durationSeconds: 11,
    points: [
      { x: 0.2, y: 0.85 },
      { x: 0.4, y: 0.55 },
      { x: 0.58, y: 0.42 },
      { x: 0.74, y: 0.5 },
    ],
  },
  "Ribbon Wave": {
    density: "Medium",
    wingIntensity: "Medium",
    entry: "Enter from left",
    exit: "Exit right",
    dwellSeconds: 0,
    durationSeconds: 9,
    points: [
      { x: 0.06, y: 0.5 },
      { x: 0.34, y: 0.44 },
      { x: 0.64, y: 0.56 },
      { x: 0.94, y: 0.48 },
    ],
  },
  "Split and Rejoin": {
    density: "Dense",
    wingIntensity: "Medium",
    entry: "Enter from left",
    exit: "Exit right",
    dwellSeconds: 2,
    durationSeconds: 10,
    points: [
      { x: 0.08, y: 0.46 },
      { x: 0.38, y: 0.44 },
      { x: 0.64, y: 0.5 },
      { x: 0.92, y: 0.46 },
    ],
  },
  "Waterfall Bloom": {
    density: "Murmuration",
    wingIntensity: "Medium",
    entry: "Enter from right",
    exit: "Exit left",
    dwellSeconds: 0,
    durationSeconds: 12,
    points: [
      { x: 0.92, y: 0.12 },
      { x: 0.74, y: 0.38 },
      { x: 0.56, y: 0.7 },
      { x: 0.38, y: 0.77 },
      { x: 0.1, y: 0.55 },
    ],
  },
  "Vortex Pull": {
    density: "Murmuration",
    wingIntensity: "Strong",
    entry: "Enter from right",
    exit: "Pull upward",
    dwellSeconds: 0,
    durationSeconds: 12,
    points: [
      { x: 0.94, y: 0.56 },
      { x: 0.74, y: 0.53 },
      { x: 0.54, y: 0.46 },
      { x: 0.42, y: 0.37 },
      { x: 0.3, y: 0.22 },
    ],
  },
}

type TreatmentSettings = Pick<
  Sequence,
  | "birdCount"
  | "sizeScale"
  | "spacingScale"
  | "speedMultiplier"
  | "foregroundBirdCount"
  | "foregroundBoost"
  | "depthDirection"
  | "depthStrength"
>

// These counts preserve the held creative baselines and the later large-flock
// progress: calm remains open, while Waterfall and Vortex reproduce the exact
// 68/74-bird rosters documented in the supplied continuation package.
export const TREATMENT_SETTINGS: Record<Treatment, TreatmentSettings> = {
  "Calm Glide": {
    birdCount: 22,
    sizeScale: 1,
    spacingScale: 2.8,
    speedMultiplier: 0.9,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.55,
  },
  "Symmetric Murmuration": {
    birdCount: 36,
    sizeScale: 0.95,
    spacingScale: 2.35,
    speedMultiplier: 0.9,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.6,
  },
  "Dive and Pullout": {
    birdCount: 44,
    sizeScale: 0.9,
    spacingScale: 2.05,
    speedMultiplier: 0.95,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.75,
  },
  "Curl and Release": {
    birdCount: 44,
    sizeScale: 0.9,
    spacingScale: 2.15,
    speedMultiplier: 0.9,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.75,
  },
  "Ribbon Wave": {
    birdCount: 22,
    sizeScale: 0.95,
    spacingScale: 2.45,
    speedMultiplier: 0.9,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.65,
  },
  "Split and Rejoin": {
    birdCount: 44,
    sizeScale: 0.85,
    spacingScale: 2.1,
    speedMultiplier: 0.9,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.7,
  },
  "Waterfall Bloom": {
    birdCount: 68,
    sizeScale: 0.82,
    spacingScale: 3,
    speedMultiplier: 0.9,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.7,
  },
  "Vortex Pull": {
    birdCount: 74,
    sizeScale: 0.8,
    spacingScale: 2.8,
    speedMultiplier: 0.88,
    foregroundBirdCount: 0,
    foregroundBoost: 1,
    depthDirection: "Flat plane",
    depthStrength: 0.7,
  },
}

export function treatmentPresetPatch(treatment: Treatment): Partial<Sequence> {
  const preset = TREATMENT_PRESETS[treatment]
  return {
    treatment,
    density: preset.density,
    wingIntensity: preset.wingIntensity,
    entry: preset.entry,
    exit: preset.exit,
    points: preset.points.map((point) => ({ ...point })),
    landing: null,
    arrivalMode: "Fly through",
    perchCount: 0,
    gatherCount: 0,
    dwellSeconds: preset.dwellSeconds,
    durationSeconds: preset.durationSeconds,
    loopPath: false,
    ...TREATMENT_SETTINGS[treatment],
  }
}

export function makeSequence(treatment: Treatment, name?: string): Sequence {
  const p = TREATMENT_PRESETS[treatment]
  const settings = TREATMENT_SETTINGS[treatment]
  return {
    id: uid(),
    name: name ?? treatment,
    treatment,
    density: p.density,
    wingIntensity: p.wingIntensity,
    entry: p.entry,
    exit: p.exit,
    points: p.points.map((pt) => ({ ...pt })),
    landing: null,
    arrivalMode: "Fly through",
    perchCount: 0,
    gatherCount: 0,
    dwellSeconds: p.dwellSeconds,
    durationSeconds: p.durationSeconds,
    loopPath: false,
    ...settings,
    seed: Math.floor(Math.random() * 1e9),
    notes: "",
    color: FLOCK_INK,
  }
}

export function clearSequenceGeometry(sequence: Sequence): Sequence {
  return {
    ...sequence,
    points: [],
    landing: null,
    arrivalMode: "Fly through",
    perchCount: 0,
    gatherCount: 0,
    loopPath: false,
  }
}

export function defaultProject(): Project {
  return {
    name: "Untitled flock",
    viewport: { width: 1600, height: 900 },
    backdropDataUrl: null,
    scene: { kind: "none" },
    birdTemplate: BUILTIN_BIRD_TEMPLATE,
    sequences: [makeSequence("Calm Glide", "Calm Editorial")],
    style: {
      inkColor: FLOCK_INK,
      transparentBackground: true,
      backgroundColor: "#f3efe6",
    },
    fps: 30,
  }
}
