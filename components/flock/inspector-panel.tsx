"use client"

import { Shuffle, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Disclosure } from "@/components/flock/disclosure"
import { treatmentPresetPatch } from "@/lib/flock/defaults"
import { depthScaleAt, landingCounts, landingZones } from "@/lib/flock/engine"
import { deleteLanding } from "@/lib/flock/editing"
import {
  DEPTH_DIRECTIONS,
  DENSITIES,
  DENSITY_COUNT,
  ENTRIES,
  EXITS,
  TREATMENTS,
  WING_INTENSITIES,
  type Sequence,
  type Style,
} from "@/lib/flock/types"

const INK_SWATCHES = ["#043a78", "#111827", "#0f766e", "#7c2d12", "#4c1d95", "#e2e8f0"]
const BACKGROUND_SWATCHES = ["#f3efe6", "#ffffff", "#0b1220", "#15569e"]

const QUICK_STARTS = [
  { treatment: "Calm Glide", label: "Calm editorial", detail: "22 birds · open diagonal" },
  { treatment: "Symmetric Murmuration", label: "Balanced lift", detail: "36 birds · broad symmetry" },
  { treatment: "Waterfall Bloom", label: "Waterfall bloom", detail: "68 birds · dive and release" },
  { treatment: "Vortex Pull", label: "Vortex sweep", detail: "74 birds · low bank and rise" },
] as const

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Field<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-8 bg-secondary text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-sm">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  decimals = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  decimals?: number
  onChange: (v: number) => void
}) {
  const locked = max <= min
  return (
    <div className="flex items-center gap-3">
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={locked ? min + step : max}
        step={step}
        disabled={locked}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="flex-1"
      />
      <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </div>
  )
}

export function InspectorPanel({
  sequence,
  style,
  onUpdate,
  onUpdateStyle,
  onReseed,
  onAddLanding,
}: {
  sequence: Sequence | undefined
  style: Style
  onUpdate: (patch: Partial<Sequence>) => void
  onUpdateStyle: (patch: Partial<Style>) => void
  onReseed: () => void
  onAddLanding: () => void
}) {
  if (!sequence) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a flock to edit its motion.
      </div>
    )
  }

  const counts = landingCounts(sequence)
  const zones = landingZones(sequence)
  const depthGrowth = depthScaleAt(sequence, 1) / Math.max(0.001, depthScaleAt(sequence, 0))

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Step 2</p>
            <h3 className="mt-0.5 text-sm font-semibold text-foreground">Choose the motion</h3>
          </div>
        </div>

        <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Start with a complete motion</p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Applies a grounded route, exact flock count, spacing, cadence, and direction. You can still edit everything afterward.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {QUICK_STARTS.map((start) => (
              <button
                key={start.treatment}
                type="button"
                onClick={() => onUpdate({
                  ...treatmentPresetPatch(start.treatment),
                  name: start.label,
                })}
                className="rounded-md border border-border bg-background/70 px-2.5 py-2 text-left transition-colors hover:border-primary/60 hover:bg-primary/10"
              >
                <span className="block text-[11px] font-medium text-foreground">{start.label}</span>
                <span className="mt-0.5 block text-[9px] leading-snug text-muted-foreground">{start.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <Row label="Exact birds">
          <NumberSlider
            label="Exact birds"
            value={counts.total}
            min={1}
            max={120}
            step={1}
            decimals={0}
            onChange={(value) => {
              const birdCount = Math.round(value)
              const perchCount = Math.min(counts.perch, birdCount)
              onUpdate({
                birdCount,
                perchCount,
                gatherCount: Math.min(counts.gather, birdCount - perchCount),
                foregroundBirdCount: Math.min(sequence.foregroundBirdCount ?? 0, birdCount),
              })
            }}
          />
          <p className="text-[10px] leading-relaxed text-muted-foreground">Use any exact count. The motion presets above choose a helpful starting count.</p>
        </Row>

        <div className="grid grid-cols-2 gap-3">
          <Row label="Bird size">
            <NumberSlider
              label="Bird size"
              value={sequence.sizeScale ?? 1}
              min={0.35}
              max={6}
              step={0.05}
              suffix="×"
              decimals={2}
              onChange={(v) => onUpdate({ sizeScale: v })}
            />
          </Row>
          <Row label="Flight speed">
            <NumberSlider
              label="Flight speed"
              value={sequence.speedMultiplier ?? 1}
              min={0.25}
              max={2.5}
              step={0.05}
              suffix="×"
              decimals={2}
              onChange={(v) => onUpdate({ speedMultiplier: v })}
            />
          </Row>
        </div>

        <Disclosure label="Fine-tune motion" summary="Cadence, spacing, depth, direction, and arrangement.">
          <button
            type="button"
            onClick={onReseed}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            title="Re-roll the random seed for a new flock arrangement"
          >
            <Shuffle className="h-3 w-3" />
            Try another arrangement
          </button>

          <Row label="Flock behavior (keeps your path)">
            <Field value={sequence.treatment} options={TREATMENTS} onChange={(v) => onUpdate({ treatment: v })} />
          </Row>

          <div className="grid grid-cols-2 gap-3">
            <Row label="Density">
              <Field
                value={sequence.density}
                options={DENSITIES}
                onChange={(v) => {
                  const nextTotal = DENSITY_COUNT[v]
                  const perchCount = Math.min(counts.perch, nextTotal)
                  onUpdate({
                    density: v,
                    birdCount: nextTotal,
                    perchCount,
                    gatherCount: Math.min(counts.gather, nextTotal - perchCount),
                  })
                }}
              />
            </Row>
            <Row label="Wing cadence">
              <Field
                value={sequence.wingIntensity}
                options={WING_INTENSITIES}
                onChange={(v) => onUpdate({ wingIntensity: v })}
              />
            </Row>
          </div>

          <Row label="Formation spacing">
            <NumberSlider
              label="Formation spacing"
              value={sequence.spacingScale ?? 1.8}
              min={0.5}
              max={5}
              step={0.1}
              suffix="×"
              decimals={1}
              onChange={(v) => onUpdate({ spacingScale: v })}
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">Raise this when birds overlap. Spacing grows with their rendered footprint.</p>
          </Row>

          <Row label="Depth travel">
            <button
              type="button"
              onClick={() => onUpdate({
                depthDirection: "Background to foreground",
                depthStrength: 1.5,
                sizeScale: 1.1,
                spacingScale: 3.2,
                foregroundBirdCount: 1,
                foregroundBoost: 2,
              })}
              className="mb-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Small background → one giant foreground bird
            </button>
            <Field
              value={sequence.depthDirection ?? "Flat plane"}
              options={DEPTH_DIRECTIONS}
              onChange={(v) => onUpdate({ depthDirection: v })}
            />
          </Row>

          {(sequence.depthDirection ?? "Flat plane") !== "Flat plane" && (
            <div className="flex flex-col gap-4">
          <Row label="Perspective strength">
            <NumberSlider
              label="Perspective strength"
              value={sequence.depthStrength ?? 0.75}
              min={0.1}
              max={1.5}
              step={0.05}
              suffix="×"
              decimals={2}
              onChange={(v) => onUpdate({ depthStrength: v })}
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Full path growth is {depthGrowth.toFixed(1)}×. Only the selected foreground birds receive that entire change; support birds stay readable.
            </p>
          </Row>
          <Row label="Foreground birds">
            <NumberSlider
              label="Foreground birds"
              value={Math.min(counts.total, sequence.foregroundBirdCount ?? 0)}
              min={0}
              max={counts.total}
              step={1}
              decimals={0}
              onChange={(v) => onUpdate({ foregroundBirdCount: v })}
            />
          </Row>
          {(sequence.foregroundBirdCount ?? 0) > 0 && (
            <Row label="Foreground size boost">
              <NumberSlider
                label="Foreground size boost"
                value={sequence.foregroundBoost ?? 1}
                min={1}
                max={6}
                step={0.1}
                suffix="×"
                decimals={1}
                onChange={(v) => onUpdate({ foregroundBoost: v })}
              />
            </Row>
          )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Row label="Enter">
              <Field value={sequence.entry} options={ENTRIES} onChange={(v) => onUpdate({ entry: v })} />
            </Row>
            <Row label="Exit">
              <Field value={sequence.exit} options={EXITS} onChange={(v) => onUpdate({ exit: v })} />
            </Row>
          </div>
        </Disclosure>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Step 3</p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">Landings and timing</h3>
        </div>
        <Row label="Base timeline">
          <NumberSlider
            label="Base timeline"
            value={sequence.durationSeconds}
            min={4}
            max={20}
            step={0.5}
            suffix="s"
            decimals={1}
            onChange={(v) => onUpdate({ durationSeconds: v })}
          />
        </Row>
        <Row label="Background loop">
          <button
            type="button"
            aria-pressed={sequence.loopPath}
            onClick={() => onUpdate({ loopPath: !sequence.loopPath })}
            className={`rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors ${
              sequence.loopPath
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary text-foreground hover:border-primary/60"
            }`}
          >
            {sequence.loopPath ? "Seamless loop enabled" : "Make seamless background loop"}
          </button>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {sequence.loopPath
              ? "Closed path, continuous preview, matching first/final frame. Landing stops are disabled for this flock."
              : "Closes this flock's path so it can repeat without an empty lead-in or visible reset."}
          </p>
        </Row>
        {sequence.loopPath ? (
          <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-[11px] leading-relaxed text-primary">Loop mode keeps every bird in continuous flight. Turn it off to use perching and gathering.</p>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary/35 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Landing events · {zones.length}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Use zero, one, or several authored stops on this route.</p>
              </div>
              <button type="button" onClick={onAddLanding} className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/15">+ Add landing</button>
            </div>
            {zones.length > 0 ? <>
              <div className="flex flex-col gap-1.5" aria-label="Landing list">
                {zones.map((_, landingIndex) => (
                  <div key={landingIndex} className="flex items-center justify-between rounded-md border border-border bg-background px-2.5 py-2">
                    <span className="text-xs font-medium text-foreground">Landing {landingIndex + 1}</span>
                    <button
                      type="button"
                      onClick={() => onUpdate(deleteLanding(sequence, landingIndex))}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      aria-label={`Delete landing ${landingIndex + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />Delete
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onUpdate({ landings: [], landing: null, perchCount: 0, gatherCount: 0, arrivalMode: "Fly through" })}
                  className="self-start rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                >Clear all landings</button>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">The same selected birds use the authored approach, settle, and launch tracks at every stop. The remaining {counts.flyThrough} fly through.</p>
              <Row label="Perching birds">
              <NumberSlider
                label="Perching birds"
                value={counts.perch}
                min={0}
                max={counts.total}
                step={1}
                decimals={0}
                onChange={(v) => {
                  const perchCount = Math.round(v)
                  const gatherCount = Math.min(counts.gather, counts.total - perchCount)
                  onUpdate({
                    perchCount,
                    gatherCount,
                    arrivalMode: perchCount > 0 ? "Perch" : gatherCount > 0 ? "Gather" : "Fly through",
                  })
                }}
              />
            </Row>
            <Row label="Gathering birds">
              <NumberSlider
                label="Gathering birds"
                value={counts.gather}
                min={0}
                max={counts.total - counts.perch}
                step={1}
                decimals={0}
                onChange={(v) => {
                  const gatherCount = Math.round(v)
                  onUpdate({
                    gatherCount,
                    arrivalMode: counts.perch > 0 ? "Perch" : gatherCount > 0 ? "Gather" : "Fly through",
                  })
                }}
              />
            </Row>
            </> : (
              <p className="rounded-md border border-dashed border-border p-2 text-[11px] leading-relaxed text-muted-foreground">No landing events. Every bird flies through. Choose Add landing, then drag a box on the stage.</p>
            )}
          </div>
        )}
        {!sequence.loopPath && (
          <Row label={zones.length && counts.perch + counts.gather > 0 ? "Dwell at each landing" : "Dwell (no landing birds selected)"}>
            <NumberSlider
              label="Dwell at landing"
              value={sequence.dwellSeconds}
              min={0}
              max={8}
              step={0.5}
              suffix="s"
              decimals={1}
              onChange={(v) => onUpdate({ dwellSeconds: v })}
            />
          </Row>
        )}
      </div>

      <Disclosure label="Step 4 · Colors and notes" summary="Optional theme colors, fallback background, and handoff notes.">
        <Row label="Preview against">
          <div className="grid grid-cols-2 gap-2">
            {(["light", "dark"] as const).map((theme) => (
              <button key={theme} type="button" aria-pressed={style.previewTheme === theme} onClick={() => onUpdateStyle({ previewTheme: theme })} className={`rounded-md border px-2 py-1.5 text-xs capitalize ${style.previewTheme === theme ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>{theme} theme</button>
            ))}
          </div>
        </Row>
        <Row label="Birds on light theme">
          <div className="flex items-center gap-2">
            {INK_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onUpdate({ lightColor: c, color: c })
                  onUpdateStyle({ inkColor: c })
                }}
                aria-label={`Light theme bird color ${c}`}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: (sequence.lightColor || sequence.color || style.inkColor) === c ? "var(--primary)" : "var(--border)",
                }}
              />
            ))}
            <label className="relative ml-1 inline-flex">
              <input
                type="color"
                value={sequence.lightColor || sequence.color || style.inkColor}
                onChange={(e) => {
                  onUpdate({ lightColor: e.target.value, color: e.target.value })
                  onUpdateStyle({ inkColor: e.target.value })
                }}
                className="h-6 w-6 cursor-pointer rounded-full border border-border bg-transparent p-0"
                aria-label="Custom light theme bird color"
              />
            </label>
          </div>
        </Row>

        <Row label="Birds on dark theme">
          <div className="flex items-center gap-2">
            {INK_SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => onUpdate({ darkColor: c })} aria-label={`Dark theme bird color ${c}`} className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110" style={{ backgroundColor: c, borderColor: sequence.darkColor === c ? "var(--primary)" : "var(--border)" }} />
            ))}
            <label className="relative ml-1 inline-flex">
              <input type="color" value={sequence.darkColor || "#e2e8f0"} onChange={(e) => onUpdate({ darkColor: e.target.value })} className="h-6 w-6 cursor-pointer rounded-full border border-border bg-transparent p-0" aria-label="Custom dark theme bird color" />
            </label>
          </div>
        </Row>

        <Row label="Light fallback / MP4">
          <div className="flex items-center gap-2">
            {BACKGROUND_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdateStyle({ backgroundColor: color })}
                aria-label={`Background color ${color}`}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: style.backgroundColor === color ? "var(--primary)" : "var(--border)",
                }}
              />
            ))}
            <label className="relative ml-1 inline-flex">
              <input
                type="color"
                value={style.backgroundColor}
                onChange={(event) => onUpdateStyle({ backgroundColor: event.target.value })}
                className="h-6 w-6 cursor-pointer rounded-full border border-border bg-transparent p-0"
                aria-label="Custom background color"
              />
            </label>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">Used with the light preview when no scene is loaded and baked into light-theme opaque exports.</p>
        </Row>

        <Row label="Dark fallback / MP4">
          <div className="flex items-center gap-2">
            {BACKGROUND_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onUpdateStyle({ darkBackgroundColor: color })}
                aria-label={`Dark background color ${color}`}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: style.darkBackgroundColor === color ? "var(--primary)" : "var(--border)",
                }}
              />
            ))}
            <label className="relative ml-1 inline-flex">
              <input
                type="color"
                value={style.darkBackgroundColor}
                onChange={(event) => onUpdateStyle({ darkBackgroundColor: event.target.value })}
                className="h-6 w-6 cursor-pointer rounded-full border border-border bg-transparent p-0"
                aria-label="Custom dark background color"
              />
            </label>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">Used with the dark preview and baked into dark-theme opaque exports. Transparent exports ignore both backgrounds.</p>
        </Row>

        <Row label="Notes (exported to brief)">
          <textarea
            value={sequence.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Dive through the gap, broaden around the card, pull up before the CTA."
            rows={3}
            className="resize-none rounded-md border border-border bg-secondary px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </Row>
      </Disclosure>
    </div>
  )
}
