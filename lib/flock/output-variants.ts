import type { OutputVariantId, OutputVariantState, Project, Sequence } from "./types"

export const OUTPUT_VARIANTS: ReadonlyArray<{
  id: OutputVariantId
  label: string
  viewport: { width: number; height: number }
}> = [
  { id: "desktop", label: "Desktop", viewport: { width: 1600, height: 900 } },
  { id: "tablet", label: "Tablet", viewport: { width: 1024, height: 768 } },
  { id: "mobile", label: "Mobile", viewport: { width: 390, height: 844 } },
]

export function outputVariantDefinition(id: OutputVariantId) {
  return OUTPUT_VARIANTS.find((variant) => variant.id === id) ?? OUTPUT_VARIANTS[0]
}

export function cloneSequences(sequences: Sequence[]): Sequence[] {
  return sequences.map((sequence) => ({
    ...sequence,
    points: sequence.points.map((point) => ({ ...point })),
    landings: sequence.landings?.map((landing) => ({ ...landing })) ?? [],
    landing: sequence.landing ? { ...sequence.landing } : null,
  }))
}

export function switchOutputVariant(project: Project, nextId: OutputVariantId): Project {
  if (project.activeVariant === nextId) return project

  const currentId = project.activeVariant ?? "desktop"
  const currentState: OutputVariantState = {
    viewport: { ...project.viewport },
    sequences: cloneSequences(project.sequences),
  }
  const savedNext = project.variantStates?.[nextId]
  const nextDefinition = outputVariantDefinition(nextId)

  return {
    ...project,
    activeVariant: nextId,
    viewport: { ...(savedNext?.viewport ?? nextDefinition.viewport) },
    sequences: cloneSequences(savedNext?.sequences ?? project.sequences),
    variantStates: {
      ...project.variantStates,
      [currentId]: currentState,
    },
  }
}
