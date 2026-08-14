"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { renderProjectFrame } from "@/lib/flock/engine"
import type { BirdTemplate, LandingZone, Point, SceneSource, Sequence, Style } from "@/lib/flock/types"

export type StageMode = "draw" | "landing" | "edit"

export type StageHandle = {
  seek: (t: number) => void
  play: () => void
  pause: () => void
  getTime: () => number
}

type Props = {
  sequences: Sequence[]
  activeId: string
  style: Style
  backdropDataUrl: string | null
  scene: SceneSource
  birdTemplate: BirdTemplate
  viewport: { width: number; height: number }
  totalDuration: number
  mode: StageMode
  showGuides: boolean
  showBackdrop: boolean
  onTime: (t: number) => void
  onEnded: () => void
  onUpdateSequence: (id: string, patch: Partial<Sequence>) => void
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// Distance-threshold decimation for freehand strokes.
function decimate(pts: Point[], minDist = 0.035, max = 44): Point[] {
  if (pts.length <= 2) return pts
  const out: Point[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const last = out[out.length - 1]
    if (Math.hypot(pts[i].x - last.x, pts[i].y - last.y) >= minDist) out.push(pts[i])
  }
  const end = pts[pts.length - 1]
  const lastOut = out[out.length - 1]
  if (Math.hypot(end.x - lastOut.x, end.y - lastOut.y) > 0.001) out.push(end)
  if (out.length > max) {
    const step = out.length / max
    const thin: Point[] = []
    for (let i = 0; i < max; i++) thin.push(out[Math.floor(i * step)])
    thin.push(out[out.length - 1])
    return thin
  }
  return out
}

export const Stage = forwardRef<StageHandle, Props>(function Stage(
  {
    sequences,
    activeId,
    style,
    backdropDataUrl,
    scene,
    birdTemplate,
    viewport,
    totalDuration,
    mode,
    showGuides,
    showBackdrop,
    onTime,
    onEnded,
    onUpdateSequence,
  },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  const tRef = useRef(0)
  const playingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)
  const lastReportRef = useRef(0)

  const seqRef = useRef(sequences)
  const styleRef = useRef(style)
  const durRef = useRef(totalDuration)
  const templateRef = useRef(birdTemplate)
  seqRef.current = sequences
  styleRef.current = style
  durRef.current = totalDuration
  templateRef.current = birdTemplate

  const aspect = viewport.height / viewport.width

  // Measure available width, derive height from viewport aspect.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      setDims({ w, h: Math.round(w * aspect) })
    })
    ro.observe(el)
    const w = el.clientWidth
    setDims({ w, h: Math.round(w * aspect) })
    return () => ro.disconnect()
  }, [aspect])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || dims.w === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(dims.w * dpr) || canvas.height !== Math.round(dims.h * dpr)) {
      canvas.width = Math.round(dims.w * dpr)
      canvas.height = Math.round(dims.h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderProjectFrame(ctx, tRef.current, seqRef.current, styleRef.current, { w: dims.w, h: dims.h }, durRef.current, templateRef.current)
  }, [dims])

  // Animation loop.
  useEffect(() => {
    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick)
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      if (playingRef.current) {
        const total = durRef.current || 1
        tRef.current += dt / total
        if (tRef.current >= 1) {
          tRef.current = 1
          playingRef.current = false
          onEnded()
        }
      }
      draw()
      if (ts - lastReportRef.current > 66) {
        lastReportRef.current = ts
        onTime(tRef.current)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = 0
    }
  }, [draw, onTime, onEnded])

  // Redraw immediately on data changes while paused.
  useEffect(() => {
    if (!playingRef.current) draw()
  }, [draw, sequences, style, dims, showBackdrop])

  useImperativeHandle(ref, () => ({
    seek: (t: number) => {
      tRef.current = clamp01(t)
      if (!playingRef.current) draw()
      onTime(tRef.current)
    },
    play: () => {
      if (tRef.current >= 1) tRef.current = 0
      playingRef.current = true
      lastTsRef.current = 0
    },
    pause: () => {
      playingRef.current = false
    },
    getTime: () => tRef.current,
  }))

  // ---- Pointer interaction --------------------------------------------------
  const active = sequences.find((s) => s.id === activeId)
  const drawingRef = useRef(false)
  const rawRef = useRef<Point[]>([])
  const dragRef = useRef<{ kind: "point" | "landMove" | "landResize"; index?: number; start?: Point; orig?: LandingZone } | null>(null)

  const toNorm = useCallback(
    (e: React.PointerEvent): Point => {
      const rect = wrapRef.current!.getBoundingClientRect()
      return {
        x: clamp01((e.clientX - rect.left) / rect.width),
        y: clamp01((e.clientY - rect.top) / rect.height),
      }
    },
    [],
  )

  const hitPoint = (p: Point, pts: Point[]): number => {
    const r = 0.028
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(pts[i].x - p.x, pts[i].y - p.y) < r) return i
    }
    return -1
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const p = toNorm(e)
    if (mode === "draw") {
      drawingRef.current = true
      rawRef.current = [p]
      onUpdateSequence(active.id, { points: [p, p] })
    } else if (mode === "landing") {
      drawingRef.current = true
      rawRef.current = [p]
      onUpdateSequence(active.id, { landing: { x: p.x, y: p.y, w: 0.001, h: 0.001 } })
    } else if (mode === "edit") {
      const idx = hitPoint(p, active.points)
      if (idx >= 0) {
        dragRef.current = { kind: "point", index: idx }
        return
      }
      const lz = active.landing
      if (lz) {
        const nearCorner = Math.hypot(p.x - (lz.x + lz.w), p.y - (lz.y + lz.h)) < 0.03
        if (nearCorner) {
          dragRef.current = { kind: "landResize", start: p, orig: { ...lz } }
          return
        }
        if (p.x >= lz.x && p.x <= lz.x + lz.w && p.y >= lz.y && p.y <= lz.y + lz.h) {
          dragRef.current = { kind: "landMove", start: p, orig: { ...lz } }
        }
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active) return
    const p = toNorm(e)
    if (mode === "draw" && drawingRef.current) {
      rawRef.current.push(p)
      onUpdateSequence(active.id, { points: decimate(rawRef.current) })
    } else if (mode === "landing" && drawingRef.current) {
      const s = rawRef.current[0]
      onUpdateSequence(active.id, {
        landing: {
          x: Math.min(s.x, p.x),
          y: Math.min(s.y, p.y),
          w: Math.abs(p.x - s.x),
          h: Math.abs(p.y - s.y),
        },
      })
    } else if (mode === "edit" && dragRef.current) {
      const d = dragRef.current
      if (d.kind === "point" && d.index != null) {
        const pts = active.points.map((pt, i) => (i === d.index ? p : pt))
        onUpdateSequence(active.id, { points: pts })
      } else if (d.kind === "landMove" && d.orig && d.start) {
        const dx = p.x - d.start.x
        const dy = p.y - d.start.y
        onUpdateSequence(active.id, {
          landing: { ...d.orig, x: clamp01(d.orig.x + dx), y: clamp01(d.orig.y + dy) },
        })
      } else if (d.kind === "landResize" && d.orig) {
        onUpdateSequence(active.id, {
          landing: { x: d.orig.x, y: d.orig.y, w: Math.max(0.03, p.x - d.orig.x), h: Math.max(0.03, p.y - d.orig.y) },
        })
      }
    }
  }

  const onPointerUp = () => {
    if (active && mode === "draw" && drawingRef.current) {
      onUpdateSequence(active.id, { points: decimate(rawRef.current) })
    }
    drawingRef.current = false
    dragRef.current = null
    rawRef.current = []
  }

  // Overlay geometry in px.
  const px = (p: Point) => ({ x: p.x * dims.w, y: p.y * dims.h })
  const pathD = active && active.points.length >= 2
    ? active.points.map((p, i) => `${i === 0 ? "M" : "L"} ${(p.x * dims.w).toFixed(1)} ${(p.y * dims.h).toFixed(1)}`).join(" ")
    : ""

  const cursor = mode === "edit" ? "default" : "crosshair"

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-lg border border-border bg-stage"
      style={{ height: dims.h || 320 }}
    >
      {/* Scene reference: image, sandboxed HTML/CSS, or embeddable URL. */}
      {showBackdrop && (scene.kind === "image" || backdropDataUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scene.kind === "image" ? scene.dataUrl : backdropDataUrl || "/placeholder.svg"}
          alt="Card or website reference"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : showBackdrop && scene.kind === "html" ? (
        <iframe
          title={scene.name}
          sandbox=""
          srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}${scene.css}</style></head><body>${scene.html}</body></html>`}
          className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-transparent"
        />
      ) : showBackdrop && scene.kind === "url" ? (
        <iframe
          title={scene.name}
          sandbox="allow-scripts allow-same-origin"
          src={scene.url}
          className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-background"
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 opacity-[0.5]" aria-hidden>
          <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>
      )}

      {/* Flock canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ width: dims.w, height: dims.h }}
      />

      {/* Interaction + guides overlay */}
      <svg
        className="absolute inset-0 h-full w-full touch-none"
        width={dims.w}
        height={dims.h}
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {showGuides && active && (
          <g>
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeLinecap="round"
                opacity={0.85}
              />
            )}
            {active.points.map((p, i) => {
              const c = px(p)
              return (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={i === 0 || i === active.points.length - 1 ? 6 : 4}
                  fill={i === 0 ? "var(--primary)" : "var(--card)"}
                  stroke="var(--primary)"
                  strokeWidth={2}
                />
              )
            })}
            {active.landing && (
              <g>
                <rect
                  x={active.landing.x * dims.w}
                  y={active.landing.y * dims.h}
                  width={active.landing.w * dims.w}
                  height={active.landing.h * dims.h}
                  fill="var(--primary)"
                  fillOpacity={0.08}
                  stroke="var(--primary)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  rx={4}
                />
                <circle
                  cx={(active.landing.x + active.landing.w) * dims.w}
                  cy={(active.landing.y + active.landing.h) * dims.h}
                  r={5}
                  fill="var(--primary)"
                />
                <text
                  x={active.landing.x * dims.w + 6}
                  y={active.landing.y * dims.h + 14}
                  fill="var(--primary)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                >
                  land · {active.dwellSeconds}s
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  )
})
