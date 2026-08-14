"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { buildMotionPath, renderProjectFrame } from "@/lib/flock/engine"
import { preloadBirdTemplate } from "@/lib/flock/template-renderer"
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
  const [artworkState, setArtworkState] = useState<"loading" | "ready" | "error">("loading")

  const tRef = useRef(0)
  const playingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)
  const lastReportRef = useRef(0)

  const seqRef = useRef(sequences)
  const styleRef = useRef(style)
  const durRef = useRef(totalDuration)
  const templateRef = useRef(birdTemplate)
  const assignedTemplatesRef = useRef<BirdTemplate[]>([])
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
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    if (canvas.width !== Math.round(dims.w * dpr) || canvas.height !== Math.round(dims.h * dpr)) {
      canvas.width = Math.round(dims.w * dpr)
      canvas.height = Math.round(dims.h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    renderProjectFrame(ctx, tRef.current, seqRef.current, styleRef.current, { w: dims.w, h: dims.h }, durRef.current, templateRef.current)
  }, [dims])

  const assignedTemplates = [birdTemplate, ...sequences.flatMap((sequence) => sequence.birdTemplate ? [sequence.birdTemplate] : [])]
  assignedTemplatesRef.current = [...new Map(assignedTemplates.map((template) => [template.id, template])).values()]
  const templateKey = assignedTemplatesRef.current.map((template) => [
      template.id,
      template.frames.join("|"),
      template.actionFrames?.approach.join("|") ?? "",
      template.actionFrames?.perch.join("|") ?? "",
      template.actionFrames?.launch.join("|") ?? "",
    ].join(":")).join("||")

  useEffect(() => {
    let current = true
    setArtworkState("loading")
    void Promise.all(assignedTemplatesRef.current.map(preloadBirdTemplate)).then(() => {
      if (!current) return
      setArtworkState("ready")
      draw()
    }).catch(() => {
      if (current) setArtworkState("error")
    })
    return () => {
      current = false
    }
  }, [draw, templateKey])

  // Animation loop.
  useEffect(() => {
    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick)
      if (!playingRef.current) return
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      const total = durRef.current || 1
      tRef.current += dt / total
      if (tRef.current >= 1) {
        if (seqRef.current.some((sequence) => sequence.loopPath)) {
          tRef.current %= 1
        } else {
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
  const pathD = useMemo(() => {
    if (!active || active.points.length < 2 || dims.w <= 0) return ""
    const guidePath = buildMotionPath(active, dims).path.points
    return guidePath
      .filter((_, index) => index % 4 === 0 || index === guidePath.length - 1)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ")
  }, [active, dims])

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
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: style.backgroundColor || "#f3efe6" }}
          aria-hidden
        >
          <div className="h-full w-full opacity-40" style={{ backgroundImage: "linear-gradient(to right, #64748b33 1px, transparent 1px), linear-gradient(to bottom, #64748b33 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>
      )}

      {/* Flock canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ width: dims.w, height: dims.h }}
      />

      {artworkState !== "ready" && (
        <div
          className="pointer-events-none absolute left-3 top-3 rounded-md border border-border bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm"
          role={artworkState === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {artworkState === "error" ? "Artist bird artwork could not load." : "Loading artist bird artwork…"}
        </div>
      )}

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
              <g aria-label="Flight path guide">
                <path
                  d={pathD}
                  fill="none"
                  stroke="#050505"
                  strokeWidth={7}
                  strokeDasharray="8 7"
                  strokeLinecap="round"
                  opacity={0.92}
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={5}
                  strokeDasharray="8 7"
                  strokeLinecap="round"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  strokeDasharray="8 7"
                  strokeLinecap="round"
                />
              </g>
            )}
            {active.points.map((p, i) => {
              const c = px(p)
              const isStart = i === 0
              const isEnd = i === active.points.length - 1
              const pointColor = isStart ? "#16a34a" : isEnd ? "#dc2626" : "#0284c7"
              return (
                <g key={i} aria-label={isStart ? "Path start" : isEnd ? "Path end" : "Path control point"}>
                  <circle cx={c.x} cy={c.y} r={isStart || isEnd ? 9 : 7} fill="#050505" />
                  <circle cx={c.x} cy={c.y} r={isStart || isEnd ? 7 : 5.5} fill="#ffffff" />
                  <circle cx={c.x} cy={c.y} r={isStart || isEnd ? 4.5 : 3.5} fill={pointColor} />
                </g>
              )
            })}
            {active.landing && (
              <g aria-label="Landing zone guide">
                <rect
                  x={active.landing.x * dims.w}
                  y={active.landing.y * dims.h}
                  width={active.landing.w * dims.w}
                  height={active.landing.h * dims.h}
                  fill="none"
                  stroke="#050505"
                  strokeWidth={7}
                  strokeDasharray="10 7"
                  rx={5}
                />
                <rect
                  x={active.landing.x * dims.w}
                  y={active.landing.y * dims.h}
                  width={active.landing.w * dims.w}
                  height={active.landing.h * dims.h}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={5}
                  strokeDasharray="10 7"
                  rx={5}
                />
                <rect
                  x={active.landing.x * dims.w}
                  y={active.landing.y * dims.h}
                  width={active.landing.w * dims.w}
                  height={active.landing.h * dims.h}
                  fill="#f59e0b"
                  fillOpacity={0.18}
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  strokeDasharray="10 7"
                  rx={5}
                />
                <circle
                  cx={(active.landing.x + active.landing.w) * dims.w}
                  cy={(active.landing.y + active.landing.h) * dims.h}
                  r={9}
                  fill="#050505"
                />
                <circle
                  cx={(active.landing.x + active.landing.w) * dims.w}
                  cy={(active.landing.y + active.landing.h) * dims.h}
                  r={7}
                  fill="#ffffff"
                />
                <circle
                  cx={(active.landing.x + active.landing.w) * dims.w}
                  cy={(active.landing.y + active.landing.h) * dims.h}
                  r={4.5}
                  fill="#f59e0b"
                />
                <text
                  x={active.landing.x * dims.w + 6}
                  y={active.landing.y * dims.h + 16}
                  fill="#111827"
                  stroke="#ffffff"
                  strokeWidth={4}
                  paintOrder="stroke fill"
                  fontSize={11}
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                >
                  LANDING · {active.dwellSeconds}s
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  )
})
