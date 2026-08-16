"use client"

import { useRef, useState } from "react"
import {
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  MousePointer2,
  Square,
  Upload,
  X,
  Eye,
  EyeOff,
  Trash2,
  Moon,
  Sun,
} from "lucide-react"
import type { StageMode } from "./stage"
import type { Sequence } from "@/lib/flock/types"
import { Button } from "@/components/ui/button"

type Props = {
  mode: StageMode
  onMode: (m: StageMode) => void
  playing: boolean
  onTogglePlay: () => void
  onRestart: () => void
  progress: number // 0..1
  onScrub: (t: number) => void
  totalDuration: number
  sequences: Sequence[]
  activeId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onStartOver: (id: string) => void
  hasBackdrop: boolean
  onUpload: (file: File) => void
  onClearBackdrop: () => void
  showBackdrop: boolean
  onToggleBackdrop: () => void
  previewTheme: "light" | "dark"
  onPreviewTheme: (theme: "light" | "dark") => void
}

const MODES: { id: StageMode; label: string; icon: typeof Pencil; hint: string }[] = [
  { id: "draw", label: "Path", icon: Pencil, hint: "Drag to draw the flight path" },
  { id: "landing", label: "Add landing", icon: Square, hint: "Drag another landing stop; repeat for multiple stops" },
  { id: "edit", label: "Edit", icon: MousePointer2, hint: "Drag points or any landing box" },
]

export function Toolbar({
  mode,
  onMode,
  playing,
  onTogglePlay,
  onRestart,
  progress,
  onScrub,
  totalDuration,
  sequences,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onStartOver,
  hasBackdrop,
  onUpload,
  onClearBackdrop,
  showBackdrop,
  onToggleBackdrop,
  previewTheme,
  onPreviewTheme,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmStartOverId, setConfirmStartOverId] = useState<string | null>(null)
  const seconds = (progress * totalDuration).toFixed(1)

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: modes + backdrop */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          {MODES.map((m) => {
            const Icon = m.icon
            const on = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onMode(m.id)}
                title={m.hint}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          aria-label={`Preview ${previewTheme === "light" ? "dark" : "light"} theme bird palette`}
          aria-pressed={previewTheme === "dark"}
          onClick={() => onPreviewTheme(previewTheme === "light" ? "dark" : "light")}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
          title="Switch only the bird palette; the authored motion and background stay aligned"
        >
          {previewTheme === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {previewTheme === "light" ? "Light-theme birds" : "Dark-theme birds"}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ""
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            {hasBackdrop ? "Replace scene image" : "Upload scene image"}
          </Button>
          {hasBackdrop && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={onToggleBackdrop}
                title={showBackdrop ? "Hide the background image" : "Show the background image"}
                aria-label={showBackdrop ? "Hide background image" : "Show background image"}
                aria-pressed={showBackdrop}
                className="min-w-[136px] justify-center"
              >
                {showBackdrop ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showBackdrop ? "Hide background" : "Show background"}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClearBackdrop} title="Remove backdrop">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Row 2: transport */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
        <Button size="icon" variant="secondary" onClick={onTogglePlay} title={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onRestart} title="Restart">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => onScrub(Number(e.target.value) / 1000)}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          aria-label="Timeline scrubber"
        />
        <span className="w-16 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {seconds}s / {totalDuration.toFixed(1)}s
        </span>
      </div>

      {/* Row 3: sequence tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {sequences.map((s) => {
          const on = s.id === activeId
          return (
            <div
              key={s.id}
              className={`group flex items-center rounded-md border text-xs transition-colors ${
                on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <button type="button" onClick={() => onSelect(s.id)} className="py-1.5 pl-2.5 pr-1 font-medium">
                {s.name}
              </button>
              {sequences.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  title="Delete flock"
                  className="px-1.5 py-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Flock
        </Button>
        {confirmStartOverId === activeId ? (
          <div className="ml-1 flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 p-1" role="group" aria-label="Confirm start over">
            <span className="px-1 text-[11px] text-destructive">Erase path + landings?</span>
            <Button
              variant="destructive"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                onStartOver(activeId)
                setConfirmStartOverId(null)
              }}
            >
              Erase
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setConfirmStartOverId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmStartOverId(activeId)}
            className="ml-1 h-7 gap-1 text-xs text-destructive hover:text-destructive"
            title="Erase this flock's path and landings, then draw again"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Start over
          </Button>
        )}
      </div>
    </div>
  )
}
