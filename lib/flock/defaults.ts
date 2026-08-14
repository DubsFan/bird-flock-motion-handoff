import type { Project, Sequence, Treatment } from "./types"

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
    density: "Sparse",
    wingIntensity: "Soft",
    entry: "Enter from left",
    exit: "Exit right",
    dwellSeconds: 2.5,
    durationSeconds: 9,
    points: [
      { x: 0.08, y: 0.34 },
      { x: 0.35, y: 0.42 },
      { x: 0.62, y: 0.38 },
      { x: 0.9, y: 0.3 },
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
}

export function makeSequence(treatment: Treatment, name?: string): Sequence {
  const p = TREATMENT_PRESETS[treatment]
  return {
    id: uid(),
    name: name ?? treatment,
    treatment,
    density: p.density,
    wingIntensity: p.wingIntensity,
    entry: p.entry,
    exit: p.exit,
    points: p.points.map((pt) => ({ ...pt })),
    landing:
      p.dwellSeconds > 0 ? { x: 0.42, y: 0.34, w: 0.16, h: 0.13 } : null,
    dwellSeconds: p.dwellSeconds,
    durationSeconds: p.durationSeconds,
    seed: Math.floor(Math.random() * 1e9),
    notes: "",
    color: FLOCK_INK,
  }
}

export function defaultProject(): Project {
  return {
    name: "Untitled flock",
    viewport: { width: 1600, height: 900 },
    backdropDataUrl: null,
    sequences: [makeSequence("Dive and Pullout", "Hero Dive")],
    style: {
      inkColor: FLOCK_INK,
      transparentBackground: true,
      backgroundColor: "#0b1220",
    },
    fps: 30,
  }
}
