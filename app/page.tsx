"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bird } from "lucide-react"
import { Stage, type StageHandle, type StageMode } from "@/components/flock/stage"
import { Toolbar } from "@/components/flock/toolbar"
import { InspectorPanel } from "@/components/flock/inspector-panel"
import { ExportPanel } from "@/components/flock/export-panel"
import { AssetPanel } from "@/components/flock/asset-panel"
import { projectDuration } from "@/lib/flock/engine"
import { defaultProject, makeSequence } from "@/lib/flock/defaults"
import type { Project, Sequence, Style } from "@/lib/flock/types"

const STORAGE_KEY = "murmur.project.v1"

export default function Page() {
  const [project, setProject] = useState<Project>(() => defaultProject())
  const [activeId, setActiveId] = useState<string>("")
  const [mode, setMode] = useState<StageMode>("edit")
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showBackdrop, setShowBackdrop] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  const stageRef = useRef<StageHandle>(null)

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Project
        if (parsed?.sequences?.length) {
          const fallback = defaultProject()
          const migrated: Project = {
            ...fallback,
            ...parsed,
            scene: parsed.scene ?? (parsed.backdropDataUrl ? { kind: "image", dataUrl: parsed.backdropDataUrl, name: "Saved backdrop" } : { kind: "none" }),
            birdTemplate: parsed.birdTemplate ?? fallback.birdTemplate,
            sequences: parsed.sequences.map((sequence) => ({
              ...sequence,
              arrivalMode: sequence.arrivalMode ?? (sequence.landing ? "Perch" : "Fly through"),
            })),
          }
          setProject(migrated)
          setActiveId(migrated.sequences[0].id)
          setHydrated(true)
          return
        }
      }
    } catch {
      /* ignore */
    }
    setActiveId((p) => p || project.sequences[0]?.id || "")
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on change (after hydration).
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    } catch {
      /* ignore quota */
    }
  }, [project, hydrated])

  useEffect(() => {
    if (!activeId && project.sequences[0]) setActiveId(project.sequences[0].id)
  }, [activeId, project.sequences])

  const totalDuration = useMemo(() => projectDuration(project.sequences), [project.sequences])
  // Fall back to the first sequence if the active id doesn't resolve (e.g.
  // right after localStorage hydration swaps in a project with new ids).
  const active = project.sequences.find((s) => s.id === activeId) ?? project.sequences[0]
  const resolvedActiveId = active?.id ?? ""

  const updateSequence = useCallback((id: string, patch: Partial<Sequence>) => {
    setProject((p) => ({
      ...p,
      sequences: p.sequences.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }, [])

  const updateStyle = useCallback((patch: Partial<Style>) => {
    setProject((p) => ({ ...p, style: { ...p.style, ...patch } }))
  }, [])

  const addFlock = useCallback(() => {
    setProject((p) => {
      const seq = makeSequence("Calm Glide", `Flock ${p.sequences.length + 1}`)
      queueMicrotask(() => setActiveId(seq.id))
      return { ...p, sequences: [...p.sequences, seq] }
    })
    setMode("edit")
  }, [])

  const removeFlock = useCallback((id: string) => {
    setProject((p) => {
      const next = p.sequences.filter((s) => s.id !== id)
      const safe = next.length ? next : [makeSequence("Calm Glide", "Flock 1")]
      queueMicrotask(() => setActiveId((cur) => (cur === id ? safe[0].id : cur)))
      return { ...p, sequences: safe }
    })
  }, [])

  const reseed = useCallback(() => {
    if (!active) return
    updateSequence(active.id, { seed: Math.floor(Math.random() * 1e9) })
  }, [active, updateSequence])

  const onUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        setProject((p) => ({
          ...p,
          backdropDataUrl: dataUrl,
          scene: { kind: "image", dataUrl, name: file.name },
          viewport: { width: img.naturalWidth || 1600, height: img.naturalHeight || 900 },
        }))
        setShowBackdrop(true)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const togglePlay = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev
      if (next) stageRef.current?.play()
      else stageRef.current?.pause()
      return next
    })
  }, [])

  const restart = useCallback(() => {
    stageRef.current?.seek(0)
    stageRef.current?.play()
    setPlaying(true)
  }, [])

  const scrub = useCallback((t: number) => {
    setPlaying(false)
    stageRef.current?.pause()
    stageRef.current?.seek(t)
  }, [])

  const onEnded = useCallback(() => setPlaying(false), [])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Bird className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">Murmur</h1>
            <p className="mt-1 text-[11px] leading-none text-muted-foreground">Bird flock video builder</p>
          </div>
        </div>
        <p className="hidden max-w-md text-right text-[11px] leading-relaxed text-muted-foreground sm:block">
          Draw a flight path, drop a landing zone, tune the motion, then export a background video.
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* Stage column */}
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <Toolbar
            mode={mode}
            onMode={setMode}
            playing={playing}
            onTogglePlay={togglePlay}
            onRestart={restart}
            progress={progress}
            onScrub={scrub}
            totalDuration={totalDuration}
            sequences={project.sequences}
            activeId={resolvedActiveId}
            onSelect={setActiveId}
            onAdd={addFlock}
            onRemove={removeFlock}
            hasBackdrop={project.scene.kind !== "none" || !!project.backdropDataUrl}
            onUpload={onUpload}
            onClearBackdrop={() => setProject((p) => ({ ...p, backdropDataUrl: null, scene: { kind: "none" } }))}
            showBackdrop={showBackdrop}
            onToggleBackdrop={() => setShowBackdrop((s) => !s)}
          />

          <Stage
            ref={stageRef}
            sequences={project.sequences}
            activeId={resolvedActiveId}
            style={project.style}
            backdropDataUrl={project.backdropDataUrl}
            scene={project.scene}
            birdTemplate={project.birdTemplate}
            viewport={project.viewport}
            totalDuration={totalDuration}
            mode={mode}
            showGuides={!playing}
            showBackdrop={showBackdrop}
            onTime={setProgress}
            onEnded={onEnded}
            onUpdateSequence={updateSequence}
          />

          <HintBar mode={mode} />
        </section>

        {/* Inspector column */}
        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card lg:w-[360px]">
          <div className="border-b border-border">
            <AssetPanel
              scene={project.scene}
              birdTemplate={project.birdTemplate}
              onScene={(scene) => setProject((p) => ({ ...p, scene, backdropDataUrl: scene.kind === "image" ? scene.dataUrl : null }))}
              onBirdTemplate={(birdTemplate) => setProject((p) => ({ ...p, birdTemplate }))}
            />
          </div>
          <div className="border-b border-border">
            <InspectorPanel
              sequence={active}
              style={project.style}
              onUpdate={(patch) => active && updateSequence(active.id, patch)}
              onUpdateStyle={updateStyle}
              onReseed={reseed}
            />
          </div>
          <ExportPanel project={project} />
        </aside>
      </main>
    </div>
  )
}

function HintBar({ mode }: { mode: StageMode }) {
  const text =
    mode === "draw"
      ? "Draw mode — click and drag across the stage to sketch the flight path. The first point is where the flock enters."
      : mode === "landing"
        ? "Landing mode — drag a box over a card to mark where the flock gathers and dwells."
        : "Edit mode — drag any path point to reshape the flight, or drag the landing box to reposition it."
  return (
    <p className="rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {text}
    </p>
  )
}
