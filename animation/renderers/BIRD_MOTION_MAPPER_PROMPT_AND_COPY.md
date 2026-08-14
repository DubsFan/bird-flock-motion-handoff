# Bird Motion Mapper: Build Prompt and Interface Copy

## Product Name

**Bird Motion Mapper**

> Map where a flock should enter, move, react, and leave before animation is rendered.

---

# 1. Master Build Prompt

Use the following prompt as the complete brief for building the tool.

```text
Build a polished, single-purpose web tool called “Bird Motion Mapper.”

Purpose
The tool lets a designer open a real webpage, identify important visual objects such as cards, headings, product images, CTAs, and section boundaries, then draw a proposed flock flight path directly over the page with the mouse. The tool must save a precise, reusable bird-motion brief so an animation designer can create optimized transparent bird-background video or web animation for that exact layout.

Primary user
A designer who is placing hand-drawn bird flock background animation behind a modern website. They need to communicate where birds should enter, pass behind or around cards, expand, dive, curl, gather, and exit without writing animation code.

Core interaction model
1. The user opens a target webpage in the browser.
2. The Bird Motion Mapper overlay is activated on top of that live page through a bookmarklet, injected script, or browser-side overlay. The overlay must never alter the target page’s actual content.
3. The user clicks important page objects. The tool records the element selector when available, bounding box, visible text label, element role, and its x/y coordinates as percentages of the viewport.
4. The user draws one or more bird flight paths by holding the mouse button and dragging across the page.
5. Each path captures normalized points, enter location, exit location, path length, direction, timestamps, and the page objects the path approaches, passes behind, avoids, or frames.
6. The user assigns a flock treatment to each path: Calm Glide, Symmetric Murmuration, Dive and Pullout, Split and Rejoin, Ribbon Wave, Curl and Release, or Custom.
7. The user sets a flock density, speed, wing intensity, visual prominence, and layering behavior. Layering behavior must include Behind All Content, Behind Selected Cards, Between Background and Content, and Foreground Accent.
8. The user previews simplified hand-drawn blue bird markers moving along the drawn route. This preview is only a guide. It does not need to generate final bird art or video.
9. The user exports a complete JSON motion brief plus a readable Markdown summary and a PNG screenshot with the route and labels burned in.

Required screens and states
A. Welcome / Setup panel
- Project name
- Target page URL
- Button: “Open Motion Mapper on This Page”
- Alternate button: “Upload a Screenshot Instead”
- Short explanation that the tool records only layout anchors and motion guidance, not page credentials or private form data.

B. Overlay / Mapping workspace
- Collapsible dark floating side panel that remains on top of the target page.
- Canvas overlay with a transparent grid and mouse-drawn motion paths.
- Cursor crosshair while drawing.
- Selected elements highlighted with a thin electric-blue outline and a numbered anchor label.
- Drawn paths shown as smooth pale-blue splines with directional arrowheads.
- Existing paths remain editable: select, drag points, rename, duplicate, reorder, or delete.
- A small playback control animates simple bird markers over each path.

C. Motion inspector
For the selected path, show:
- Path name
- Flock treatment
- Start and end action
- Travel duration
- Density
- Scale range
- Wing intensity
- Layering behavior
- “Interact with anchors” list: pass behind, frame, orbit, avoid, dive toward, emerge from, or exit past.
- Notes field

D. Export panel
- Button: “Export Motion Brief (.json)”
- Button: “Export Visual Map (.png)”
- Button: “Copy Designer Brief”
- Button: “Copy Agent Prompt”
- A validation checklist that confirms at least one path and one anchor exist.

Data requirements
Store all layout values as normalized 0–1 viewport coordinates, plus the viewport width and height recorded at capture time. Store raw pointer points and a smoothed path representation. For each anchor, store selector if available, element tag, accessible label or nearby text snippet, bounding rectangle, normalized center point, and a human-readable anchor name.

Export requirements
Create a JSON file with project metadata, viewport, anchors, paths, styling directives, and notes. Also create a Markdown summary using the exact “Designer Brief Template” included below.

Visual design
- Dark charcoal tool UI, with a soft near-black panel (#101827).
- Electric bird-ink blue accent (#043A78) with a lighter preview blue for paths.
- Clean and calm. This is a professional motion-layout tool, not a cartoon drawing app.
- Use rounded corners, a compact hierarchy, and a reduced number of controls per state.
- No clutter. Advanced fields live in the path inspector.

Important constraints
- Do not modify the target page DOM except to display the removable overlay.
- Do not capture passwords, typed form values, cookies, credentials, or private page content.
- Never send captured data automatically. Exports remain user-controlled.
- Keep the overlay removable with Escape and a visible “Close Mapper” button.
- The final artifact must work well on desktop first. Touch support is optional, not required for v1.

Technical implementation preferences
- Build as a React + TypeScript static web app plus a bookmarklet or injected overlay script.
- Keep route capture, anchor extraction, smoothing, export, and preview fully client-side.
- Use SVG or Canvas for drawn paths and directional arrows.
- Implement path smoothing with Catmull-Rom to Bézier conversion or a similarly clean spline technique.
- Use localStorage for unsaved drafts.
- Export JSON, Markdown, and PNG without requiring a backend.

Definition of done
A user can map a target page in under five minutes, click the cards that matter, draw a flock route, preview bird markers, select how the flock behaves around page objects, and export a self-contained brief that an animation designer or AI agent can use without a follow-up call.
```

---

# 2. Website and Overlay Copy

## Welcome Screen

| Location | Exact copy |
| --- | --- |
| Eyebrow | **BIRD MOTION MAPPER** |
| Heading | **Design flock movement around the page.** |
| Body | Draw where birds enter, gather, dive, frame your cards, and leave. Export a motion brief that turns your layout intent into a production-ready animation plan. |
| Project label | Project name |
| Project placeholder | Example: PPM Homepage Hero |
| URL label | Target page URL |
| URL placeholder | https://your-site.com/page |
| Primary button | Open Motion Mapper on This Page |
| Secondary button | Upload a Screenshot Instead |
| Privacy note | The mapper records layout anchors and motion guidance only. It never reads passwords, form inputs, cookies, or login credentials. |
| Help link | How mapping works |

## Empty Mapping State

| Location | Exact copy |
| --- | --- |
| Panel heading | **Start mapping** |
| Step 1 | **1. Mark what matters.** Click the cards, headlines, images, or section edges the flock should react to. |
| Step 2 | **2. Draw the flight.** Drag across the page to show where the flock should enter, move, and exit. |
| Step 3 | **3. Define the behavior.** Choose a flock treatment, density, speed, wing intensity, and layering. |
| Primary button | Add First Anchor |
| Secondary button | Draw First Flight Path |
| Small note | Press **A** to add anchors. Press **D** to draw paths. Press **Space** to preview. |

## Toolbar

| Control | Exact copy |
| --- | --- |
| Select mode | Select |
| Add anchor mode | Add Anchor |
| Draw path mode | Draw Flight Path |
| Preview | Preview Motion |
| Undo | Undo |
| Redo | Redo |
| Delete | Delete Selected |
| Close | Close Mapper |

## Anchor Inspector

| Location | Exact copy |
| --- | --- |
| Heading | **Anchor {{number}}** |
| Name label | Anchor name |
| Name placeholder | Example: Benefits Card Group |
| Role label | What is this? |
| Role options | Card group; Headline; Image; CTA; Logo; Section boundary; Open space; Other |
| Position label | Position in viewport |
| Behavior label | How should birds use this? |
| Behavior options | Pass behind; Frame; Orbit; Avoid; Dive toward; Emerge from; Exit past |
| Button | Remove Anchor |

## Path Inspector

| Location | Exact copy |
| --- | --- |
| Heading | **Flight Path {{number}}** |
| Name label | Path name |
| Name placeholder | Example: Hero Dive and Pullout |
| Treatment label | Flock treatment |
| Treatment options | Calm Glide; Symmetric Murmuration; Dive and Pullout; Split and Rejoin; Ribbon Wave; Curl and Release; Custom |
| Start action label | Start action |
| Start options | Enter from right; Enter from left; Emerge from anchor; Fade in; Already in frame |
| End action label | End action |
| End options | Exit left; Exit right; Pull upward; Dive out; Fold into anchor; Fade out |
| Duration label | Approximate duration |
| Density label | Flock density |
| Density options | Sparse; Medium; Dense; Murmuration |
| Scale label | Bird scale range |
| Wing label | Wing intensity |
| Wing options | Subtle; Natural; Strong; Dramatic |
| Layering label | Layering |
| Layering options | Behind all content; Behind selected cards; Between background and content; Foreground accent |
| Anchor interaction label | React to anchors |
| Notes label | Motion notes |
| Notes placeholder | Example: Dive between the headline and card grid, widen around the lower cards, then pull upward before the CTA. |

## Preview State

| Location | Exact copy |
| --- | --- |
| Preview heading | **Motion preview** |
| Body | These markers show timing and composition only. Final birds will use the approved hand-drawn contour style. |
| Play button | Play Preview |
| Pause button | Pause |
| Restart button | Restart |
| Speed label | Preview speed |

## Export Screen

| Location | Exact copy |
| --- | --- |
| Heading | **Export the motion brief** |
| Body | Your export includes normalized paths, selected layout anchors, flock behavior, production notes, and a visual reference map. |
| Button 1 | Export Motion Brief (.json) |
| Button 2 | Export Visual Map (.png) |
| Button 3 | Copy Designer Brief |
| Button 4 | Copy Agent Prompt |
| Validation empty | Add at least one flight path and one anchor before export. |
| Validation pass | Your motion brief is ready to export. |

## Confirmation and Error States

| Situation | Exact copy |
| --- | --- |
| Anchor added | Anchor {{number}} added. Give it a name or continue mapping. |
| Path added | Flight path {{number}} recorded. Select it to refine flock behavior. |
| Draft saved | Draft saved on this device. |
| Export complete | Motion brief exported. Send the JSON and visual map to the animation designer. |
| No element found | No selectable page element was found here. You can still add a free-position anchor. |
| Overlay blocked | The target page blocked direct mapping. Use “Upload a Screenshot Instead” to map the layout manually. |

---

# 3. Designer Brief Template

The tool must generate this Markdown document for every export.

```md
# Bird Motion Brief: {{project_name}}

## Target Layout

- **Target URL:** {{target_url}}
- **Captured viewport:** {{viewport_width}} × {{viewport_height}}
- **Background treatment:** {{overall_treatment}}
- **Desired visual prominence:** {{visual_prominence}}

## Motion Intent

{{overall_motion_notes}}

## Page Anchors

| # | Anchor | Role | Viewport Position | Flock Interaction |
| --- | --- | --- | --- | --- |
{{anchor_rows}}

## Flight Paths

{{path_sections}}

## Production Constraints

- Use only the approved hand-drawn source-contour bird language.
- Maintain transparent alpha outside the birds.
- Birds must face and fly in the intended screen direction.
- Wing motion must be visible across the whole flock, not only foreground birds.
- Preserve readable space for cards, headings, CTAs, and images.
- The motion must be safe as a background layer: visually rich but never destructive to legibility.

## Export Files

- `{{project_slug}}-motion-brief.json`
- `{{project_slug}}-visual-map.png`
```

## Required Flight-Path Section

```md
### {{path_name}}

- **Treatment:** {{treatment}}
- **Duration:** {{duration_seconds}} seconds
- **Entry:** {{start_action}}
- **Exit:** {{end_action}}
- **Density:** {{density}}
- **Scale range:** {{scale_range}}
- **Wing intensity:** {{wing_intensity}}
- **Layering:** {{layering}}
- **Anchor interactions:** {{anchor_interactions}}

{{path_notes}}
```

---

# 4. Agent Prompt Generated from a Completed Map

The tool should create the following prompt after export. The user can paste it into an animation-production task along with the JSON and visual map.

```text
Create a transparent bird-flock background animation using the attached Bird Motion Mapper export.

Treat the exported page anchors and motion paths as the spatial source of truth. The animation must be composed for the captured viewport and must preserve readable negative space around important cards, headlines, images, and CTAs.

Use only the approved hand-drawn source-contour bird style. Do not generate realistic birds, filled silhouettes, cartoon birds, or substitute bird artwork. All birds must face the intended flight direction and visibly flap using natural, center-notch wing articulation.

For each path, honor the selected flock treatment, entry/exit direction, density, layer placement, timing, and anchor interactions. The birds should feel like one coordinated flock moving through the actual page layout, not isolated crossings or static formation slots.

Deliver:
1. Transparent VP9 WebM for the website.
2. Transparent ProRes 4444 MOV master.
3. White-background MP4 review copy.
4. Browser-playback contact sheet and close-interval wing-motion proof.

Do not deliver until browser playback confirms that the complete flock travels as mapped, wings visibly move across the whole flock, and the animation leaves the selected page content readable.
```

---

# 5. Motion Brief JSON Shape

```json
{
  "schema_version": "1.0",
  "project": {
    "name": "PPM Homepage Hero",
    "target_url": "https://example.com",
    "captured_at": "2026-08-13T12:00:00-07:00",
    "viewport": { "width": 1672, "height": 941 }
  },
  "anchors": [
    {
      "id": "anchor-1",
      "name": "Benefits Card Group",
      "role": "Card group",
      "selector": "#benefits-grid",
      "text_hint": "Build a resilient portfolio",
      "rect": { "x": 846, "y": 320, "width": 620, "height": 380 },
      "normalized_center": { "x": 0.693, "y": 0.542 },
      "flock_interaction": "Pass behind"
    }
  ],
  "paths": [
    {
      "id": "path-1",
      "name": "Hero Dive and Pullout",
      "treatment": "Dive and Pullout",
      "entry": "Enter from right",
      "exit": "Pull upward",
      "duration_seconds": 10,
      "density": "Murmuration",
      "scale_range": "Small to large",
      "wing_intensity": "Strong",
      "layering": "Behind selected cards",
      "anchor_interactions": [
        { "anchor_id": "anchor-1", "action": "Frame" }
      ],
      "raw_points": [
        { "x": 0.99, "y": 0.18, "t": 0 },
        { "x": 0.73, "y": 0.34, "t": 0.9 },
        { "x": 0.51, "y": 0.78, "t": 2.6 },
        { "x": 0.21, "y": 0.27, "t": 5.1 }
      ],
      "smoothed_path": "SVG or Bezier path representation",
      "notes": "Dive between the headline and cards, widen around the grid, then pull upward before the CTA."
    }
  ],
  "style": {
    "ink_color": "#043A78",
    "transparent_background": true,
    "source_contours_only": true
  }
}
```

---

# 6. First-Run Example

Use this worked example in a tutorial card.

> **Example: Hero Dive and Pullout**
>
> 1. Click the hero headline and the benefits card grid to add anchors.
> 2. Draw from the top-right edge, between the headline and cards, down through the lower center, then up toward the left edge.
> 3. Choose **Dive and Pullout**, **Murmuration** density, **Strong** wing intensity, and **Behind Selected Cards**.
> 4. Preview the route. Adjust the curve until the birds frame the cards rather than covering them.
> 5. Export the brief and send it with the visual map for animation production.

---

# 7. Short In-App Help Copy

> **You are not animating birds here. You are giving the flock a reason to move through the layout.**
>
> Mark what the birds should respect. Draw the path they should follow. Define how the flock should behave around the page.
