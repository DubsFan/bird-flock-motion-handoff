"use client"

import { Shuffle } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  ARRIVAL_MODES,
  DENSITIES,
  ENTRIES,
  EXITS,
  TREATMENTS,
  WING_INTENSITIES,
  type Sequence,
  type Style,
} from "@/lib/flock/types"

const INK_SWATCHES = ["#043a78", "#111827", "#0f766e", "#7c2d12", "#4c1d95", "#e2e8f0"]

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
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="flex-1"
      />
      <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
        {value}
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
}: {
  sequence: Sequence | undefined
  style: Style
  onUpdate: (patch: Partial<Sequence>) => void
  onUpdateStyle: (patch: Partial<Style>) => void
  onReseed: () => void
}) {
  if (!sequence) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a flock to edit its motion.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Motion</h3>
          <button
            type="button"
            onClick={onReseed}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            title="Re-roll the random seed for a new flock arrangement"
          >
            <Shuffle className="h-3 w-3" />
            Reseed
          </button>
        </div>

        <Row label="Treatment">
          <Field value={sequence.treatment} options={TREATMENTS} onChange={(v) => onUpdate({ treatment: v })} />
        </Row>

        <div className="grid grid-cols-2 gap-3">
          <Row label="Density">
            <Field value={sequence.density} options={DENSITIES} onChange={(v) => onUpdate({ density: v })} />
          </Row>
          <Row label="Wing beat">
            <Field
              value={sequence.wingIntensity}
              options={WING_INTENSITIES}
              onChange={(v) => onUpdate({ wingIntensity: v })}
            />
          </Row>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Row label="Enter">
            <Field value={sequence.entry} options={ENTRIES} onChange={(v) => onUpdate({ entry: v })} />
          </Row>
          <Row label="Exit">
            <Field value={sequence.exit} options={EXITS} onChange={(v) => onUpdate({ exit: v })} />
          </Row>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Timing</h3>
        <Row label="Duration">
          <NumberSlider
            value={sequence.durationSeconds}
            min={4}
            max={20}
            step={0.5}
            suffix="s"
            onChange={(v) => onUpdate({ durationSeconds: v })}
          />
        </Row>
        {sequence.landing && (
          <Row label="Arrival behavior">
            <Field value={sequence.arrivalMode ?? "Perch"} options={ARRIVAL_MODES} onChange={(v) => onUpdate({ arrivalMode: v })} />
          </Row>
        )}
        <Row label={sequence.landing ? "Dwell at landing" : "Dwell (add a landing zone)"}>
          <NumberSlider
            value={sequence.dwellSeconds}
            min={0}
            max={8}
            step={0.5}
            suffix="s"
            onChange={(v) => onUpdate({ dwellSeconds: v })}
          />
        </Row>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Ink</h3>
        <Row label="Bird color">
          <div className="flex items-center gap-2">
            {INK_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateStyle({ inkColor: c })}
                aria-label={`Ink color ${c}`}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: style.inkColor === c ? "var(--primary)" : "var(--border)",
                }}
              />
            ))}
            <label className="relative ml-1 inline-flex">
              <input
                type="color"
                value={style.inkColor}
                onChange={(e) => onUpdateStyle({ inkColor: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded-full border border-border bg-transparent p-0"
                aria-label="Custom ink color"
              />
            </label>
          </div>
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
      </div>
    </div>
  )
}
