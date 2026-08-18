"use client"
/* eslint-disable @next/next/no-img-element -- local/data URL artwork previews cannot use next/image */

import { useRef, useState } from "react"
import { Bird, CheckCircle2, Code2, FileDown, ImageIcon, Link2, Monitor, Smartphone, Tablet, Upload, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Disclosure } from "@/components/flock/disclosure"
import {
  parseBirdArtworkManifest,
  type BirdArtworkTrackName,
  type ParsedBirdArtworkManifest,
} from "@/lib/flock/artwork-manifest"
import { OUTPUT_VARIANTS } from "@/lib/flock/output-variants"
import { BUILTIN_ARTWORK_OPTIONS, BUILTIN_BIRD_TEMPLATE, type BirdTemplate, type OutputVariantId, type SceneSource } from "@/lib/flock/types"

const TRACKS: BirdArtworkTrackName[] = ["flight", "approach", "perch", "launch"]

type InputFile = File & { webkitRelativePath?: string }

function inputPath(file: InputFile) {
  return (file.webkitRelativePath || file.name).replace(/\\/g, "/").replace(/^\.\//, "")
}

function baseName(path: string) {
  return path.split("/").at(-1) ?? path
}

function trackFromPath(path: string): BirdArtworkTrackName | null {
  const normalized = `/${path.toLowerCase().replace(/\\/g, "/")}/`
  if (/\/(flight|wing_frames)\//.test(normalized)) return "flight"
  if (/\/(01_)?landing[_-]approach\//.test(normalized) || /\/approach\//.test(normalized)) return "approach"
  if (/\/(02_)?perch[_-]settle[_-]hold\//.test(normalized) || /\/perch\//.test(normalized)) return "perch"
  if (/\/(03_)?launch[_-]flyoff\//.test(normalized) || /\/launch\//.test(normalized)) return "launch"
  return null
}

function ordered(files: InputFile[]) {
  return [...files].sort((a, b) => baseName(inputPath(a)).localeCompare(baseName(inputPath(b)), undefined, { numeric: true }))
}

function mimeFor(path: string) {
  if (/\.png$/i.test(path)) return "image/png"
  if (/\.webp$/i.test(path)) return "image/webp"
  if (/\.svg$/i.test(path)) return "image/svg+xml"
  if (/\.json$/i.test(path)) return "application/json"
  return "application/octet-stream"
}

async function expandInputFiles(files: InputFile[]) {
  const zipFiles = files.filter((file) => /\.zip$/i.test(file.name) || /zip/.test(file.type))
  if (!zipFiles.length) return files
  if (files.length !== 1 || zipFiles.length !== 1) {
    throw new Error("Choose one bird ZIP by itself, or choose one manifest with its PNG frames.")
  }
  const { default: JSZip } = await import("jszip")
  const zip = await JSZip.loadAsync(zipFiles[0])
  const entries = Object.values(zip.files).filter((entry) => (
    !entry.dir && /\.(json|png|webp|svg)$/i.test(entry.name) && !/(^|\/)__MACOSX\//.test(entry.name)
  ))
  const unpacked = await Promise.all(entries.map(async (entry) => {
    const path = entry.name.replace(/^\.\//, "")
    const file = new File([await entry.async("blob")], baseName(path), { type: mimeFor(path) }) as InputFile
    Object.defineProperty(file, "webkitRelativePath", { value: path })
    return file
  }))
  if (!unpacked.length) throw new Error("That ZIP contains no manifest or supported transparent artwork files.")
  return unpacked
}

function resolveManifestFiles(
  images: InputFile[],
  names: string[],
  track: BirdArtworkTrackName,
) {
  return names.map((declared) => {
    const normalized = declared.replace(/\\/g, "/").replace(/^\.\//, "")
    const declaredBase = baseName(normalized)
    let candidates = images.filter((file) => {
      const path = inputPath(file)
      return path === normalized || path.endsWith(`/${normalized}`) || baseName(path) === declaredBase
    })
    if (candidates.length > 1) {
      const inTrack = candidates.filter((file) => trackFromPath(inputPath(file)) === track)
      if (inTrack.length) candidates = inTrack
    }
    if (candidates.length !== 1) {
      throw new Error(`Could not match ${track} frame ${declared} to exactly one file in the bundle.`)
    }
    return candidates[0]
  })
}

function inferTrackFiles(images: InputFile[]) {
  const tracks: Partial<Record<BirdArtworkTrackName, InputFile[]>> = {}
  for (const track of TRACKS) {
    const matches = images.filter((file) => trackFromPath(inputPath(file)) === track)
    if (matches.length) tracks[track] = ordered(matches)
  }
  if (!tracks.flight) {
    const ungrouped = images.filter((file) => trackFromPath(inputPath(file)) == null)
    if (ungrouped.length) tracks.flight = ordered(ungrouped)
  }
  return tracks
}

function fileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function AssetPanel({ scene, flockName, birdTemplate, activeVariant, viewport, onScene, onBirdTemplate, onOutputVariant }: {
  scene: SceneSource
  flockName: string
  birdTemplate: BirdTemplate
  activeVariant: OutputVariantId
  viewport: { width: number; height: number }
  onScene: (scene: SceneSource) => void
  onBirdTemplate: (template: BirdTemplate) => void
  onOutputVariant: (variant: OutputVariantId) => void
}) {
  const [tab, setTab] = useState<"image" | "html">(scene.kind === "html" ? "html" : "image")
  const [html, setHtml] = useState(scene.kind === "html" ? scene.html : '<article class="card"><h2>Your card</h2><p>Paste the real card markup here.</p></article>')
  const [css, setCss] = useState(scene.kind === "html" ? scene.css : 'body{display:grid;place-items:center;background:#eef2f5;font:16px system-ui}.card{width:360px;padding:32px;border-radius:24px;background:white;box-shadow:0 20px 60px #13223822;color:#172033}.card h2{margin:0 0 8px}.card p{margin:0;color:#657083}')
  const [url, setUrl] = useState(scene.kind === "url" ? scene.url : "")
  const [sceneError, setSceneError] = useState("")
  const [birdQa, setBirdQa] = useState("")
  const imageRef = useRef<HTMLInputElement>(null)
  const birdRef = useRef<HTMLInputElement>(null)

  async function loadSceneImage(file: File) {
    onScene({ kind: "image", dataUrl: await fileData(file), name: file.name })
  }

  function loadSceneUrl() {
    try {
      const safe = new URL(url.trim())
      if (safe.protocol !== "https:" && safe.protocol !== "http:") throw new Error("Unsupported protocol")
      onScene({ kind: "url", url: safe.href, name: safe.hostname })
      setSceneError("")
    } catch {
      setSceneError("Paste a complete background URL beginning with http:// or https://.")
    }
  }

  async function loadBirds(originalFiles: File[]) {
    setBirdQa("Checking the artist bundle…")
    let files: InputFile[]
    try {
      files = await expandInputFiles(originalFiles as InputFile[])
    } catch (error) {
      setBirdQa(`Not imported: ${(error as Error).message}`)
      return
    }
    const manifestFiles = files.filter((file) => file.name.toLowerCase().endsWith(".json"))
    if (manifestFiles.length > 1) {
      setBirdQa("Not imported: the bird bundle must contain exactly one manifest.json.")
      return
    }
    let manifestRig: ParsedBirdArtworkManifest | null = null
    if (manifestFiles[0]) {
      try {
        manifestRig = parseBirdArtworkManifest(JSON.parse(await manifestFiles[0].text()))
      } catch (error) {
        setBirdQa(`Not imported: ${(error as Error).message}`)
        return
      }
    }
    const images = files
      .filter((file) => /image\/(svg\+xml|png|webp)/.test(file.type) || /\.(svg|png|webp)$/i.test(file.name))
    if (!images.length) {
      setBirdQa("Not imported: no supported transparent PNG, WebP, or SVG artwork was found.")
      return
    }

    let trackFiles: Partial<Record<BirdArtworkTrackName, InputFile[]>>
    try {
      trackFiles = manifestRig
        ? Object.fromEntries(TRACKS.flatMap((track) => {
            const names = manifestRig?.tracks[track]
            return names ? [[track, resolveManifestFiles(images, names, track)]] : []
          }))
        : inferTrackFiles(images)
    } catch (error) {
      setBirdQa(`Not imported: ${(error as Error).message}`)
      return
    }

    const flightFiles = trackFiles.flight ?? []
    const actionTracks = [trackFiles.approach, trackFiles.perch, trackFiles.launch]
    if (!flightFiles.length) {
      setBirdQa("Not imported: the bundle needs one numbered flight sequence.")
      return
    }
    if (actionTracks.some(Boolean) && !actionTracks.every((track) => track?.length)) {
      setBirdQa("Not imported: landing artwork must include approach, perch, and launch tracks together.")
      return
    }
    for (const track of TRACKS) {
      const selected = trackFiles[track]
      if (!selected?.length) continue
      if (selected.length > 16 || (selected.length > 1 && selected.some((file) => !/^\d{2}[_-]/.test(baseName(inputPath(file)))))) {
        setBirdQa(`Not imported: ${track} frames must be 2–16 files beginning 01_, 02_, 03_ … in order.`)
        return
      }
    }

    const rasterChecks = await Promise.all(TRACKS.flatMap((track) => (trackFiles[track] ?? []).map(async (file) => {
      if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) return null
      const bitmap = await createImageBitmap(file)
      const sample = document.createElement("canvas")
      sample.width = Math.min(256, bitmap.width)
      sample.height = Math.min(256, bitmap.height)
      const context = sample.getContext("2d", { willReadFrequently: true })
      context?.drawImage(bitmap, 0, 0, sample.width, sample.height)
      const pixels = context?.getImageData(0, 0, sample.width, sample.height).data
      let hasTransparent = false
      let hasVisible = false
      if (pixels) {
        for (let index = 3; index < pixels.length; index += 4) {
          if (pixels[index] < 250) hasTransparent = true
          if (pixels[index] > 5) hasVisible = true
          if (hasTransparent && hasVisible) break
        }
      }
      const result = { track, file, width: bitmap.width, height: bitmap.height, hasTransparent, hasVisible }
      bitmap.close()
      return result
    })))
    const raster = rasterChecks.filter((value): value is NonNullable<typeof value> => !!value)
    if (raster.some((value) => !value.hasTransparent || !value.hasVisible)) {
      setBirdQa("Not imported: every raster frame must contain both transparent background pixels and visible artwork.")
      return
    }
    for (const track of TRACKS) {
      const checks = raster.filter((value) => value.track === track)
      if (checks.length > 1 && checks.some((value) => value.width !== checks[0].width || value.height !== checks[0].height)) {
        setBirdQa(`Not imported: every ${track} frame must use one identical pixel canvas.`)
        return
      }
      const declaredCanvas = track === "flight" ? manifestRig?.canvases.flight : manifestRig?.canvases.action
      if (declaredCanvas && checks.some((value) => value.width !== declaredCanvas.width || value.height !== declaredCanvas.height)) {
        setBirdQa(`Not imported: ${track} PNG dimensions do not match manifest.json.`)
        return
      }
    }

    const dataTracks = Object.fromEntries(await Promise.all(TRACKS.flatMap((track) => {
      const selected = trackFiles[track]
      return selected?.length ? [Promise.all(selected.map(fileData)).then((data) => [track, data])] : []
    }))) as Partial<Record<BirdArtworkTrackName, string[]>>
    const frames = dataTracks.flight ?? []
    const firstFlight = flightFiles[0]
    const kind = frames.length > 1 ? "sprites" : firstFlight.type === "image/svg+xml" ? "svg" : "raster"
    onBirdTemplate({
      id: `bird-${Date.now()}`,
      name: manifestRig?.name ?? (frames.length > 1 ? `${frames.length}-frame artist bird` : firstFlight.name),
      kind,
      direction: manifestRig?.direction ?? "left",
      playbackMode: frames.length > 1 ? "sequence" : kind === "raster" ? "continuous-rig" : undefined,
      framesPerVariant: frames.length > 1 ? frames.length : undefined,
      frames,
      previewDataUrl: frames[0],
      wingPivot: manifestRig?.normalizedPivot ?? (kind === "raster" ? { x: 0.5, y: 0.5 } : undefined),
      trackAnchors: manifestRig ? {
        flight: manifestRig.canvases.flight.normalizedAnchor,
        ...(manifestRig.canvases.action ? {
          approach: manifestRig.canvases.action.normalizedAnchor,
          perch: manifestRig.canvases.action.normalizedAnchor,
          launch: manifestRig.canvases.action.normalizedAnchor,
        } : {}),
      } : undefined,
      actionFrames: dataTracks.approach && dataTracks.perch && dataTracks.launch ? {
        approach: dataTracks.approach,
        perch: dataTracks.perch,
        launch: dataTracks.launch,
      } : undefined,
    })
    const width = raster.find((value) => value.track === "flight")?.width
    const actionCount = (dataTracks.approach?.length ?? 0) + (dataTracks.perch?.length ?? 0) + (dataTracks.launch?.length ?? 0)
    setBirdQa(width && width < 960
      ? `Imported, but ${width}px is below the 960px support minimum and may pixelate. Use 1600px artwork for foreground birds.`
      : actionCount
        ? `Passed: ${frames.length} flight poses plus ${actionCount} matched landing-action poses. Murmur will switch tracks automatically.`
        : manifestRig && frames.length > 1
          ? `Passed: ${frames.length} ordered poses plus manifest anchor. Murmur will play the supplied artwork cycle directly.`
        : frames.length === 1 && kind === "raster"
        ? `Passed as a static-master fallback: one transparent ${width ?? ""}px PNG. For the best authored motion, import all eight numbered poses from this bird's bundle.`
      : `Passed input checks: ${frames.length} ordered frame${frames.length === 1 ? "" : "s"}, matching canvas, visible alpha${width ? `, ${width}px wide` : ""}. Murmur will play the numbered source cycle directly.`)
  }

  const sceneSummary = scene.kind === "none"
    ? "No scene selected — optional"
    : scene.kind === "image"
      ? `Image · ${scene.name}`
      : scene.kind === "html"
        ? `HTML/CSS · ${scene.name}`
        : `URL · ${scene.name}`
  const artworkStatus = birdTemplate.actionFrames
    ? "Flight, approach, perch, and launch ready"
    : `${birdTemplate.frames.length} flight frame${birdTemplate.frames.length === 1 ? "" : "s"} · landing uses flight artwork`

  return (
    <section className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Step 1</p>
        <h3 className="mt-0.5 text-sm font-semibold text-foreground">Add your background</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Paste the page or design URL you want behind the motion.</p>
      </div>

      <form
        className="rounded-lg border border-primary/35 bg-primary/[0.06] p-3"
        onSubmit={(event) => {
          event.preventDefault()
          loadSceneUrl()
        }}
      >
        <Label htmlFor="background-url" className="text-[11px] font-medium uppercase tracking-wide text-foreground">Background URL</Label>
        <div className="mt-2 flex flex-col gap-2">
          <input
            id="background-url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              if (sceneError) setSceneError("")
            }}
            placeholder="Paste https://…"
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" className="h-10 w-full"><Link2 className="h-3.5 w-3.5" />Use URL</Button>
        </div>
        {sceneError && <p role="alert" className="mt-2 text-[11px] text-destructive">{sceneError}</p>}
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Current background: {sceneSummary}. Press Enter or click Use URL.</p>
        {scene.kind !== "none" && <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => onScene({ kind: 'none' })}><X className="h-3.5 w-3.5" />Remove background</Button>}
      </form>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Output variation</p>
        <h4 className="mt-0.5 text-sm font-semibold text-foreground">Choose the screen you are designing</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Each screen keeps its own flight path and landings.</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {OUTPUT_VARIANTS.map((variant, index) => {
            const Icon = [Monitor, Tablet, Smartphone][index]
            const selected = activeVariant === variant.id
            return (
              <button
                key={variant.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onOutputVariant(variant.id)}
                className={`flex min-w-0 flex-col items-center rounded-md border px-1.5 py-2 text-center transition-colors ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="mt-1 text-[10px] font-semibold leading-tight">{variant.label}</span>
                <span className="mt-0.5 text-[9px] leading-tight">{variant.viewport.width} × {variant.viewport.height}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Editing now: <span className="font-medium text-foreground">{viewport.width} × {viewport.height}</span>. The page is rendered at this real viewport, then scaled to fit the editor.</p>
      </div>

      <Disclosure label="Other background options" summary="Upload an image or paste HTML/CSS instead.">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
          {([['image', ImageIcon, 'Image upload'], ['html', Code2, 'HTML/CSS']] as const).map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] ${tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}><Icon className="h-3 w-3" />{label}</button>
          ))}
        </div>
        {tab === "image" && <div className="flex flex-col gap-2"><input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadSceneImage(e.target.files[0])} /><Button variant="outline" size="sm" onClick={() => imageRef.current?.click()}><Upload className="h-3.5 w-3.5" />Upload card or page image</Button></div>}
        {tab === "html" && <div className="flex flex-col gap-2"><Label className="text-xs">HTML</Label><textarea value={html} onChange={(e) => setHtml(e.target.value)} className="min-h-24 rounded-md border border-input bg-background p-2 font-mono text-xs" /><Label className="text-xs">CSS</Label><textarea value={css} onChange={(e) => setCss(e.target.value)} className="min-h-28 rounded-md border border-input bg-background p-2 font-mono text-xs" /><Button size="sm" onClick={() => onScene({ kind: 'html', html, css, name: 'Pasted card' })}>Render card</Button></div>}
      </Disclosure>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Artwork</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">The selected design is ready. Open a choice only when you need different artwork.</p>
      </div>

      <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md border border-black/10 bg-[#f3efe6]">
            {birdTemplate.previewDataUrl ? <img src={birdTemplate.previewDataUrl} alt="Selected artwork preview" className="h-12 w-full object-contain" /> : <Bird className="h-8 w-8 text-primary" />}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">Selected artwork · {flockName}</span>
            <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{birdTemplate.name}</span>
            <span className="mt-1 flex items-center gap-1 text-[10px] leading-tight text-muted-foreground"><CheckCircle2 className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />{artworkStatus}</span>
          </span>
        </div>
      </div>

      <Disclosure label="Choose or import artwork" summary="Open the visual library only when you want a different design.">
        <p className="text-[10px] leading-relaxed text-muted-foreground">Choose among {BUILTIN_ARTWORK_OPTIONS.length} complete art designs. Murmur handles their motion frames automatically.</p>
        <div className="grid grid-cols-2 gap-2">
          {BUILTIN_ARTWORK_OPTIONS.map((option) => {
            const selected = option.id === birdTemplate.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onBirdTemplate(option)}
                className={`rounded-md border p-2 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-secondary/50 hover:border-primary/50"}`}
              >
                <span className="flex h-12 items-center justify-center rounded border border-black/10 bg-[#f3efe6]">
                  <img src={option.previewDataUrl} alt="" className="h-10 w-full object-contain" aria-hidden="true" />
                </span>
                <span className="mt-1.5 block text-xs font-medium leading-tight text-foreground">{option.name}</span>
                {option.description && <span className="mt-1 block text-[9px] leading-snug text-muted-foreground">{option.description}</span>}
              </button>
            )
          })}
        </div>
        <input
          ref={birdRef}
          type="file"
          accept="image/svg+xml,image/png,image/webp,application/json,application/zip,.json,.zip"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void loadBirds(Array.from(event.target.files))
            event.target.value = ""
          }}
        />
        <Button variant="outline" size="sm" onClick={() => birdRef.current?.click()}><Upload className="h-3.5 w-3.5" />Import artwork bundle</Button>
        {birdQa && <p role="status" className="text-[10px] leading-relaxed text-muted-foreground">{birdQa}</p>}
        <p className="text-[10px] leading-relaxed text-muted-foreground">Best input: one ZIP containing one identity&apos;s flight, approach, perch, and launch tracks. Add another Flock only when the composition needs a different design.</p>
      </Disclosure>

      {birdTemplate.actionFrames && (
        <Disclosure label="Inspect motion stages" summary="Flight → approach → perch → launch · quality-control view">
          <div className="grid grid-cols-4 gap-1.5">
            {([
              ["Flight", birdTemplate.frames[0]],
              ["Approach", birdTemplate.actionFrames.approach.at(-1)],
              ["Perch", birdTemplate.actionFrames.perch[3]],
              ["Launch", birdTemplate.actionFrames.launch[4]],
            ] as const).map(([label, source]) => (
              <div key={label} className="text-center">
                <span className="flex h-10 items-center justify-center rounded border border-black/10 bg-[#f3efe6]"><img src={source} alt="" className="h-9 w-full object-contain" aria-hidden="true" /></span>
                <span className="mt-1 block text-[8px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">These are the authored stage images Murmur switches between automatically. You do not need to manage them during normal editing.</p>
        </Disclosure>
      )}

      <Disclosure label="Artwork setup" summary="Source direction, reset, and production instructions.">
        <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Artwork source faces</span>
          <select
            aria-label="Artwork source direction"
            value={birdTemplate.direction ?? "left"}
            onChange={(event) => onBirdTemplate({ ...birdTemplate, direction: event.target.value as "left" | "right" })}
            className="h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        <p className="text-[10px] leading-relaxed text-muted-foreground">Murmur mirrors and banks this source automatically from Enter, the drawn path, and Exit. This setting describes the input artwork, not a forced flight direction.</p>
        {birdTemplate.id !== BUILTIN_BIRD_TEMPLATE.id && <Button variant="ghost" size="sm" onClick={() => onBirdTemplate(BUILTIN_BIRD_TEMPLATE)}>Use curated four-role artist flock</Button>}
        <a
          href="/api/bird-artwork-agent-prompt"
          download="murmur-bird-artwork-agent-prompt.md"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <FileDown className="h-3.5 w-3.5" />Download artwork production guide
        </a>
      </Disclosure>
    </section>
  )
}
