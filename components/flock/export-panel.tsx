"use client"

import { Bot, FileJson, FileText, Film, Image as ImageIcon, Loader2, Package } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  detectVideoSupport,
  exportAppleAlphaBundle,
  exportApplicationGuide,
  exportDesignerBrief,
  exportMp4,
  exportMotionBriefJson,
  exportPngSequenceZip,
  exportVisualMap,
  exportWebM,
  safeExportName,
} from "@/lib/flock/export"
import type { Project } from "@/lib/flock/types"

type Job = { kind: string; progress: number } | null
type ReadyDownload = { url: string; filename: string } | null

export function ExportPanel({ project }: { project: Project }) {
  const { width: viewportWidth, height: viewportHeight } = project.viewport
  const [job, setJob] = useState<Job>(null)
  const [error, setError] = useState<string | null>(null)
  const [readyDownload, setReadyDownload] = useState<ReadyDownload>(null)
  const [fileName, setFileName] = useState(project.name)
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false })
  // The server cannot know browser codec support. Start from the same stable
  // snapshot on the server and first client render, then detect after hydration.
  const [support, setSupport] = useState({
    mp4: false,
    opaqueWebm: false,
    transparentWebm: false,
  })

  useEffect(() => {
    let current = true
    void detectVideoSupport({ viewport: { width: viewportWidth, height: viewportHeight } }).then((next) => {
      if (current) setSupport(next)
    })
    return () => {
      current = false
    }
  }, [viewportHeight, viewportWidth])

  useEffect(() => {
    const onReady = (event: Event) => {
      const detail = (event as CustomEvent<{ url: string; filename: string }>).detail
      if (detail?.url && detail?.filename) setReadyDownload(detail)
    }
    window.addEventListener("murmur-export-ready", onReady)
    return () => window.removeEventListener("murmur-export-ready", onReady)
  }, [])

  const run = async (kind: string, fn: (sig: { cancelled: boolean }, onProgress: (p: number) => void) => Promise<void>) => {
    setError(null)
    setReadyDownload(null)
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
  const baseName = safeExportName(fileName)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Export video</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Export birds with alpha, or composite them over an uploaded card image. HTML/CSS and URL scenes stay reference-only.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Export file name</span>
        <input
          value={fileName}
          onChange={(event) => setFileName(event.target.value)}
          placeholder="bird-flock-hero"
          className="h-9 rounded-md border border-border bg-secondary px-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
          aria-label="Export file name"
        />
        <span className="text-[10px] text-muted-foreground">Preview: {baseName}.mp4</span>
      </label>

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
        onClick={() => run("png", (sig, onProgress) => exportPngSequenceZip(project, { baseName, signal: sig, onProgress }))}
      />

      <ExportButton
        icon={<Film className="h-4 w-4" />}
        title="Background MP4 (H.264)"
        subtitle={
          project.scene.kind === "image"
            ? "Composited over your uploaded scene image"
            : project.scene.kind === "html" || project.scene.kind === "url"
              ? "Scene is reference-only · uses background color"
              : "Composited over the background color"
        }
        badge={support.mp4 ? "Ready" : "N/A"}
        disabled={busy || !hasPaths || !support.mp4}
        loading={job?.kind === "mp4"}
        progress={job?.kind === "mp4" ? job.progress : 0}
        onClick={() => run("mp4", (sig, onProgress) => exportMp4(project, { baseName, signal: sig, onProgress }))}
      />

      <ExportButton
        icon={<Film className="h-4 w-4" />}
        title="Background WebM (opaque)"
        subtitle={
          project.scene.kind === "image" ? "Composited over your uploaded card image" : project.scene.kind === "html" || project.scene.kind === "url" ? "Scene is reference-only · uses background color" : "Composited over the background color"
        }
        disabled={busy || !hasPaths || !support.opaqueWebm}
        loading={job?.kind === "webm"}
        progress={job?.kind === "webm" ? job.progress : 0}
        onClick={() => run("webm", (sig, onProgress) => exportWebM(project, { baseName, transparent: false, signal: sig, onProgress }))}
      />

      <ExportButton
        icon={<Film className="h-4 w-4" />}
        title="Transparent WebM"
        subtitle="VP9 alpha · Chrome/Chromium · verify alpha in your player"
        badge={support.transparentWebm ? "Ready" : "N/A"}
        disabled={busy || !hasPaths || !support.transparentWebm}
        loading={job?.kind === "webma"}
        progress={job?.kind === "webma" ? job.progress : 0}
        onClick={() => run("webma", (sig, onProgress) => exportWebM(project, { baseName, transparent: true, signal: sig, onProgress }))}
      />

      <ExportButton
        icon={<Package className="h-4 w-4" />}
        title="Apple HEVC alpha handoff (.zip)"
        subtitle="Transparent frames + double-click ProRes 4444 converter + HEVC guide"
        badge="Apple"
        disabled={busy || !hasPaths}
        loading={job?.kind === "apple"}
        progress={job?.kind === "apple" ? job.progress : 0}
        onClick={() => run("apple", (sig, onProgress) => exportAppleAlphaBundle(project, { baseName, signal: sig, onProgress }))}
      />

      <div className="h-px bg-border" />

      <h3 className="text-sm font-semibold text-foreground">Export handoff</h3>
      <div className="grid grid-cols-1 gap-2">
        <SmallButton icon={<Bot className="h-4 w-4" />} label="Application AGENTS.md" disabled={busy} onClick={() => exportApplicationGuide(project, baseName)} />
        <SmallButton icon={<FileJson className="h-4 w-4" />} label="Motion brief (.json)" disabled={busy} onClick={() => exportMotionBriefJson(project, baseName)} />
        <SmallButton icon={<FileText className="h-4 w-4" />} label="Designer brief (.md)" disabled={busy} onClick={() => exportDesignerBrief(project, baseName)} />
        <SmallButton icon={<ImageIcon className="h-4 w-4" />} label="Visual map (.png)" disabled={busy} onClick={() => run("map", () => exportVisualMap(project, baseName))} />
      </div>

      {busy && (
        <div className="flex items-center justify-between gap-3" role="status" aria-live="polite">
          <span className="text-xs text-muted-foreground">{job.kind.toUpperCase()} export · {Math.round(job.progress * 100)}%</span>
          <button
            type="button"
            onClick={() => (cancelRef.current.cancelled = true)}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel export
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {readyDownload && (
        <a
          href={readyDownload.url}
          download={readyDownload.filename}
          className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15"
        >
          Download {readyDownload.filename}
        </a>
      )}
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
