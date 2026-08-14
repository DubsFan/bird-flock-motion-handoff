/** Flight Instrument design: mapping canvas first, measured controls second, no generic dashboard filler. */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Anchor,
  Check,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  ImageDown,
  Info,
  Link,
  MapPinned,
  MousePointer2,
  PenTool,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

type Mode = "select" | "anchor" | "draw";
type Point = { x: number; y: number };
type AnchorRecord = {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  interaction: string;
};
type RouteRecord = {
  id: string;
  name: string;
  treatment: string;
  duration: number;
  density: string;
  wing: string;
  layering: string;
  start: string;
  end: string;
  notes: string;
  points: Point[];
};

const PPM_URL =
  "https://practical-portfolio-management-necgu1dcq-ggs-projects-4525ede8.vercel.app/ppm-bakeoff/briefing";

const initialAnchors: AnchorRecord[] = [
  { id: "a-1", name: "Hero headline", role: "Headline", x: 0.27, y: 0.38, interaction: "Frame" },
  { id: "a-2", name: "Portfolio comparison", role: "Image", x: 0.66, y: 0.52, interaction: "Pass behind" },
  { id: "a-3", name: "Primary CTA zone", role: "CTA", x: 0.29, y: 0.74, interaction: "Avoid" },
];

const initialRoute: RouteRecord = {
  id: "r-1",
  name: "Hero Dive and Pullout",
  treatment: "Dive and Pullout",
  duration: 10,
  density: "Murmuration",
  wing: "Strong",
  layering: "Behind selected cards",
  start: "Enter from right",
  end: "Pull upward",
  notes: "Dive through the visual gap between the hero text and portfolio comparison. Broaden around the card, then pull up before the CTA zone.",
  points: [
    { x: 0.99, y: 0.16 },
    { x: 0.77, y: 0.30 },
    { x: 0.58, y: 0.72 },
    { x: 0.32, y: 0.58 },
    { x: 0.12, y: 0.19 },
  ],
};

const treatmentOptions = [
  "Calm Glide",
  "Symmetric Murmuration",
  "Dive and Pullout",
  "Split and Rejoin",
  "Ribbon Wave",
  "Curl and Release",
  "Custom",
];

const modeMeta: Record<Mode, { label: string; instruction: string; icon: typeof MousePointer2 }> = {
  select: { label: "Select", instruction: "Select a waypoint or route to refine it.", icon: MousePointer2 },
  anchor: { label: "Add anchor", instruction: "Click an object or clear-space zone the flock should respect.", icon: MapPinned },
  draw: { label: "Draw flight", instruction: "Hold and draw the exact route your flock should travel.", icon: PenTool },
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getRoutePath(points: Point[]) {
  if (points.length < 2) return "";
  const scaled = points.map((point) => ({ x: point.x * 1000, y: point.y * 620 }));
  if (scaled.length === 2) return `M ${scaled[0].x} ${scaled[0].y} L ${scaled[1].x} ${scaled[1].y}`;
  let d = `M ${scaled[0].x} ${scaled[0].y}`;
  for (let index = 1; index < scaled.length - 1; index += 1) {
    const current = scaled[index];
    const next = scaled[index + 1];
    const midpoint = { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 };
    d += ` Q ${current.x} ${current.y} ${midpoint.x} ${midpoint.y}`;
  }
  const penultimate = scaled[scaled.length - 2];
  const final = scaled[scaled.length - 1];
  return `${d} Q ${penultimate.x} ${penultimate.y} ${final.x} ${final.y}`;
}

function pointAlong(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0.5, y: 0.5 };
  if (points.length === 1) return points[0];
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
  const length = segments.reduce((total, segment) => total + segment, 0) || 1;
  let target = progress * length;
  for (let index = 0; index < segments.length; index += 1) {
    if (target <= segments[index]) {
      const start = points[index];
      const end = points[index + 1];
      const ratio = target / segments[index];
      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    }
    target -= segments[index];
  }
  return points[points.length - 1];
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [targetUrl, setTargetUrl] = useState(PPM_URL);
  const [loadedUrl, setLoadedUrl] = useState(PPM_URL);
  const [mode, setMode] = useState<Mode>("select");
  const [anchors, setAnchors] = useState<AnchorRecord[]>(initialAnchors);
  const [routes, setRoutes] = useState<RouteRecord[]>([initialRoute]);
  const [selectedAnchorId, setSelectedAnchorId] = useState("a-2");
  const [selectedRouteId, setSelectedRouteId] = useState("r-1");
  const [drawing, setDrawing] = useState<Point[] | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<Point[] | null>(null);

  const selectedAnchor = anchors.find((anchor) => anchor.id === selectedAnchorId) ?? anchors[0];
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
  const activeMode = modeMeta[mode];

  useEffect(() => {
    if (!isPreviewing) return;
    const start = performance.now() - previewProgress * selectedRoute.duration * 1000;
    let animationFrame = 0;
    const animate = (now: number) => {
      const nextProgress = ((now - start) / (selectedRoute.duration * 1000)) % 1;
      setPreviewProgress(nextProgress);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPreviewing, selectedRoute.duration]);

  const previewBirds = useMemo(() => {
    if (!selectedRoute?.points.length) return [];
    return Array.from({ length: 13 }, (_, index) => {
      const lag = index * 0.045;
      const p = pointAlong(selectedRoute.points, (previewProgress - lag + 1) % 1);
      const scale = 1.2 - index * 0.045;
      return { ...p, scale, index };
    });
  }, [previewProgress, selectedRoute]);

  const mapPoint = (event: React.PointerEvent<HTMLDivElement>): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  };

  const updateAnchor = (changes: Partial<AnchorRecord>) => {
    setAnchors((current) => current.map((anchor) => (anchor.id === selectedAnchorId ? { ...anchor, ...changes } : anchor)));
  };

  const updateRoute = (changes: Partial<RouteRecord>) => {
    setRoutes((current) => current.map((route) => (route.id === selectedRouteId ? { ...route, ...changes } : route)));
  };

  const handleStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mode === "anchor") {
      const point = mapPoint(event);
      const anchor: AnchorRecord = {
        id: `a-${Date.now()}`,
        name: `Anchor ${anchors.length + 1}`,
        role: "Card group",
        x: point.x,
        y: point.y,
        interaction: "Pass behind",
      };
      setAnchors((current) => [...current, anchor]);
      setSelectedAnchorId(anchor.id);
      return;
    }
    if (mode === "draw") {
      event.currentTarget.setPointerCapture(event.pointerId);
      const startPoint = mapPoint(event);
      drawingRef.current = [startPoint];
      setDrawing([startPoint]);
      setSelectedRouteId("");
    }
  };

  const handleStagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current || mode !== "draw") return;
    const nextPoint = mapPoint(event);
    const prior = drawingRef.current[drawingRef.current.length - 1];
    if (Math.hypot(prior.x - nextPoint.x, prior.y - nextPoint.y) < 0.01) return;
    drawingRef.current = [...drawingRef.current, nextPoint];
    setDrawing(drawingRef.current);
  };

  const handleStagePointerUp = () => {
    const completedDrawing = drawingRef.current;
    if (!completedDrawing || mode !== "draw") return;
    if (completedDrawing.length > 2) {
      const route: RouteRecord = {
        ...initialRoute,
        id: `r-${Date.now()}`,
        name: `Flight Path ${routes.length + 1}`,
        points: completedDrawing,
        notes: "Describe how this flock should react to anchors along this route.",
      };
      setRoutes((current) => [...current, route]);
      setSelectedRouteId(route.id);
    }
    drawingRef.current = null;
    setDrawing(null);
    setMode("select");
  };

  const motionBrief = useMemo(
    () => ({
      schema_version: "1.0",
      project: {
        name: "PPM Briefing Bird Motion",
        target_url: loadedUrl,
        captured_at: new Date().toISOString(),
        viewport: { width: 1672, height: 941 },
      },
      anchors: anchors.map((anchor) => ({
        id: anchor.id,
        name: anchor.name,
        role: anchor.role,
        normalized_center: { x: Number(anchor.x.toFixed(4)), y: Number(anchor.y.toFixed(4)) },
        flock_interaction: anchor.interaction,
      })),
      paths: routes.map((route) => ({
        id: route.id,
        name: route.name,
        treatment: route.treatment,
        duration_seconds: route.duration,
        density: route.density,
        wing_intensity: route.wing,
        layering: route.layering,
        entry: route.start,
        exit: route.end,
        raw_points: route.points,
        notes: route.notes,
      })),
      style: { ink_color: "#043A78", transparent_background: true, source_contours_only: true },
    }),
    [anchors, loadedUrl, routes],
  );

  const markdownBrief = useMemo(() => {
    const anchorRows = anchors.map((anchor, index) => `| ${index + 1} | ${anchor.name} | ${anchor.role} | ${(anchor.x * 100).toFixed(0)}%, ${(anchor.y * 100).toFixed(0)}% | ${anchor.interaction} |`).join("\n");
    const paths = routes.map((route) => `### ${route.name}\n\n- **Treatment:** ${route.treatment}\n- **Duration:** ${route.duration} seconds\n- **Density:** ${route.density}\n- **Wing intensity:** ${route.wing}\n- **Layering:** ${route.layering}\n- **Entry / Exit:** ${route.start} → ${route.end}\n\n${route.notes}`).join("\n\n");
    return `# Bird Motion Brief: PPM Briefing\n\n## Target Layout\n\n- **Target URL:** ${loadedUrl}\n- **Captured viewport:** 1672 × 941\n- **Paths:** ${routes.length}\n- **Anchors:** ${anchors.length}\n\n## Page Anchors\n\n| # | Anchor | Role | Position | Flock Interaction |\n| --- | --- | --- | --- | --- |\n${anchorRows}\n\n## Flight Paths\n\n${paths}\n\n## Production Constraints\n\n- Use approved hand-drawn source-contour birds only.\n- Preserve transparent alpha.\n- Keep cards, headline, and CTA readable.\n- Make wing motion visible across the complete flock.\n- Match the path and anchor behavior recorded above.\n`;
  }, [anchors, loadedUrl, routes]);

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const overlayBookmarklet = `javascript:(()=>{const s=document.createElement('script');s.src='${window.location.origin}/bird-motion-mapper-overlay.js';s.onload=()=>window.BirdMotionMapper&&window.BirdMotionMapper.open();document.body.appendChild(s)})()`;

  const exportVisualMap = () => {
    const anchorMarks = anchors.map((anchor, index) => `<g><circle cx="${anchor.x * 1000}" cy="${anchor.y * 620}" r="17" fill="#043A78"/><text x="${anchor.x * 1000}" y="${anchor.y * 620 + 5}" font-size="15" text-anchor="middle" fill="white" font-family="monospace">${index + 1}</text><text x="${anchor.x * 1000 + 24}" y="${anchor.y * 620 - 20}" font-size="16" fill="#111827" font-family="Arial">${anchor.name}</text></g>`).join("");
    const pathMarks = routes.map((route) => `<path d="${getRoutePath(route.points)}" fill="none" stroke="#043A78" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620"><rect width="1000" height="620" fill="#f5f0e7"/><path d="M0 80H1000M0 160H1000M0 240H1000M0 320H1000M0 400H1000M0 480H1000M0 560H1000" stroke="#d7d1c6" stroke-width="1"/>${pathMarks}${anchorMarks}</svg>`;
    downloadFile("ppm-bird-motion-visual-map.svg", svg, "image/svg+xml");
  };

  return (
    <div className="app-shell">
      <aside className="command-rail">
        <div className="brand-block">
          <img className="brand-mark" src="/manus-storage/bird-motion-mapper-mark_ca641d12.png" alt="Bird Motion Mapper" />
          <div>
            <p className="eyebrow">BIRD MOTION</p>
            <p className="brand-name">MAPPER</p>
          </div>
        </div>

        <div className="rail-section">
          <p className="section-label">Mode</p>
          {(Object.keys(modeMeta) as Mode[]).map((key) => {
            const item = modeMeta[key];
            const Icon = item.icon;
            return (
              <button key={key} className={`mode-button ${mode === key ? "is-active" : ""}`} onClick={() => setMode(key)}>
                <Icon size={17} />
                <span>{item.label}</span>
                <kbd>{key === "select" ? "S" : key === "anchor" ? "A" : "D"}</kbd>
              </button>
            );
          })}
        </div>

        <div className="rail-section route-stack">
          <div className="section-heading"><p className="section-label">Flight paths</p><button className="icon-button" onClick={() => setMode("draw")} aria-label="Draw a new flight path"><Plus size={15} /></button></div>
          {routes.map((route, index) => (
            <button key={route.id} className={`route-item ${route.id === selectedRouteId ? "is-selected" : ""}`} onClick={() => setSelectedRouteId(route.id)}>
              <span className="route-index">0{index + 1}</span>
              <span><strong>{route.name}</strong><small>{route.treatment}</small></span>
            </button>
          ))}
        </div>

        <div className="rail-bottom">
          <button className={`preview-button ${isPreviewing ? "is-playing" : ""}`} onClick={() => setIsPreviewing((current) => !current)}>
            {isPreviewing ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />} {isPreviewing ? "Restart preview" : "Preview motion"}
          </button>
          <p className="rail-note"><Info size={13} /> The page remains untouched. Mapping data stays in your browser until you export.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">LIVE PAGE STAGE</p>
            <h1>Plot the flock around what matters.</h1>
          </div>
          <div className="header-actions">
            <button className="ghost-button" onClick={() => copy(overlayBookmarklet, "bookmarklet")}><Link size={15} /> {copied === "bookmarklet" ? "Overlay link copied" : "Copy live overlay"}</button>
            <button className="primary-button" onClick={() => downloadFile("ppm-bird-motion-brief.json", JSON.stringify(motionBrief, null, 2), "application/json")}><Download size={16} /> Export brief</button>
          </div>
        </header>

        <section className="target-strip">
          <div className="target-dot" />
          <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} aria-label="Target page URL" />
          <button onClick={() => { setIframeReady(false); setLoadedUrl(targetUrl); }}><ExternalLink size={15} /> Load stage</button>
          <span className="stage-status">{iframeReady ? "Page loaded for mapping" : "Loading target page"}</span>
        </section>

        <section className="stage-wrap">
          <div className="stage-meta"><span><Eye size={14} /> {mode === "draw" && drawing ? "Recording flight path" : activeMode.instruction}</span><span>1672 × 941 reference frame</span></div>
          <div
            ref={stageRef}
            className={`mapping-stage mode-${mode}`}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
          >
            <iframe title="Target page stage" src={loadedUrl} onLoad={() => setIframeReady(true)} />
            <div className="stage-shade" />
            <svg className="mapper-overlay" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-label="Bird path overlay">
              <defs>
                <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto"><path d="M0,0 L0,7 L8,3.5 z" fill="#abdfff" /></marker>
                <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <path className="stage-grid" d="M100 0V620M200 0V620M300 0V620M400 0V620M500 0V620M600 0V620M700 0V620M800 0V620M900 0V620 M0 124H1000M0 248H1000M0 372H1000M0 496H1000" />
              {routes.map((route) => (
                <g key={route.id} className={route.id === selectedRouteId ? "route-layer selected" : "route-layer"} onPointerDown={(event) => { if (mode !== "select") return; event.stopPropagation(); setSelectedRouteId(route.id); }}>
                  <path d={getRoutePath(route.points)} className="route-hit" />
                  <path d={getRoutePath(route.points)} className="route-shadow" />
                  <path d={getRoutePath(route.points)} className="route-line" markerEnd="url(#arrow)" />
                  <path d={getRoutePath(route.points)} className="route-highlight" markerEnd="url(#arrow)" />
                </g>
              ))}
              {drawing && <path d={getRoutePath(drawing)} className="route-drawing" markerEnd="url(#arrow)" />}
              {anchors.map((anchor, index) => (
                <g key={anchor.id} className={`anchor-stamp ${anchor.id === selectedAnchorId ? "selected" : ""}`} onPointerDown={(event) => { event.stopPropagation(); setSelectedAnchorId(anchor.id); }}>
                  <circle cx={anchor.x * 1000} cy={anchor.y * 620} r="19" />
                  <text x={anchor.x * 1000} y={anchor.y * 620 + 5}>{index + 1}</text>
                  <rect x={anchor.x * 1000 + 27} y={anchor.y * 620 - 30} width={Math.max(94, anchor.name.length * 7.4)} height="27" rx="4" />
                  <text className="anchor-name" x={anchor.x * 1000 + 36} y={anchor.y * 620 - 12}>{anchor.name}</text>
                </g>
              ))}
              {isPreviewing && previewBirds.map((bird) => (
                <g key={bird.index} transform={`translate(${bird.x * 1000} ${bird.y * 620}) scale(${bird.scale})`} className="preview-bird">
                  <path d="M-11 3 Q-5 -7 0 1 Q6 -8 13 2" fill="none" stroke="#043A78" strokeWidth="3.2" strokeLinecap="round" />
                </g>
              ))}
            </svg>
            <div className="stage-hud"><span>{anchors.length} anchors</span><span>{routes.length} routes</span><span>{selectedRoute?.duration}s · {selectedRoute?.density}</span><span>{isPreviewing ? "Preview active" : "Ready"}</span></div>
          </div>
        </section>
      </main>

      <aside className="inspector">
        <div className="inspector-head"><div><p className="eyebrow">FLIGHT INSPECTOR</p><h2>{selectedRoute?.name ?? "Draw a route"}</h2></div><Sparkles size={18} /></div>
        {selectedRoute && <>
          <label className="field"><span>Path name</span><input value={selectedRoute.name} onChange={(event) => updateRoute({ name: event.target.value })} /></label>
          <label className="field"><span>Flock treatment</span><select value={selectedRoute.treatment} onChange={(event) => updateRoute({ treatment: event.target.value })}>{treatmentOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <div className="field-grid">
            <label className="field"><span>Duration</span><select value={selectedRoute.duration} onChange={(event) => updateRoute({ duration: Number(event.target.value) })}><option value={8}>8 sec</option><option value={10}>10 sec</option><option value={12}>12 sec</option></select></label>
            <label className="field"><span>Density</span><select value={selectedRoute.density} onChange={(event) => updateRoute({ density: event.target.value })}><option>Sparse</option><option>Medium</option><option>Dense</option><option>Murmuration</option></select></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>Wing intensity</span><select value={selectedRoute.wing} onChange={(event) => updateRoute({ wing: event.target.value })}><option>Subtle</option><option>Natural</option><option>Strong</option><option>Dramatic</option></select></label>
            <label className="field"><span>Layering</span><select value={selectedRoute.layering} onChange={(event) => updateRoute({ layering: event.target.value })}><option>Behind all content</option><option>Behind selected cards</option><option>Between background and content</option><option>Foreground accent</option></select></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>Start</span><select value={selectedRoute.start} onChange={(event) => updateRoute({ start: event.target.value })}><option>Enter from right</option><option>Enter from left</option><option>Emerge from anchor</option><option>Fade in</option></select></label>
            <label className="field"><span>End</span><select value={selectedRoute.end} onChange={(event) => updateRoute({ end: event.target.value })}><option>Exit left</option><option>Exit right</option><option>Pull upward</option><option>Dive out</option><option>Fade out</option></select></label>
          </div>
          <label className="field"><span>Production note</span><textarea value={selectedRoute.notes} rows={4} onChange={(event) => updateRoute({ notes: event.target.value })} /></label>
        </>}

        <div className="anchor-editor">
          <div className="section-heading"><div><p className="section-label">Selected anchor</p><strong>{selectedAnchor?.name ?? "None selected"}</strong></div><MapPinned size={17} /></div>
          {selectedAnchor && <>
            <label className="field compact"><span>Name</span><input value={selectedAnchor.name} onChange={(event) => updateAnchor({ name: event.target.value })} /></label>
            <div className="field-grid"><label className="field compact"><span>Role</span><select value={selectedAnchor.role} onChange={(event) => updateAnchor({ role: event.target.value })}><option>Card group</option><option>Headline</option><option>Image</option><option>CTA</option><option>Logo</option><option>Section boundary</option><option>Open space</option></select></label><label className="field compact"><span>Flock uses it</span><select value={selectedAnchor.interaction} onChange={(event) => updateAnchor({ interaction: event.target.value })}><option>Pass behind</option><option>Frame</option><option>Orbit</option><option>Avoid</option><option>Dive toward</option><option>Emerge from</option><option>Exit past</option></select></label></div>
          </>}
        </div>

        <div className="export-card">
          <div className="export-art" style={{ backgroundImage: "url(/manus-storage/route-export-card_0fb8b9da.png)" }} />
          <div><p className="eyebrow">MOTION BRIEF</p><h3>Export the choreography.</h3><p>Normalized paths, anchor behavior, and production notes in a single handoff.</p></div>
          <div className="export-actions">
            <button onClick={() => downloadFile("ppm-bird-motion-brief.json", JSON.stringify(motionBrief, null, 2), "application/json")}><FileJson size={15} /> JSON</button>
            <button onClick={exportVisualMap}><ImageDown size={15} /> Visual map</button>
            <button onClick={() => copy(markdownBrief, "brief")}><Clipboard size={15} /> {copied === "brief" ? "Copied" : "Brief"}</button>
          </div>
        </div>

        <div className="overlay-kit">
          <div><Link size={15} /><strong>Use on any live page</strong></div>
          <p>Copy the overlay link, save it as a bookmark, then run it on a page to draw and export directly over the real layout.</p>
          <button className="overlay-copy" onClick={() => copy(overlayBookmarklet, "kit")}>{copied === "kit" ? <Check size={15} /> : <Copy size={15} />} {copied === "kit" ? "Overlay link copied" : "Copy overlay link"}</button>
        </div>
      </aside>
    </div>
  );
}
