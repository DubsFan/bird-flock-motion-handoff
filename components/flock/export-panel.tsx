"use client"

import { FileJson, FileText, Film, Image as ImageIcon, Loader2, Package } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import {
  detectVideoSupport,
  exportDesignerBrief,
  exportMotionBriefJson,
  exportPngSequenceZip,
  exportVisualMap,
  exportWebM,
} from "@/lib/flock/export"
import type { Project } from "@/lib/flock/types"

type Job = { kind: string; progress: number } | null

export function ExportPanel({ project }: { project: Project }) {
  const [job, setJob] = useState<Job>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false })
  const support = useMemo(() => detectVideoSupport(), [])

  const run = async (kind: string, fn: (sig: { cancelled: boolean }, onProgress: (p: number) => void) => Promise<void>) => {
    setError(null)
    cancelRef.current = { cancelled: false }
    setJob({ kind, progress: 0 })
    try {
      await fn(cancelRef.current, (p) => setJob({ kind, progress: p }))
    } catch (e) {
      if ((e as Error).message !== "cancelled") setError((e as Error).message)
    } finally {
      setJob(null)
    }
  }

  const busy = job !== null
  const hasPaths = project.sequences.some((s) => s.points.length >= 2)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Export video</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Transparent frames are the reliable path. In-browser WebM is instant but opaque.
        </p>
      </div>

      {/* Tier 1 */}
      <ExportButton
        icon={<Package className="h-4 w-4" />}
        title="Transparent PNG frames (.zip)"
        subtitle="True alpha · includes ffmpeg command · recommended"
        badge="Reliable"
        highlight
        disabled={busy || !hasPaths}
        loading={job?.kind === "png"}
        progress={job?.kind === "png" ? job.progress : 0}
        onClick={() => run("png", (sig, onProgress) => exportPngSequenceZip(project, { signal: sig, onProgress }))}
      />

      {/* Tier 2 */}
      <ExportButton
        icon={<Film className="h-4 w-4" />}
        title="Background WebM (opaque)"
        subtitle={
          project.backdropDataUrl ? "Composited over your backdrop" : "Composited over the background color"
        }
        disabled={busy || !hasPaths || !support.opaque}
        loading={job?.kind === "webm"}
        progress={job?.kind === "webm" ? job.progress : 0}
        onClick={() => run("webm", (sig, onProgress) => exportWebM(project, { transparent: false, signal: sig, onProgress }))}
      />

      {/* Tier 3 */}
      <ExportButton
        icon={<Film className="h-4 w-4" />}
        title="Transparent WebM"
        subtitle="Experimental · Chrome only · verify alpha in your player"
        badge={support.transparent ? "Beta" : "N/A"}
        disabled={busy || !hasPaths || !support.transparent}
        loading={job?.kind === "webma"}
        progress={job?.kind === "webma" ? job.progress : 0}
        onClick={() => run("webma", (sig, onProgress) => exportWebM(project, { transparent: true, signal: sig, onProgress }))}
      />

      <div className="h-px bg-border" />

      <h3 className="text-sm font-semibold text-foreground">Export handoff</h3>
      <div className="grid grid-cols-1 gap-2">
        <SmallButton icon={<FileJson className="h-4 w-4" />} label="Motion brief (.json)" disabled={busy} onClick={() => exportMotionBriefJson(project)} />
        <SmallButton icon={<FileText className="h-4 w-4" />} label="Designer brief (.md)" disabled={busy} onClick={() => exportDesignerBrief(project)} />
        <SmallButton icon={<ImageIcon className="h-4 w-4" />} label="Visual map (.png)" disabled={busy} onClick={() => run("map", () => exportVisualMap(project))} />
      </div>

      {busy && (
        <button
          type="button"
          onClick={() => (cancelRef.current.cancelled = true)}
          className="mt-1 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel export
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ExportButton({
  icon,
  title,
  subtitle,
  badge,
  highlight,
  disabled,
  loading,
  progress,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
  highlight?: boolean
  disabled?: boolean
  loading?: boolean
  progress: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        highlight
          ? "border-primary/40 bg-primary/10 hover:bg-primary/15"
          : "border-border bg-secondary hover:bg-accent"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 ${highlight ? "text-primary" : "text-muted-foreground"}`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{title}</span>
            {badge && (
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${highlight ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {loading && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
      )}
    </button>
  )
}

function SmallButton({ icon, label, disabled, onClick }: { icon: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-45"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  )
}
