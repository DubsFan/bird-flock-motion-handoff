import type { BirdTemplate } from "./types"

const cache = new Map<string, HTMLImageElement[]>()
const tintCache = new Map<string, HTMLCanvasElement>()
export type BirdAnimationTrack = "flight" | "approach" | "perch" | "launch"

export function frameIndexForPhase(phase: number, frameCount: number) {
  const count = Math.max(1, Math.floor(frameCount))
  const normalized = ((phase % 1) + 1) % 1
  return Math.min(count - 1, Math.floor(normalized * count))
}

export function temporalFrameSamples(phase: number, frameCount: number, phaseSpan: number) {
  const count = Math.max(1, Math.floor(frameCount))
  if (!Number.isFinite(phaseSpan) || phaseSpan <= 0 || count === 1) {
    return [{ index: frameIndexForPhase(phase, count), weight: 1 }]
  }
  const offsets = [-0.5, -0.25, 0, 0.25, 0.5]
  const weights = [0.08, 0.18, 0.48, 0.18, 0.08]
  const combined = new Map<number, number>()
  offsets.forEach((offset, sampleIndex) => {
    const index = frameIndexForPhase(phase + offset * phaseSpan, count)
    combined.set(index, (combined.get(index) ?? 0) + weights[sampleIndex])
  })
  return [...combined.entries()].map(([index, weight]) => ({ index, weight }))
}

export function animationFrameLayout(
  template: BirdTemplate,
  track: BirdAnimationTrack,
  imageCount: number,
) {
  const flightFrameCount = Math.max(1, template.framesPerVariant ?? template.frames.length)
  const flightVariantCount = Math.max(1, Math.floor(template.frames.length / flightFrameCount))
  const frameCount = track === "flight"
    ? Math.min(imageCount, flightFrameCount)
    : Math.max(1, Math.floor(imageCount / flightVariantCount))
  return {
    frameCount,
    variantCount: Math.max(1, Math.floor(imageCount / frameCount)),
  }
}

// Ratios measured at the center notch in the approved C/A/B/D source crops.
const ARTIST_PIVOTS = [
  { x: 0.53, y: 0.66 },
  { x: 0.49, y: 0.62 },
  { x: 0.42, y: 0.61 },
  { x: 0.5, y: 0.66 },
]

function sourcesFor(template: BirdTemplate, track: BirdAnimationTrack) {
  if (track === "flight") return template.frames
  return template.actionFrames?.[track] ?? []
}

function imagesFor(template: BirdTemplate, track: BirdAnimationTrack = "flight"): HTMLImageElement[] {
  const sources = sourcesFor(template, track)
  if (typeof window === "undefined" || !sources.length) return []
  const key = `${template.id}:${track}:${sources.join("|")}`
  const hit = cache.get(key)
  if (hit) return hit
  const images = sources.map((src) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.src = src
    return image
  })
  cache.set(key, images)
  return images
}

function tintedSource(image: HTMLImageElement, color: string) {
  const key = `${image.src}:${color}`
  const hit = tintCache.get(key)
  if (hit) return hit
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return image
  ctx.drawImage(image, 0, 0)
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = color
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  tintCache.set(key, canvas)
  return canvas
}

export function usesOperatorSelectedColor(template: BirdTemplate) {
  return template.kind === "builtin"
}

function drawArtistContour(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  phase: number,
  size: number,
  alpha: number,
  color: string,
  index: number,
  strength: number,
  pivotOverride?: { x: number; y: number },
) {
  const source = tintedSource(image, color)
  const sourceWidth = image.naturalWidth
  const sourceHeight = image.naturalHeight
  const width = size
  const height = width / Math.max(0.35, sourceWidth / sourceHeight)
  const pivot = pivotOverride ?? ARTIST_PIVOTS[index % ARTIST_PIVOTS.length]
  const pivotSourceX = sourceWidth * pivot.x
  const pivotX = -width / 2 + width * pivot.x
  const pivotY = -height / 2 + height * pivot.y
  const overlap = Math.max(2, sourceWidth * 0.025)
  const flex = Math.sin(phase * Math.PI * 2)
  const up = Math.max(flex, 0)
  const down = Math.max(-flex, 0)
  // Single-still fallback only. Canonical artist bundles use their authored
  // ordered PNGs above and never pass through this procedural rig.
  const leftAngle = (-34 * up + 30 * down) * strength * Math.PI / 180
  const rightAngle = (34 * up - 32 * down) * strength * Math.PI / 180

  const drawPart = (sourceX: number, sourcePartWidth: number, angle: number) => {
    ctx.save()
    ctx.translate(pivotX, pivotY)
    ctx.rotate(angle)
    ctx.translate(-pivotX, -pivotY)
    ctx.drawImage(
      source,
      sourceX,
      0,
      sourcePartWidth,
      sourceHeight,
      -width / 2 + (sourceX / sourceWidth) * width,
      -height / 2,
      (sourcePartWidth / sourceWidth) * width,
      height,
    )
    ctx.restore()
  }

  const drawRig = () => {
    drawPart(0, Math.min(sourceWidth, pivotSourceX + overlap), leftAngle)
    const rightStart = Math.max(0, pivotSourceX - overlap)
    drawPart(rightStart, sourceWidth - rightStart, rightAngle)
    // Restore the artist-drawn center notch above both rotating wing regions.
    const centerStart = Math.max(0, pivotSourceX - overlap)
    ctx.drawImage(
      source,
      centerStart,
      0,
      overlap * 2,
      sourceHeight,
      -width / 2 + (centerStart / sourceWidth) * width,
      -height / 2,
      (overlap * 2 / sourceWidth) * width,
      height,
    )
  }

  ctx.save()
  ctx.globalAlpha = alpha
  drawRig()
  // Exact-pixel overdraw preserves the thin source contour after deep
  // downscaling. It reinforces coverage only; the geometry and pivot remain
  // identical, so it cannot create a second wing or a thicker substitute bird.
  if (width < 92) {
    ctx.globalAlpha = alpha * (width < 48 ? 0.62 : 0.42)
    drawRig()
  }
  ctx.restore()
}

export async function preloadBirdTemplate(template: BirdTemplate) {
  const tracks: BirdAnimationTrack[] = ["flight", "approach", "perch", "launch"]
  const images = tracks.flatMap((track) => imagesFor(template, track))
  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true })
      image.addEventListener("error", () => reject(new Error(`Could not load bird artwork: ${image.src}`)), { once: true })
    })
  }))
}

export function drawBirdTemplate(
  ctx: CanvasRenderingContext2D,
  template: BirdTemplate,
  phase: number,
  size: number,
  alpha: number,
  color: string,
  variant = 0,
  wingStrength = 1,
  track: BirdAnimationTrack = "flight",
  temporalPhaseSpan = 0,
): boolean {
  let resolvedTrack = track
  let images = imagesFor(template, track)
  if (!images.length && track !== "flight") {
    images = imagesFor(template, "flight")
    resolvedTrack = "flight"
  }
  if (!images.length || images.some((image) => !image.complete || !image.naturalWidth)) return false
  const normalized = ((phase % 1) + 1) % 1
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  const drawExactFrame = (image: HTMLImageElement, opacity = 1) => {
    const source = usesOperatorSelectedColor(template) ? tintedSource(image, color) : image
    const aspect = image.naturalWidth / Math.max(1, image.naturalHeight)
    const width = size
    const height = Math.min(size * 1.2, width / Math.max(0.35, aspect))
    const anchor = template.trackAnchors?.[resolvedTrack] ?? { x: 0.5, y: 0.5 }
    const x = -width * anchor.x
    const y = -height * anchor.y
    ctx.save()
    ctx.globalAlpha = alpha * opacity
    ctx.drawImage(source, x, y, width, height)
    if (width < 92) {
      ctx.globalAlpha = alpha * opacity * (width < 48 ? 0.62 : 0.42)
      ctx.drawImage(source, x, y, width, height)
    }
    ctx.restore()
  }

  const layout = animationFrameLayout(template, resolvedTrack, images.length)
  if (template.playbackMode === "sequence" && layout.frameCount > 1) {
    const { frameCount, variantCount } = layout
    const variantIndex = Math.abs(Math.floor(variant)) % variantCount
    const samples = temporalFrameSamples(normalized, frameCount, temporalPhaseSpan)
    for (const sample of samples) {
      drawExactFrame(images[variantIndex * frameCount + sample.index], sample.weight)
    }
    return true
  }
  if ((template.kind === "raster" || template.kind === "sprites") && template.wingPivot && template.playbackMode !== "sequence") {
    drawArtistContour(
      ctx,
      images[0],
      normalized,
      size,
      alpha,
      color,
      0,
      wingStrength,
      template.wingPivot,
    )
    return true
  }
  const continuousFrame = normalized * images.length
  const index = template.kind === "builtin"
    ? Math.abs(Math.floor(variant)) % images.length
    : images.length === 1 ? 0 : Math.round(continuousFrame) % images.length
  const image = images[index]
  if (template.kind === "builtin") {
    // Legacy built-in compatibility only. Current curated built-ins declare
    // playbackMode="sequence" and return through the exact-frame branch.
    drawArtistContour(ctx, image, normalized, size, alpha, color, index, wingStrength)
    return true
  }
  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight)
  const width = size
  const height = Math.min(size * 1.2, width / Math.max(0.35, aspect))
  const drawFrame = (source: CanvasImageSource, opacity: number) => {
    ctx.globalAlpha = opacity
    ctx.drawImage(source, -width / 2, -height / 2, width, height)
    if (width < 92) {
      ctx.globalAlpha = opacity * (width < 48 ? 0.62 : 0.42)
      ctx.drawImage(source, -width / 2, -height / 2, width, height)
    }
  }

  ctx.save()
  drawFrame(image, alpha)
  // SVGs using currentColor cannot inherit from a canvas image. A light
  // source-atop wash still gives monochrome templates the chosen flock color.
  if (template.kind === "svg") {
    ctx.globalCompositeOperation = "source-atop"
    ctx.fillStyle = color
    ctx.globalAlpha = alpha * 0.8
    ctx.fillRect(-width / 2, -height / 2, width, height)
  }
  ctx.restore()
  return true
}

export function clearTemplateCache() {
  cache.clear()
  tintCache.clear()
}
