import type { BirdTemplate } from "./types"

const cache = new Map<string, HTMLImageElement[]>()

function imagesFor(template: BirdTemplate): HTMLImageElement[] {
  if (typeof window === "undefined" || template.kind === "builtin") return []
  const key = `${template.id}:${template.frames.join("|").length}`
  const hit = cache.get(key)
  if (hit) return hit
  const images = template.frames.map((src) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.src = src
    return image
  })
  cache.set(key, images)
  return images
}

export function drawBirdTemplate(
  ctx: CanvasRenderingContext2D,
  template: BirdTemplate,
  phase: number,
  size: number,
  alpha: number,
  color: string,
): boolean {
  const images = imagesFor(template)
  if (!images.length || images.some((image) => !image.complete || !image.naturalWidth)) return false
  const normalized = ((phase % 1) + 1) % 1
  const index = images.length === 1 ? 0 : Math.min(images.length - 1, Math.floor(normalized * images.length))
  const image = images[index]
  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight)
  const width = size
  const height = Math.min(size * 1.2, width / Math.max(0.35, aspect))

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(image, -width / 2, -height / 2, width, height)
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
}
