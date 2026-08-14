"use client"

import { useRef, useState } from "react"
import { Bird, Code2, ImageIcon, Link2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { BUILTIN_BIRD_TEMPLATE, type BirdTemplate, type SceneSource } from "@/lib/flock/types"

function fileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function AssetPanel({ scene, birdTemplate, onScene, onBirdTemplate }: {
  scene: SceneSource
  birdTemplate: BirdTemplate
  onScene: (scene: SceneSource) => void
  onBirdTemplate: (template: BirdTemplate) => void
}) {
  const [tab, setTab] = useState<"image" | "html" | "url">(scene.kind === "none" ? "image" : scene.kind)
  const [html, setHtml] = useState(scene.kind === "html" ? scene.html : '<article class="card"><h2>Your card</h2><p>Paste the real card markup here.</p></article>')
  const [css, setCss] = useState(scene.kind === "html" ? scene.css : 'body{display:grid;place-items:center;background:#eef2f5;font:16px system-ui}.card{width:360px;padding:32px;border-radius:24px;background:white;box-shadow:0 20px 60px #13223822;color:#172033}.card h2{margin:0 0 8px}.card p{margin:0;color:#657083}')
  const [url, setUrl] = useState(scene.kind === "url" ? scene.url : "")
  const imageRef = useRef<HTMLInputElement>(null)
  const birdRef = useRef<HTMLInputElement>(null)

  async function loadSceneImage(file: File) {
    onScene({ kind: "image", dataUrl: await fileData(file), name: file.name })
  }

  async function loadBirds(files: File[]) {
    const accepted = files.filter((file) => /image\/(svg\+xml|png|webp)/.test(file.type))
    if (!accepted.length) return
    const frames = await Promise.all(accepted.slice(0, 8).map(fileData))
    const kind = accepted.length > 1 ? "sprites" : accepted[0].type === "image/svg+xml" ? "svg" : "raster"
    onBirdTemplate({ id: `bird-${Date.now()}`, name: accepted.length > 1 ? `${accepted.length}-frame bird` : accepted[0].name, kind, frames, previewDataUrl: frames[0] })
  }

  return (
    <section className="flex flex-col gap-5 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Scene / card</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Position the flock against an image, real card markup, or an embeddable page.</p>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-md bg-secondary p-1">
        {([['image', ImageIcon, 'Image'], ['html', Code2, 'HTML/CSS'], ['url', Link2, 'URL']] as const).map(([id, Icon, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] ${tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}><Icon className="h-3 w-3" />{label}</button>
        ))}
      </div>
      {tab === "image" && <div className="flex flex-col gap-2"><input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadSceneImage(e.target.files[0])} /><Button variant="outline" size="sm" onClick={() => imageRef.current?.click()}><Upload className="h-3.5 w-3.5" />Upload card or page image</Button></div>}
      {tab === "html" && <div className="flex flex-col gap-2"><Label className="text-xs">HTML</Label><textarea value={html} onChange={(e) => setHtml(e.target.value)} className="min-h-24 rounded-md border border-input bg-background p-2 font-mono text-xs" /><Label className="text-xs">CSS</Label><textarea value={css} onChange={(e) => setCss(e.target.value)} className="min-h-28 rounded-md border border-input bg-background p-2 font-mono text-xs" /><Button size="sm" onClick={() => onScene({ kind: 'html', html, css, name: 'Pasted card' })}>Render card</Button></div>}
      {tab === "url" && <div className="flex flex-col gap-2"><Label className="text-xs">Public URL</Label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/card" className="h-9 rounded-md border border-input bg-background px-3 text-xs" /><Button size="sm" onClick={() => { try { const safe = new URL(url); if (safe.protocol === 'https:' || safe.protocol === 'http:') onScene({ kind: 'url', url: safe.href, name: safe.hostname }) } catch {} }}>Load reference</Button><p className="text-[10px] leading-relaxed text-muted-foreground">Sites with frame-blocking security headers will not load. URL scenes are reference-only in exports.</p></div>}
      {scene.kind !== "none" && <Button variant="ghost" size="sm" onClick={() => onScene({ kind: 'none' })}><X className="h-3.5 w-3.5" />Remove scene</Button>}

      <div className="h-px bg-border" />
      <div>
        <h3 className="text-sm font-semibold text-foreground">Bird artwork</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Upload SVG, transparent PNG/WebP, or 2–8 ordered wing frames.</p>
      </div>
      <input ref={birdRef} type="file" accept="image/svg+xml,image/png,image/webp" multiple className="hidden" onChange={(e) => e.target.files && loadBirds(Array.from(e.target.files))} />
      <button type="button" onClick={() => birdRef.current?.click()} className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/50 p-3 text-left hover:bg-secondary">
        {birdTemplate.previewDataUrl ? <img src={birdTemplate.previewDataUrl} alt="Bird template preview" className="h-10 w-14 object-contain" /> : <Bird className="h-8 w-8 text-primary" />}
        <span><span className="block text-sm font-medium text-foreground">{birdTemplate.name}</span><span className="text-[11px] text-muted-foreground">Click to upload or replace</span></span>
      </button>
      {birdTemplate.kind !== "builtin" && <Button variant="ghost" size="sm" onClick={() => onBirdTemplate(BUILTIN_BIRD_TEMPLATE)}>Use built-in ink bird</Button>}
    </section>
  )
}
