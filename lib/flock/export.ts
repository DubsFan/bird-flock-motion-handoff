import {
  buildApplicationGuide,
  buildDesignerBriefMarkdown,
  buildMotionBriefJson,
} from "./brief"
import { themeBackgroundColor } from "./defaults"
import { projectDuration, renderProjectFrame, renderSequence, sequenceDuration } from "./engine"
import { preloadBirdTemplate } from "./template-renderer"
import type { Project } from "./types"

export type ExportSize = { width: number; height: number }
export type ExportSignal = { cancelled: boolean }
export type ExportProgress = (progress: number) => void

type BaseExportOptions = {
  baseName?: string
  fps?: number
  maxWidth?: number
  onProgress?: ExportProgress
  signal?: ExportSignal
}

export type VideoSupport = {
  mp4: boolean
  opaqueWebm: boolean
  transparentWebm: boolean
}

function even(value: number) {
  const rounded = Math.max(2, Math.round(value))
  return rounded % 2 === 0 ? rounded : rounded - 1
}

export function exportDims(project: Pick<Project, "viewport">, maxWidth = 1600): ExportSize {
  const aspect = project.viewport.height / Math.max(1, project.viewport.width)
  const width = even(Math.min(maxWidth, project.viewport.width))
  return { width, height: even(width * aspect) }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  window.dispatchEvent(new CustomEvent("murmur-export-ready", { detail: { url, filename } }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Keep the result available long enough for the persistent in-app download
  // link. Large browser-generated files can outlive the original click gesture.
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000)
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d", { alpha: true })
  if (!ctx) throw new Error("Canvas 2D rendering is unavailable in this browser.")
  return { canvas, ctx }
}

export function safeExportName(value: string) {
  const cleaned = value
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return cleaned || "flock"
}

export function buildProResCommand(name: string, fps: number, pad: number) {
  return [
    "#!/bin/zsh",
    "set -euo pipefail",
    'script_dir="${0:A:h}"',
    'cd "$script_dir"',
    "if ! command -v ffmpeg >/dev/null 2>&1; then",
    '  echo "FFmpeg is required. Install it, then double-click this file again."',
    '  read -r "reply?Press Return to close…"',
    "  exit 1",
    "fi",
    `ffmpeg -y -framerate ${fps} -i "frames/frame_%0${pad}d.png" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "${name}-prores4444.mov"`,
    'echo ""',
    `echo "Created ${name}-prores4444.mov"`,
    'read -r "reply?Press Return to close…"',
    "",
  ].join("\n")
}

async function preloadProjectBirdTemplates(project: Project) {
  const templates = [project.birdTemplate, ...project.sequences.flatMap((sequence) => sequence.birdTemplate ? [sequence.birdTemplate] : [])]
  const unique = [...new Map(templates.map((template) => [template.id, template])).values()]
  await Promise.all(unique.map(preloadBirdTemplate))
}

function outputName(project: Project, requested?: string) {
  return safeExportName(requested || project.name)
}

export async function detectVideoSupport(project?: Pick<Project, "viewport">): Promise<VideoSupport> {
  if (typeof window === "undefined") return { mp4: false, opaqueWebm: false, transparentWebm: false }
  try {
    const { canEncodeVideo, QUALITY_HIGH } = await import("mediabunny")
    const { width, height } = project
      ? exportDims(project)
      : { width: 1280, height: 720 }
    const [mp4, opaqueWebm, transparentWebm] = await Promise.all([
      canEncodeVideo("avc", { width, height, quality: QUALITY_HIGH, alpha: "discard" }),
      canEncodeVideo("vp9", { width, height, quality: QUALITY_HIGH, alpha: "discard" }),
      canEncodeVideo("vp9", { width, height, quality: QUALITY_HIGH, alpha: "keep" }),
    ])
    return { mp4, opaqueWebm, transparentWebm }
  } catch {
    return { mp4: false, opaqueWebm: false, transparentWebm: false }
  }
}

async function loadSceneImage(project: Project) {
  const src = project.scene.kind === "image" ? project.scene.dataUrl : project.backdropDataUrl
  if (!src) return null
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function renderFlocksOnly(
  ctx: CanvasRenderingContext2D,
  globalT: number,
  project: Project,
  total: number,
  fps: number,
) {
  const seconds = Math.max(0, Math.min(1, globalT)) * total
  for (const sequence of project.sequences) {
    if (sequence.points.length < 2) continue
    const localT = Math.max(0, Math.min(1, seconds / Math.max(0.001, sequenceDuration(sequence))))
    renderSequence(
      ctx,
      sequence,
      localT,
      project.style,
      { w: ctx.canvas.width, h: ctx.canvas.height },
      sequence.birdTemplate ?? project.birdTemplate,
      fps,
    )
  }
}

function composeFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  project: Project,
  total: number,
  transparent: boolean,
  background: HTMLImageElement | null,
  fps: number,
) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  if (!transparent) {
    ctx.fillStyle = themeBackgroundColor(project.style)
    ctx.fillRect(0, 0, width, height)
    if (background) {
      drawImageContain(ctx, background, width, height)
    }
  }
  renderFlocksOnly(ctx, t, project, total, fps)
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

async function encodeVideoBlob(
  project: Project,
  format: "mp4" | "webm",
  options: BaseExportOptions & { transparent?: boolean } = {},
) {
  const {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
    WebMOutputFormat,
    canEncodeVideo,
  } = await import("mediabunny")

  const fps = options.fps ?? project.fps ?? 30
  const { width, height } = exportDims(project, options.maxWidth ?? 1600)
  const total = projectDuration(project.sequences)
  const frameCount = Math.max(1, Math.ceil(total * fps))
  const transparent = format === "webm" && !!options.transparent
  const codec = format === "mp4" ? "avc" : "vp9"
  const supported = await canEncodeVideo(codec, {
    width,
    height,
    quality: QUALITY_HIGH,
    alpha: transparent ? "keep" : "discard",
  })
  if (!supported) {
    throw new Error(
      format === "mp4"
        ? "This browser cannot encode H.264 MP4. Use Chrome or Safari with WebCodecs support, or export the frame handoff."
        : "This browser cannot encode VP9 WebM with the requested alpha mode. Use the transparent frame handoff.",
    )
  }

  await preloadProjectBirdTemplates(project)

  const { canvas, ctx } = makeCanvas(width, height)
  const background = transparent ? null : await loadSceneImage(project)
  const target = new BufferTarget()
  const output = new Output({
    format: format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
    target,
  })
  const source = new CanvasSource(canvas, {
    codec,
    quality: QUALITY_HIGH,
    alpha: transparent ? "keep" : "discard",
    keyFrameInterval: 2,
  })
  output.addVideoTrack(source, { frameRate: fps })
  output.setMetadataTags({ title: project.name, comment: "Created with Murmur Bird Flock Video Builder" })
  await output.start()

  try {
    for (let index = 0; index < frameCount; index++) {
      if (options.signal?.cancelled) throw new Error("cancelled")
      const t = frameCount <= 1 ? 0 : index / (frameCount - 1)
      composeFrame(ctx, t, project, total, transparent, background, fps)
      await source.add(index / fps, 1 / fps, { keyFrame: index % Math.max(1, fps * 2) === 0 })
      options.onProgress?.((index + 1) / frameCount)
    }
    await output.finalize()
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel()
    throw error
  }

  if (!target.buffer) throw new Error("The browser encoder completed without producing a video buffer.")
  const type = format === "mp4" ? "video/mp4" : "video/webm"
  return new Blob([target.buffer], { type })
}

async function exportEncodedVideo(
  project: Project,
  format: "mp4" | "webm",
  options: BaseExportOptions & { transparent?: boolean } = {},
) {
  const blob = await encodeVideoBlob(project, format, options)
  const name = outputName(project, options.baseName)
  const suffix = format === "webm" && options.transparent ? "-alpha" : ""
  download(blob, `${name}${suffix}.${format}`)
}

export function exportMp4(project: Project, options: BaseExportOptions = {}) {
  return exportEncodedVideo(project, "mp4", { ...options, transparent: false })
}

export function exportWebM(
  project: Project,
  options: BaseExportOptions & { transparent?: boolean } = {},
) {
  return exportEncodedVideo(project, "webm", options)
}

type FrameBundleMode = "standard" | "apple"

async function exportFrameBundle(
  project: Project,
  mode: FrameBundleMode,
  options: BaseExportOptions = {},
) {
  const { default: JSZip } = await import("jszip")
  const fps = options.fps ?? project.fps ?? 30
  const { width, height } = exportDims(project, options.maxWidth ?? 1600)
  const total = projectDuration(project.sequences)
  const frames = Math.max(1, Math.ceil(total * fps))
  await preloadProjectBirdTemplates(project)
  const { canvas, ctx } = makeCanvas(width, height)
  const zip = new JSZip()
  const folder = zip.folder("frames")!
  const pad = String(frames).length
  const name = outputName(project, options.baseName)

  for (let index = 0; index < frames; index++) {
    if (options.signal?.cancelled) throw new Error("cancelled")
    const t = frames <= 1 ? 0 : index / (frames - 1)
    renderProjectFrame(
      ctx,
      t,
      project.sequences,
      project.style,
      { w: width, h: height },
      total,
      project.birdTemplate,
      fps,
    )
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    if (!blob) throw new Error(`Could not render frame ${index + 1}.`)
    folder.file(`frame_${String(index).padStart(pad, "0")}.png`, blob)
    options.onProgress?.(((index + 1) / frames) * 0.85)
    if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const readme = mode === "apple"
    ? [
        `${name} — Apple transparent video handoff`,
        "",
        `${frames} transparent PNG frames at ${fps} fps (${width}x${height}).`,
        "",
        "IMPORTANT: HEIC is a still-image/image-sequence container. The Apple transparent video delivery format is HEVC with alpha in a .mov file.",
        "",
        "Recommended Apple workflow:",
        "1. For an editing-ready transparent MOV, double-click MAKE_PRORES_4444.command. It uses FFmpeg and creates a ProRes 4444 alpha master beside this README.",
        "2. For the smallest Apple playback file, import the numbered PNG sequence into Apple Compressor, Final Cut Pro, or an AVFoundation workflow.",
        `3. Set the frame rate to ${fps} fps and preserve the ${width}x${height} canvas.`,
        `4. Export HEVC with alpha as ${name}-alpha.mov.`,
        "5. Keep premultiplied alpha unless the destination pipeline explicitly requires straight alpha.",
        "",
        "Portable editing intermediate (requires ffmpeg):",
        `ffmpeg -framerate ${fps} -i frames/frame_%0${pad}d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le ${name}-prores4444.mov`,
        "",
        "Use the included AGENTS.md for site integration and browser fallbacks.",
      ].join("\n")
    : [
        `${name} — transparent bird flock frame sequence`,
        "",
        `${frames} PNG frames at ${fps} fps (${width}x${height}), with full alpha transparency.`,
        "",
        "VP9 WebM with alpha:",
        `ffmpeg -framerate ${fps} -i frames/frame_%0${pad}d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 24 ${name}-alpha.webm`,
        "",
        "ProRes 4444 editing master:",
        `ffmpeg -framerate ${fps} -i frames/frame_%0${pad}d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le ${name}-prores4444.mov`,
      ].join("\n")

  zip.file("README.txt", readme)
  zip.file("MAKE_PRORES_4444.command", buildProResCommand(name, fps, pad), { unixPermissions: 0o755 })
  zip.file("AGENTS.md", buildApplicationGuide(project, name))
  zip.file(`${name}.motion-brief.json`, JSON.stringify(buildMotionBriefJson(project), null, 2))
  const blob = await zip.generateAsync({ type: "blob", platform: "UNIX" }, (metadata) => {
    options.onProgress?.(0.85 + (metadata.percent / 100) * 0.15)
  })
  download(blob, `${name}-${mode === "apple" ? "apple-hevc-alpha-handoff" : "frames"}.zip`)
}

export function exportPngSequenceZip(project: Project, options: BaseExportOptions = {}) {
  return exportFrameBundle(project, "standard", options)
}

export function exportAppleAlphaBundle(project: Project, options: BaseExportOptions = {}) {
  return exportFrameBundle(project, "apple", options)
}

export function projectForTheme(project: Project, theme: "light" | "dark"): Project {
  return {
    ...project,
    style: { ...project.style, previewTheme: theme },
  }
}

export function buildAllBrowserCommand(name: string, fps: number, pad: number) {
  return [
    "#!/bin/zsh",
    "set -euo pipefail",
    'script_dir="${0:A:h}"',
    'cd "$script_dir"',
    "if ! command -v ffmpeg >/dev/null 2>&1; then",
    '  echo "FFmpeg is required. Install it, then run this file again."',
    "  exit 1",
    "fi",
    "for theme in light dark; do",
    `  ffmpeg -y -framerate ${fps} -i "$theme/frames/frame_%0${pad}d.png" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 24 "$theme/${name}-$theme-alpha.webm"`,
    `  ffmpeg -y -framerate ${fps} -i "$theme/frames/frame_%0${pad}d.png" -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le "$theme/${name}-$theme-prores4444.mov"`,
    "done",
    'echo "Created light/dark VP9-alpha WebM and ProRes 4444 MOV files."',
    "",
  ].join("\n")
}

export function buildCompleteHandoffReadme(project: Project, name: string, frames: number, fps: number, width: number, height: number) {
  return [
    `# ${name} complete cross-browser bird-motion handoff`,
    "",
    `This single package contains ${frames} synchronized transparent frames for each light/dark palette at ${fps} fps (${width}x${height}), the browser WebM files when the exporting browser supported VP9 alpha, conversion tooling, implementation code, AGENTS.md, and the motion brief.`,
    "",
    "## Use this package",
    "",
    "1. Give the whole unzipped folder to the implementation agent. AGENTS.md is the source of truth.",
    "2. Keep the authored viewport. Do not independently crop the bird layer.",
    "3. Use the light asset pair on light theme and the dark asset pair on dark theme.",
    "4. Use HEVC-with-alpha MOV first for Safari/Apple and VP9-alpha WebM second for Chrome, Chromium, and Firefox.",
    "5. If a WebM is absent, run MAKE_ALL_BROWSER_ASSETS.command to create it from the included frames.",
    "6. Use Apple Compressor or AVFoundation to convert each included ProRes 4444 master to HEVC with alpha and name it exactly as AGENTS.md specifies.",
    "",
    "HEIC is not a video substitute. The Apple web asset is HEVC with alpha in a MOV container.",
  ].join("\n")
}

function integrationComponent(name: string) {
  return `export function FlockBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="flock-scene">
      <div className="flock-scene__background">{children}</div>
      <video className="flock-scene__birds flock-scene__birds--light" muted autoPlay loop playsInline aria-hidden="true">
        <source src="/${name}-light-alpha.mov" type='video/quicktime; codecs="hvc1"' />
        <source src="/${name}-light-alpha.webm" type='video/webm; codecs="vp9"' />
      </video>
      <video className="flock-scene__birds flock-scene__birds--dark" muted autoPlay loop playsInline aria-hidden="true">
        <source src="/${name}-dark-alpha.mov" type='video/quicktime; codecs="hvc1"' />
        <source src="/${name}-dark-alpha.webm" type='video/webm; codecs="vp9"' />
      </video>
    </div>
  )
}
`
}

const INTEGRATION_CSS = `.flock-scene { position: relative; overflow: hidden; }
.flock-scene__background { position: relative; z-index: 0; }
.flock-scene__birds { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; object-fit: contain; pointer-events: none; background: transparent; }
.flock-scene__birds--dark { display: none; }
.dark .flock-scene__birds--light, [data-theme='dark'] .flock-scene__birds--light { display: none; }
.dark .flock-scene__birds--dark, [data-theme='dark'] .flock-scene__birds--dark { display: block; }
@media (prefers-color-scheme: dark) {
  :root:not(.light):not([data-theme='light']) .flock-scene__birds--light { display: none; }
  :root:not(.light):not([data-theme='light']) .flock-scene__birds--dark { display: block; }
}
@media (prefers-reduced-motion: reduce) { .flock-scene__birds { display: none !important; } }
`

export async function exportCompleteHandoff(project: Project, options: BaseExportOptions = {}) {
  const { default: JSZip } = await import("jszip")
  const fps = options.fps ?? project.fps ?? 30
  const { width, height } = exportDims(project, options.maxWidth ?? 1600)
  const total = projectDuration(project.sequences)
  const frames = Math.max(1, Math.ceil(total * fps))
  const pad = String(frames).length
  const name = outputName(project, options.baseName)
  const zip = new JSZip()
  await preloadProjectBirdTemplates(project)
  const { canvas, ctx } = makeCanvas(width, height)
  const themes = ["light", "dark"] as const

  for (let themeIndex = 0; themeIndex < themes.length; themeIndex++) {
    const theme = themes[themeIndex]
    const themed = projectForTheme(project, theme)
    const folder = zip.folder(`${theme}/frames`)!
    for (let index = 0; index < frames; index++) {
      if (options.signal?.cancelled) throw new Error("cancelled")
      const t = frames <= 1 ? 0 : index / (frames - 1)
      renderProjectFrame(ctx, t, themed.sequences, themed.style, { w: width, h: height }, total, themed.birdTemplate, fps)
      const frame = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      if (!frame) throw new Error(`Could not render ${theme} frame ${index + 1}.`)
      folder.file(`frame_${String(index).padStart(pad, "0")}.png`, frame)
      options.onProgress?.(((themeIndex * frames + index + 1) / (frames * themes.length)) * 0.72)
      if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0))
    }
    try {
      const webm = await encodeVideoBlob(themed, "webm", {
        ...options,
        transparent: true,
        onProgress: (progress) => options.onProgress?.(0.72 + themeIndex * 0.1 + progress * 0.1),
      })
      zip.file(`${theme}/${name}-${theme}-alpha.webm`, webm)
    } catch (error) {
      if ((error as Error).message === "cancelled") throw error
      zip.file(`${theme}/WEBM_NOT_ENCODED.txt`, "This browser could not encode VP9 alpha. Run ../MAKE_ALL_BROWSER_ASSETS.command from the package root.")
    }
  }

  zip.file("README.md", buildCompleteHandoffReadme(project, name, frames, fps, width, height))
  zip.file("AGENTS.md", buildApplicationGuide(project, name))
  zip.file("MAKE_ALL_BROWSER_ASSETS.command", buildAllBrowserCommand(name, fps, pad), { unixPermissions: 0o755 })
  zip.file(`${name}.motion-brief.json`, JSON.stringify(buildMotionBriefJson(project), null, 2))
  zip.file("integration/FlockBackground.tsx", integrationComponent(name))
  zip.file("integration/flock-background.css", INTEGRATION_CSS)
  const blob = await zip.generateAsync({ type: "blob", platform: "UNIX" }, (metadata) => options.onProgress?.(0.92 + metadata.percent / 100 * 0.08))
  download(blob, `${name}-complete-cross-browser-handoff.zip`)
}

export function exportMotionBriefJson(project: Project, baseName?: string) {
  const name = outputName(project, baseName)
  download(
    new Blob([JSON.stringify(buildMotionBriefJson(project), null, 2)], { type: "application/json" }),
    `${name}.motion-brief.json`,
  )
}

export function exportDesignerBrief(project: Project, baseName?: string) {
  const name = outputName(project, baseName)
  download(new Blob([buildDesignerBriefMarkdown(project)], { type: "text/markdown" }), `${name}.brief.md`)
}

export function exportApplicationGuide(project: Project, baseName?: string) {
  const name = outputName(project, baseName)
  download(new Blob([buildApplicationGuide(project, name)], { type: "text/markdown" }), `${name}.AGENTS.md`)
}

export async function exportVisualMap(project: Project, baseName?: string) {
  const { width, height } = exportDims(project, 1600)
  const { canvas, ctx } = makeCanvas(width, height)
  ctx.fillStyle = "#0b1220"
  ctx.fillRect(0, 0, width, height)
  const background = await loadSceneImage(project)
  if (background) drawImageContain(ctx, background, width, height)
  for (const sequence of project.sequences) {
    ctx.strokeStyle = "#5ea8ff"
    ctx.lineWidth = 2
    ctx.setLineDash([8, 6])
    ctx.beginPath()
    sequence.points.forEach((point, index) => {
      const x = point.x * width
      const y = point.y * height
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.setLineDash([])
    for (const landing of sequence.landings?.length ? sequence.landings : sequence.landing ? [sequence.landing] : []) {
      ctx.strokeStyle = "#5ea8ff"
      ctx.strokeRect(
        landing.x * width,
        landing.y * height,
        landing.w * width,
        landing.h * height,
      )
    }
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (blob) download(blob, `${outputName(project, baseName)}.visual-map.png`)
}
