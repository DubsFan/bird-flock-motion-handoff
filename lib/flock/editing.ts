import { landingZones } from "./engine"
import type { Sequence } from "./types"

export function deletePathPoint(sequence: Sequence, index: number): Sequence {
  if (index < 0 || index >= sequence.points.length) return sequence
  return {
    ...sequence,
    points: sequence.points.filter((_, pointIndex) => pointIndex !== index),
  }
}

export function deleteLanding(sequence: Sequence, index: number): Sequence {
  const landings = landingZones(sequence).filter((_, landingIndex) => landingIndex !== index)
  return {
    ...sequence,
    landings,
    landing: landings[0] ?? null,
    ...(landings.length ? {} : {
      arrivalMode: "Fly through" as const,
      perchCount: 0,
      gatherCount: 0,
    }),
  }
}
