import JSZip from "jszip"
import { buildDesignerBriefMarkdown, buildMotionBriefJson } from "./brief"
import { projectDuration, renderProjectFrame, renderSequence } from "./engine"
import type { Project } from "./types"

export type ExportSize = { width: number; height: number }

// Clamp export width and derive height from viewport aspect.
export function exportDims(project: Project, maxWidth = 1600): ExportSize {
  const aspect = project.viewport.height / project.viewport.width
  const width = Math.min(maxWidth, project.viewport.width)
  return { width: Math.round(width), height: Math.round(width * aspect) }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { alpha: true })!
  return { canvas, ctx }
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "flock"
}

// --- Codec feature detection ------------------------------------------------
export type VideoSupport = { opaque: boolean; transparent: boolean; mime: string | null }

export function detectVideoSupport(): VideoSupport {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { opaque: false, transparent: false, mime: null }
  }
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
  const mime = candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? null
  // Transparent webm is best-effort and Chromium-only in practice.
  const transparent = !!mime && /Chrome/.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent)
  return { opaque: !!mime, transparent, mime }
}

// --- Tier 1: transparent PNG frame sequence -> ZIP (guaranteed alpha) --------
export async function exportPngSequenceZip(
  project: Project,
  opts: { fps?: number; maxWidth?: number; onProgress?: (p: number) => void; signal?: { cancelled: boolean } } = {},
) {
  const fps = opts.fps ?? project.fps ?? 30
  const { width, height } = exportDims(project, opts.maxWidth ?? 1600)
  const total = projectDuration(project.sequences)
  const frames = Math.max(1, Math.round(total * fps))
  const { canvas, ctx } = makeCanvas(width, height)
  const zip = new JSZip()
  const folder = zip.folder("frames")!
  const pad = String(frames).length

  for (let i = 0; i < frames; i++) {
    if (opts.signal?.cancelled) throw new Error("cancelled")
    const t = frames <= 1 ? 0 : i / frames
    renderProjectFrame(ctx, t, project.sequences, project.style, { w: width, h: height }, total)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"))
    if (blob) folder.file(`frame_${String(i).padStart(pad, "0")}.png`, blob)
    opts.onProgress?.((i + 1) / frames)
    // Yield to keep UI responsive.
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0))
  }

  const name = slug(project.name)
  zip.file(
    "README.txt",
    [
      `${project.name} — transparent bird flock frame sequence`,
      ``,
      `${frames} PNG frames at ${fps} fps (${width}x${height}), full alpha transparency.`,
      ``,
      `Assemble a TRUE transparent-background video with ffmpeg:`,
      ``,
      `# VP9 WebM with alpha (web background video):`,
      `ffmpeg -framerate ${fps} -i frames/frame_%0${pad}d.png \\`,
      `  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 24 ${name}.webm`,
      ``,
      `# ProRes 4444 MOV with alpha (editing / After Effects):`,
      `ffmpeg -framerate ${fps} -i frames/frame_%0${pad}d.png \\`,
      `  -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le ${name}.mov`,
      ``,
      `Then drop it into your site:`,
      `<video autoplay muted loop playsinline src="${name}.webm"></video>`,
    ].join("\n"),
  )
  zip.file(`${name}.motion-brief.json`, JSON.stringify(buildMotionBriefJson(project), null, 2))

  opts.onProgress?.(1)
  const out = await zip.generateAsync({ type: "blob" }, (m) => {
    // zipping progress in the last 0..1 stretch is folded into 1
  })
  download(out, `${name}-frames.zip`)
}

// --- Tier 2/3: in-browser WebM via deterministic capture --------------------
export async function exportWebM(
  project: Project,
  opts: {
    fps?: number
    maxWidth?: number
    transparent?: boolean
    onProgress?: (p: number) => void
    signal?: { cancelled: boolean }
  } = {},
): Promise<void> {
  const support = detectVideoSupport()
  if (!support.mime) throw new Error("WebM recording is not supported in this browser. Use the PNG sequence export.")

  const fps = opts.fps ?? project.fps ?? 30
  const { width, height } = exportDims(project, opts.maxWidth ?? 1600)
  const total = projectDuration(project.sequences)
  const frames = Math.max(1, Math.round(total * fps))
  const transparent = !!opts.transparent && support.transparent

  const { canvas, ctx } = makeCanvas(width, height)

  // Optional backdrop image for opaque background composition.
  let bg: HTMLImageElement | null = null
  if (!transparent && project.backdropDataUrl) {
    bg = await new Promise<HTMLImageElement | null>((res) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => res(img)
      img.onerror = () => res(null)
      img.src = project.backdropDataUrl!
    })
  }

  const stream = canvas.captureStream(0)
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
  const rec = new MediaRecorder(stream, { mimeType: support.mime, videoBitsPerSecond: 12_000_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)

  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }))
  })

  rec.start()

  const composeFrame = (t: number) => {
    if (transparent) {
      ctx.clearRect(0, 0, width, height)
    } else {
      ctx.clearRect(0, 0, width, height)
      if (bg) {
        ctx.drawImage(bg, 0, 0, width, height)
      } else {
        ctx.fillStyle = project.style.backgroundColor || "#0b1220"
        ctx.fillRect(0, 0, width, height)
      }
    }
    // Draw flocks over the composed background (renderProjectFrame clears, so
    // draw sequences directly here by re-using the same routine on a scratch).
    renderFlocksOnly(ctx, t, project, total)
  }

  for (let i = 0; i < frames; i++) {
    if (opts.signal?.cancelled) {
      rec.stop()
      throw new Error("cancelled")
    }
    const t = frames <= 1 ? 0 : i / frames
    composeFrame(t)
    if (typeof track.requestFrame === "function") track.requestFrame()
    else (stream as unknown as { requestFrame?: () => void }).requestFrame?.()
    opts.onProgress?.((i + 1) / frames)
    // Give the encoder a moment per frame (deterministic, not real-time).
    await new Promise((r) => setTimeout(r, 1000 / Math.min(fps, 60) / 2))
  }

  rec.stop()
  const blob = await done
  download(blob, `${slug(project.name)}${transparent ? "-alpha" : ""}.webm`)
}

// renderProjectFrame clears the canvas; when compositing over a background we
// need to draw only the birds. Re-run per-sequence render without clearing.
function renderFlocksOnly(ctx: CanvasRenderingContext2D, globalT: number, project: Project, total: number) {
  const seconds = Math.max(0, Math.min(1, globalT)) * total
  for (const seq of project.sequences) {
    if (seq.points.length < 2) continue
    const tSeq = Math.max(0, Math.min(1, seconds / Math.max(0.001, seq.durationSeconds)))
    renderSequence(ctx, seq, tSeq, project.style, { w: ctx.canvas.width, h: ctx.canvas.height })
  }
}

// --- Brief + visual map exports --------------------------------------------
export function exportMotionBriefJson(project: Project) {
  const blob = new Blob([JSON.stringify(buildMotionBriefJson(project), null, 2)], { type: "application/json" })
  download(blob, `${slug(project.name)}.motion-brief.json`)
}

export function exportDesignerBrief(project: Project) {
  const blob = new Blob([buildDesignerBriefMarkdown(project)], { type: "text/markdown" })
  download(blob, `${slug(project.name)}.brief.md`)
}

export async function exportVisualMap(project: Project) {
  const { width, height } = exportDims(project, 1600)
  const { canvas, ctx } = makeCanvas(width, height)
  ctx.fillStyle = "#0b1220"
  ctx.fillRect(0, 0, width, height)
  if (project.backdropDataUrl) {
    const img = await new Promise<HTMLImageElement | null>((res) => {
      const im = new Image()
      im.crossOrigin = "anonymous"
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = project.backdropDataUrl!
    })
    if (img) ctx.drawImage(img, 0, 0, width, height)
  }
  for (const s of project.sequences) {
    ctx.strokeStyle = "#5ea8ff"
    ctx.lineWidth = 2
    ctx.setLineDash([8, 6])
    ctx.beginPath()
    s.points.forEach((p, i) => {
      const x = p.x * width
      const y = p.y * height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.setLineDash([])
    if (s.landing) {
      ctx.strokeStyle = "#5ea8ff"
      ctx.strokeRect(s.landing.x * width, s.landing.y * height, s.landing.w * width, s.landing.h * height)
    }
  }
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"))
  if (blob) download(blob, `${slug(project.name)}.visual-map.png`)
}

// Ambient types for canvas capture.
interface CanvasCaptureMediaStreamTrack extends MediaStreamTrack {
  requestFrame?: () => void
}
