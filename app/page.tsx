"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bird } from "lucide-react"
import { Stage, type GeometrySelection, type StageHandle, type StageMode } from "@/components/flock/stage"
import { Toolbar } from "@/components/flock/toolbar"
import { InspectorPanel } from "@/components/flock/inspector-panel"
import { ExportPanel } from "@/components/flock/export-panel"
import { AssetPanel } from "@/components/flock/asset-panel"
import { projectDuration } from "@/lib/flock/engine"
import { deleteLanding, deletePathPoint } from "@/lib/flock/editing"
import { clearSequenceGeometry, defaultProject, makeSequence } from "@/lib/flock/defaults"
import { switchOutputVariant } from "@/lib/flock/output-variants"
import { loadStoredProject, saveStoredProject } from "@/lib/flock/project-storage"
import { BUILTIN_BIRD_TEMPLATE, DENSITY_COUNT, type OutputVariantId, type Project, type Sequence, type Style } from "@/lib/flock/types"

export default function Page() {
  const [project, setProject] = useState<Project>(() => defaultProject())
  const [activeId, setActiveId] = useState<string>("")
  const [mode, setMode] = useState<StageMode>("edit")
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showBackdrop, setShowBackdrop] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [selection, setSelection] = useState<GeometrySelection | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState({ canUndo: false, canRedo: false })

  const stageRef = useRef<StageHandle>(null)
  const projectRef = useRef(project)
  const historyRef = useRef<{ past: Project[]; future: Project[] }>({ past: [], future: [] })
  const lastCommitRef = useRef({ group: "", time: 0 })

  // Hydrate the versioned large-project store, with legacy localStorage fallback.
  useEffect(() => {
    let current = true
    const fallback = defaultProject()
    void loadStoredProject().then((parsed) => {
      if (!current) return
      if (parsed?.sequences?.length) {
          const migrated: Project = {
            ...fallback,
            ...parsed,
            style: {
              ...fallback.style,
              ...parsed.style,
              // The original release had no background-color control and
              // forced blue artwork onto near-black. Treat that untouched
              // legacy default as ivory; preserve any other saved choice.
              backgroundColor: parsed.style?.backgroundColor === "#0b1220"
                ? "#f3efe6"
                : parsed.style?.backgroundColor ?? fallback.style.backgroundColor,
            },
            scene: parsed.scene ?? (parsed.backdropDataUrl ? { kind: "image", dataUrl: parsed.backdropDataUrl, name: "Saved backdrop" } : { kind: "none" }),
            birdTemplate: parsed.birdTemplate?.kind === "builtin" ? BUILTIN_BIRD_TEMPLATE : parsed.birdTemplate ?? fallback.birdTemplate,
            activeVariant: parsed.activeVariant ?? fallback.activeVariant,
            variantStates: parsed.variantStates ?? fallback.variantStates,
            sequences: parsed.sequences.map((sequence) => {
              const landings = sequence.landings?.length
                ? sequence.landings
                : sequence.landing ? [sequence.landing] : []
              const arrivalMode = sequence.arrivalMode ?? (landings.length ? "Perch" : "Fly through")
              const migratedBirdCount = sequence.birdCount ?? DENSITY_COUNT[sequence.density]
              const legacyCount = landings.length ? migratedBirdCount : 0
              // Repair the original giant preset. It multiplied the entire dense
              // flock by 3.5 while keeping compact formation offsets, which made
              // saved projects reopen as a single overlapping knot.
              const legacyGiantPreset = sequence.spacingScale == null
                && (sequence.sizeScale ?? 1) >= 3
                && sequence.depthDirection === "Background to foreground"
              return {
                ...sequence,
                landings,
                landing: landings[0] ?? null,
                birdCount: migratedBirdCount,
                arrivalMode,
                perchCount: sequence.perchCount ?? (arrivalMode === "Perch" ? legacyCount : 0),
                gatherCount: sequence.gatherCount ?? (arrivalMode === "Gather" ? legacyCount : 0),
                loopPath: sequence.loopPath ?? false,
                speedMultiplier: sequence.speedMultiplier ?? 1,
                sizeScale: legacyGiantPreset ? 1.1 : sequence.sizeScale ?? 1,
                spacingScale: legacyGiantPreset ? 3.2 : sequence.spacingScale ?? 1.8,
                foregroundBirdCount: legacyGiantPreset
                  ? 1
                  : sequence.foregroundBirdCount ?? 0,
                foregroundBoost: legacyGiantPreset ? 2 : sequence.foregroundBoost ?? 1,
                depthDirection: sequence.depthDirection ?? "Flat plane",
                depthStrength: sequence.depthStrength ?? 0.75,
                lightColor: sequence.lightColor ?? sequence.color ?? fallback.style.inkColor,
                darkColor: sequence.darkColor ?? "#e2e8f0",
              }
            }),
          }
        projectRef.current = migrated
        setProject(migrated)
        setActiveId(migrated.sequences[0].id)
        setHydrated(true)
        return
      }
      if (!current) return
      setActiveId((active) => active || fallback.sequences[0]?.id || "")
      setHydrated(true)
    })
    return () => {
      current = false
    }
  }, [])

  // Persist on change (after hydration).
  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      void saveStoredProject(project).then(() => {
        setStorageWarning(null)
      }).catch(() => {
        setStorageWarning("This project is open, but the browser could not save it for reload. Keep this tab open and export your files now.")
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [project, hydrated])

  const totalDuration = useMemo(() => projectDuration(project.sequences), [project.sequences])
  // Fall back to the first sequence if the active id doesn't resolve (e.g.
  // right after localStorage hydration swaps in a project with new ids).
  const active = project.sequences.find((s) => s.id === activeId) ?? project.sequences[0]
  const resolvedActiveId = active?.id ?? ""

  const refreshHistory = useCallback(() => setHistoryAvailability({
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
  }), [])

  const commitProject = useCallback((
    updater: (current: Project) => Project,
    group = "project",
    coalesce = false,
  ) => {
    const current = projectRef.current
    const next = updater(current)
    if (next === current) return
    const now = Date.now()
    const mergeWithPrevious = coalesce
      && lastCommitRef.current.group === group
      && now - lastCommitRef.current.time < 700
    if (!mergeWithPrevious) {
      historyRef.current.past.push(current)
      if (historyRef.current.past.length > 60) historyRef.current.past.shift()
    }
    historyRef.current.future = []
    lastCommitRef.current = { group, time: now }
    projectRef.current = next
    setProject(next)
    refreshHistory()
  }, [refreshHistory])

  const checkpointProject = useCallback(() => {
    const current = projectRef.current
    historyRef.current.past.push(current)
    if (historyRef.current.past.length > 60) historyRef.current.past.shift()
    historyRef.current.future = []
    lastCommitRef.current = { group: "", time: 0 }
    refreshHistory()
  }, [refreshHistory])

  const undo = useCallback(() => {
    const previous = historyRef.current.past.pop()
    if (!previous) return
    stageRef.current?.pause()
    setPlaying(false)
    historyRef.current.future.push(projectRef.current)
    projectRef.current = previous
    setProject(previous)
    setSelection(null)
    lastCommitRef.current = { group: "", time: 0 }
    refreshHistory()
  }, [refreshHistory])

  const redo = useCallback(() => {
    const next = historyRef.current.future.pop()
    if (!next) return
    stageRef.current?.pause()
    setPlaying(false)
    historyRef.current.past.push(projectRef.current)
    projectRef.current = next
    setProject(next)
    setSelection(null)
    lastCommitRef.current = { group: "", time: 0 }
    refreshHistory()
  }, [refreshHistory])

  const updateSequence = useCallback((id: string, patch: Partial<Sequence>) => {
    const group = `sequence:${id}:${Object.keys(patch).sort().join(",")}`
    commitProject((p) => ({
      ...p,
      sequences: p.sequences.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }), group, true)
  }, [commitProject])

  const updateSequenceOnCanvas = useCallback((id: string, patch: Partial<Sequence>) => {
    const current = projectRef.current
    const next = {
      ...current,
      sequences: current.sequences.map((sequence) => sequence.id === id ? { ...sequence, ...patch } : sequence),
    }
    projectRef.current = next
    setProject(next)
  }, [])

  const updateStyle = useCallback((patch: Partial<Style>) => {
    commitProject((p) => ({ ...p, style: { ...p.style, ...patch } }), `style:${Object.keys(patch).sort().join(",")}`, true)
  }, [commitProject])

  const addFlock = useCallback(() => {
    commitProject((p) => {
      const seq = makeSequence("Calm Glide", `Flock ${p.sequences.length + 1}`)
      queueMicrotask(() => setActiveId(seq.id))
      return { ...p, sequences: [...p.sequences, seq] }
    }, "add-flock")
    setMode("edit")
  }, [commitProject])

  const removeFlock = useCallback((id: string) => {
    commitProject((p) => {
      const next = p.sequences.filter((s) => s.id !== id)
      const safe = next.length ? next : [makeSequence("Calm Glide", "Flock 1")]
      queueMicrotask(() => setActiveId((cur) => (cur === id ? safe[0].id : cur)))
      return { ...p, sequences: safe }
    }, "remove-flock")
    setSelection(null)
  }, [commitProject])

  const startOver = useCallback((id: string) => {
    stageRef.current?.pause()
    stageRef.current?.seek(0)
    setPlaying(false)
    setProgress(0)
    setMode("draw")
    commitProject((p) => ({
      ...p,
      sequences: p.sequences.map((sequence) => (
        sequence.id === id ? clearSequenceGeometry(sequence) : sequence
      )),
    }), "start-over")
    setSelection(null)
  }, [commitProject])

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
        commitProject((p) => ({
          ...p,
          backdropDataUrl: dataUrl,
          scene: { kind: "image", dataUrl, name: file.name },
        }), "scene-image")
        setShowBackdrop(true)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [commitProject])

  const selectOutputVariant = useCallback((variant: OutputVariantId) => {
    stageRef.current?.pause()
    stageRef.current?.seek(0)
    setPlaying(false)
    setProgress(0)
    setMode("edit")
    commitProject((current) => switchOutputVariant(current, variant), "output-variant")
    setSelection(null)
  }, [commitProject])

  const deleteSelection = useCallback(() => {
    if (!active || !selection) return
    stageRef.current?.pause()
    setPlaying(false)
    commitProject((current) => ({
      ...current,
      sequences: current.sequences.map((sequence) => {
        if (sequence.id !== active.id) return sequence
        return selection.kind === "point"
          ? deletePathPoint(sequence, selection.index)
          : deleteLanding(sequence, selection.index)
      }),
    }), `delete-${selection.kind}`)
    setSelection(null)
  }, [active, commitProject, selection])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.matches("input, textarea, select, [contenteditable='true']")
      if (typing) return
      const command = event.metaKey || event.ctrlKey
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (command && event.key.toLowerCase() === "y") {
        event.preventDefault()
        redo()
      } else if ((event.key === "Delete" || event.key === "Backspace") && selection) {
        event.preventDefault()
        deleteSelection()
      } else if (event.key === "Escape") {
        setSelection(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [deleteSelection, redo, selection, undo])

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
      {storageWarning && (
        <p className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-xs text-destructive" role="alert">
          {storageWarning}
        </p>
      )}

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col items-start gap-4 p-4 xl:flex-row">
        {/* Stage column */}
        <section className="murmur-stage-column flex w-full min-w-0 flex-1 flex-col gap-4 xl:sticky xl:top-4">
          <Toolbar
            mode={mode}
            onMode={(nextMode) => {
              setMode(nextMode)
              if (nextMode !== "edit") setSelection(null)
            }}
            playing={playing}
            onTogglePlay={togglePlay}
            onRestart={restart}
            progress={progress}
            onScrub={scrub}
            totalDuration={totalDuration}
            sequences={project.sequences}
            activeId={resolvedActiveId}
            onSelect={(id) => {
              setActiveId(id)
              setSelection(null)
            }}
            onAdd={addFlock}
            onRemove={removeFlock}
            onStartOver={startOver}
            hasBackdrop={project.scene.kind !== "none" || !!project.backdropDataUrl}
            onUpload={onUpload}
            onClearBackdrop={() => commitProject((p) => ({ ...p, backdropDataUrl: null, scene: { kind: "none" } }), "clear-scene")}
            showBackdrop={showBackdrop}
            onToggleBackdrop={() => setShowBackdrop((s) => !s)}
            previewTheme={project.style.previewTheme}
            onPreviewTheme={(previewTheme) => updateStyle({ previewTheme })}
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
            activeVariant={project.activeVariant}
            totalDuration={totalDuration}
            mode={mode}
            showGuides={!playing}
            showBackdrop={showBackdrop}
            onTime={setProgress}
            onEnded={onEnded}
            onUpdateSequence={updateSequenceOnCanvas}
            onEditStart={checkpointProject}
            selection={selection}
            onSelection={setSelection}
            canUndo={historyAvailability.canUndo}
            canRedo={historyAvailability.canRedo}
            onUndo={undo}
            onRedo={redo}
            onDeleteSelection={deleteSelection}
          />

          <HintBar mode={mode} />
        </section>

        {/* Inspector column */}
        <aside className="murmur-cockpit flex w-full shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card xl:max-h-[calc(100vh-5.5rem)] xl:w-[420px] xl:overflow-y-auto">
          <div className="border-b border-border">
            <AssetPanel
              scene={project.scene}
              flockName={active?.name ?? "Selected flock"}
              birdTemplate={active?.birdTemplate ?? project.birdTemplate}
              activeVariant={project.activeVariant}
              viewport={project.viewport}
              onScene={(scene) => commitProject((p) => ({ ...p, scene, backdropDataUrl: scene.kind === "image" ? scene.dataUrl : null }), "scene-source")}
              onBirdTemplate={(birdTemplate) => active && updateSequence(active.id, { birdTemplate })}
              onOutputVariant={selectOutputVariant}
            />
          </div>
          <div className="border-b border-border">
            <InspectorPanel
              sequence={active}
              style={project.style}
              onUpdate={(patch) => active && updateSequence(active.id, patch)}
              onUpdateStyle={updateStyle}
              onReseed={reseed}
              onAddLanding={() => setMode("landing")}
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
        ? "Add landing mode — drag a box for the next stop. Repeat to add multiple landing events."
        : "Edit mode — click a path dot or landing to select it. Drag to move it, or use Delete selected on the canvas. Undo and Redo are beside it."
  return (
    <p className="rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {text}
    </p>
  )
}
