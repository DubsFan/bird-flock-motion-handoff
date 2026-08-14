import type { Project } from "./types"

// JSON motion brief, schema-compatible with the Bird Motion Mapper pipeline.
export function buildMotionBriefJson(project: Project) {
  return {
    schema_version: "1.0",
    project: {
      name: project.name,
      captured_at: new Date().toISOString(),
      viewport: project.viewport,
    },
    anchors: project.sequences
      .filter((s) => s.landing)
      .map((s, i) => {
        const lz = s.landing!
        return {
          id: `a-${i + 1}`,
          name: `${s.name} landing`,
          role: "Landing zone",
          normalized_center: { x: +(lz.x + lz.w / 2).toFixed(4), y: +(lz.y + lz.h / 2).toFixed(4) },
          normalized_size: { w: +lz.w.toFixed(4), h: +lz.h.toFixed(4) },
          flock_interaction: "Land",
          dwell_seconds: s.dwellSeconds,
        }
      }),
    paths: project.sequences.map((s) => ({
      id: s.id,
      name: s.name,
      treatment: s.treatment,
      duration_seconds: s.durationSeconds,
      dwell_seconds: s.dwellSeconds,
      density: s.density,
      wing_intensity: s.wingIntensity,
      entry: s.entry,
      exit: s.exit,
      raw_points: s.points.map((p) => ({ x: +p.x.toFixed(6), y: +p.y.toFixed(6) })),
      notes: s.notes,
    })),
    style: {
      ink_color: project.style.inkColor,
      transparent_background: project.style.transparentBackground,
      source_contours_only: true,
    },
  }
}

export function buildDesignerBriefMarkdown(project: Project): string {
  const lines: string[] = []
  lines.push(`# ${project.name} — Bird Motion Brief`, "")
  lines.push(`Viewport: ${project.viewport.width} x ${project.viewport.height}`)
  lines.push(`Ink color: ${project.style.inkColor}`)
  lines.push(`Background: ${project.style.transparentBackground ? "transparent" : project.style.backgroundColor}`, "")
  project.sequences.forEach((s, i) => {
    lines.push(`## ${i + 1}. ${s.name}`, "")
    lines.push(`- Treatment: **${s.treatment}**`)
    lines.push(`- Density: ${s.density} · Wing beat: ${s.wingIntensity}`)
    lines.push(`- Enter: ${s.entry} · Exit: ${s.exit}`)
    lines.push(`- Duration: ${s.durationSeconds}s · Dwell: ${s.dwellSeconds}s`)
    if (s.landing) {
      const lz = s.landing
      lines.push(
        `- Landing zone: center (${(lz.x + lz.w / 2).toFixed(2)}, ${(lz.y + lz.h / 2).toFixed(2)}), size ${(lz.w * 100).toFixed(0)}% x ${(lz.h * 100).toFixed(0)}%`,
      )
    }
    lines.push(`- Path points: ${s.points.map((p) => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(" → ")}`)
    if (s.notes.trim()) lines.push(`- Notes: ${s.notes.trim()}`)
    lines.push("")
  })
  return lines.join("\n")
}
