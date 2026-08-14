# Murmur Motion and Export Audit Log

Date: 2026-08-14 (America/Los_Angeles)

Current truth: Iterations 10 and 11 document a rejected regression in which the
runtime deformed frame one instead of playing the supplied drawings. Iterations
12 and 13 supersede their wing-rendering claims and artifacts. They remain below so
future agents can see exactly what failed and do not repeat it.

## Requested scope

- Adjustable bird size and flight speed.
- Background-to-foreground and foreground-to-background depth travel.
- Constant, natural landing velocity without a last-second rush.
- User-defined export filenames.
- MP4, transparent Chrome WebM, and an Apple transparency handoff.
- An agent-facing guide for applying exports over the selected background.
- Exact per-flock perch/gather/fly-through counts, including zero.
- Per-flock artwork sets and a downloadable production prompt for another artwork agent.
- Removal of the blank lead-in and an opt-in seamless background loop.
- Restoration of the approved artist contours and visible wing animation.
- Automatic flight-facing direction derived from entry, path, and exit.
- A confirmed per-flock Start over control that erases path and landing geometry without discarding artwork or motion styling.
- Research, tests, debugging, and visual inspection after each implementation stage.

## Baseline audit

- Branch: `main` at `3cd3043` before implementation.
- Production build passed.
- Browser baseline rendered with no console warnings/errors.
- Landing defect found in `lib/flock/engine.ts`: the path stopped at its nearest point to the landing zone, then all birds visually blended to the landing target during a fixed 0.45-second window. This changed apparent velocity and compressed the flock unnaturally.
- Export names were derived only from the fixed project name, `Untitled flock`.
- Existing video export used `MediaRecorder` WebM capture and had no MP4 path.

## Research decisions

- MP4/H.264 is an opaque delivery format in this tool. Runtime codec support must be detected rather than assumed: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static
- Deterministic MP4 and WebM creation uses Mediabunny's canvas/WebCodecs pipeline: https://github.com/Vanilagy/mediabunny
- HEIC/HEIF is an image or image-sequence container. Apple's standard transparent motion deliverable is HEVC with alpha in a movie file, encoded through AVFoundation: https://developer.apple.com/documentation/AVFoundation/using-hevc-video-with-alpha
- A browser cannot honestly promise Apple HEVC-alpha encoding. Murmur therefore exports a lossless transparent-frame handoff bundle with Apple conversion and application guidance instead of relabeling another codec as HEIC.

## Iteration 1: motion controls and landing model

- Added per-flock size, speed, depth direction, and perspective-strength fields with local-storage migration defaults.
- Expanded bird size to `6×` and added a one-click small-background → giant-foreground setup. It enlarges one selected hero bird while retaining restrained, readable support birds; it no longer multiplies the whole flock into a stacked mass.
- Rebuilt the motion path so a landing center is an actual spline waypoint.
- Replaced the fixed 0.45-second landing blend with a distance-based approach and release runway.
- Made the visible path guide use the same sampled route as the renderer.
- Added unit tests for speed/runtime scaling, landing-center routing, constant pre-arrival velocity, and reversible depth scaling.

## Iteration 2: approved artwork and per-flock assignment

- Recovered the locked C/A/B/D artist-contour lineage from repository history and compared it with the supplied reference render and scripts.
- Verified the supplied `Bird_Artwork_Pack.zip` SHA-256: `20d98dc9ec13afabc1abc1acceb12b9257afbdd09b06f0c12999065a07b499b1`.
- Integrated 32 authoritative RGBA references: four source-contour identities, each with an ordered eight-pose upstroke/downstroke cycle. A later rejected iteration replaced this with deformation of one still; Iteration 12 restores authored ordered playback from the canonical source libraries.
- Preview and every export use the same artist source assets. Each flock can retain its own uploaded one-frame or 2–16-frame artwork set.
- Added an input-facing metadata control (`left` or `right`). Rendering automatically mirrors the source from the chosen entry, live path tangent, and exit; the source is no longer hard-coded as the required travel direction.
- Added a downloadable artwork-agent Markdown contract with exact folder structure, accepted input types, alpha/pivot rules, manifest schema, and QA rejection rules.

## Iteration 3: landing roles, lead-in, and loop

- Added exact perch and gather counts. Remaining birds use an independent fly-through clock and never pause at the landing.
- Replaced follower catch-up with equal-speed, distance-staggered clocks; the project duration includes the follower tail rather than accelerating it.
- The leader begins inside the visible canvas on frame zero with no entry-alpha fade. A rendered first-frame inspection confirmed visible artist ink at `0.0s`.
- Seamless mode uses a periodic Catmull-Rom path, periodic wing/depth phases, continuous preview wrap, and disables landing stops.
- Encoded-loop audit used a real 48-frame H.264 export at `1600x900`, `30 fps`, `1.6s`. Decoded first/final frames were visually identical and measured `SSIM 0.998066`; the small residual is lossy H.264 compression, with no position reset or blank flash.

## Iteration 4: export reliability and codec proof

- Added custom filename input and persistent completed-export download links. This prevents large delayed browser blobs from disappearing after the initiating click gesture.
- Real H.264 artifact: `/Users/liltroy/Downloads/murmur-artist-directional-audit-v6.mp4`; `avc1`, `yuv420p`, `1600x900`, `30 fps`, `81` frames, `2.7s`.
- Real transparent artifact: `/Users/liltroy/Downloads/murmur-artist-directional-audit-v6-alpha.webm`; VP9, `1600x900`, `30 fps`, `alpha_mode=1`.
- MP4 frame-zero signal statistics were nonblank (`YMIN=25`, `YAVG=31.0424`, `YMAX=64`). A five-frame early contact sheet visually confirmed changing authored wing poses and a foreground/support size hierarchy.
- Giant-growth live playback confirmed a small distant flock at `0.3s` and a foreground artist bird spanning most of the stage at `7.8s` using the one-click `3.5×` / maximum-perspective preset.
- Transparent PNG and Apple HEVC-alpha handoffs report exact frame progress, contain project-specific `AGENTS.md`, and retain a persistent download link after generation.

## Iteration 5: supplied murmuration references

- Inspected four supplied `1672x940`, `24 fps`, `10s` review MP4s plus their render scripts and review notes.
- Confirmed the intended invariants: C/A/B/D source contours, readable foreground/middle/distant tiers, every visible bird flapping, and smooth multi-second shape changes.
- An older reference deliberately fades to blank alpha at both loop edges. The current user requirement supersedes that treatment: normal mode begins visibly on frame zero; seamless mode matches nonblank start/end state.

## Iteration 6: start-over workflow

- Added a selected-flock `Start over` control beside the flock tabs.
- The first click is non-destructive and exposes explicit `Erase` and `Cancel` actions. `Erase` clears path points, landing geometry, landing roles, and loop state; it pauses at frame zero and switches to Path mode.
- Artwork assignment, ink, treatment, size, speed, depth, timing, notes, the scene background, and every other flock are preserved.
- Browser verification used a temporary second flock: confirmation rendered, erase produced a blank selected-flock canvas in Path mode, the untouched Hero Dive remained visible, and the temporary flock was removed afterward. Browser warning/error log remained empty.

## Iteration 7: chronology-grounded motion and calm composition

- Audited the three supplied source generations chronologically. The accepted foundation is: C/A/B/D artist contours, center-notch wing articulation, one shared continuous route with delayed followers, time-varying murmuration offsets, every visible bird flapping, and broad negative space. Older blank-edge and hard-coded-left treatments were retained only as lessons because the newer requirements explicitly supersede them.
- Reproduced the reported stack in the live browser. The saved state was `44` birds with a `3.5×` global size and more than `10×` perspective growth; this made every follower compete as a foreground hero.
- Added independent formation-spacing, foreground-bird-count, and foreground-boost controls. Depth perspective now applies strongly only to the requested hero count, while support birds retain a restrained depth cue.
- Added a one-click `Peaceful, spacious flock` composition: 22 birds, soft slow wings, broad diagonal separation, one readable hero, two middle tiers, zero forced landings, and generous empty space.
- Replaced formation-slot relaxation with low-frequency independent drift plus shared breathing around delayed samples of the same route. The flock continues to travel instead of collapsing into static targets.
- Clamped visual banking to `±0.48 rad` so auto-directional birds can bank into a curve without rotating sideways or upside down.

## Iteration 8: artwork resolution, wing cadence, and background proof

- Replaced all 32 bundled C/A/B/D animation frames with the supplied native `1600 px` transparent masters from the newest Bird Artwork Pack; no generic substitute bird art is used.
- Slowed soft/medium/strong wing cadence to approximately `0.30–0.55` complete beats/second with per-bird phase and rate variation. A later rejected iteration removed authored pose playback; Iteration 12 supersedes both choices with the source library's 6/8/10 fps contract.
- Enabled high-quality canvas smoothing at up to `3×` device pixel ratio. Small contour birds receive same-pixel ink reinforcement without changing their geometry or inventing a new silhouette.
- Added numbered-frame validation for 2–16-frame custom sets: matching dimensions, transparent and visible pixels, unambiguous order, and a warning below the recommended `960 px` support resolution.
- Changed the untouched legacy fallback background from near-black to warm ivory and added direct ivory, white, near-black, and PPM-blue background/ink swatches. The chosen background is baked into MP4 and remains a preview/application reference for alpha exports.
- Live calm-state inspection at multiple close timestamps confirmed visible but unsynchronized wing-pose changes, nonblank frame zero, readable size tiers, upright directionality, and no console warnings/errors.
- Real transparent proof: `/Users/liltroy/Downloads/murmur-calm-grounded-audit-v9-alpha.webm`; VP9 alpha, `1600x900`, `30 fps`, `13s`.
- Real opaque proof: `/Users/liltroy/Downloads/murmur-calm-grounded-audit-v10.mp4`; H.264, `1600x900`, `30 fps`, `13s`, with the selected warm-ivory background baked in.
- Real loop proof: `/Users/liltroy/Downloads/murmur-seamless-loop-audit-v10.mp4`; H.264, `1600x900`, `30 fps`, `11.133s`. Its decoded first/final frames are both nonblank and measure `SSIM 0.999622`; the residual is lossy compression rather than a reset or blank flash.

## Iteration 9: exact flock choreography and timing proofs

- Added an exact `1–120` visible-bird control and made density a quick count shortcut rather than the authoritative flock size.
- Replaced partial treatment switches with complete one-click starting motions: Calm editorial (`22`), Balanced lift (`36`), Waterfall bloom (`68`), and Vortex sweep (`74`). Each applies a route, exact count, size hierarchy, formation spacing, cadence, speed, and direction while remaining fully editable.
- Ported the supplied Waterfall broad-body/compression/release behavior and rewrote Vortex as a low banking sweep, short asymmetric compression, and rise rather than an orbit, ring, or vertical attack column.
- Added deterministic rank-ordered follower delays and wider hero slots. This retains one readable lead contour, descending support tiers, and broad negative space instead of random stacks.
- Trimmed the normal exit runway and made project duration account for the real maximum follower delay. `/Users/liltroy/Downloads/murmur-grounded-calm-v12.mp4` begins populated at frame zero, remains populated through the useful ending, and is blank only during the final exit frames; H.264, `1600x900`, `30 fps`, `12.6s`.
- Transparent calm proof: `/Users/liltroy/Downloads/murmur-grounded-calm-v12-alpha.webm`; VP9, `1600x900`, `30 fps`, `12.6s`, `alpha_mode=1`.
- Landing proof: `/Users/liltroy/Downloads/murmur-landing-constant-v13.mp4`; approach contact-sheet samples from `3.4–6.2s` show the selected three perch and four gather birds settling without a late catch-up, while 15 birds retain the fly-through clock.
- Closed-loop proof: `/Users/liltroy/Downloads/murmur-loop-v14.mp4`; H.264, `1600x900`, `30 fps`, `11.133s`. Decoded nonblank first/final frames measured `SSIM 0.999154`.

## Iteration 10: rejected provisional continuous flex and export plumbing

- Replaced the built-in eight-pose flipbook with continuous articulation of the exact neutral C/A/B/D master. The renderer splits the source at its measured center notch, independently flexes the two wing regions, and restores the artist-drawn center above them.
- Initially matched an older locked note at approximately `±3°` and proved that continuous motion removed sprite snapping. A later chronology audit found this was too conservative relative to the newest Artwork Pack generator; Iteration 11 supersedes the wing range and source-input recommendation.
- Close live captures across the wing cycle confirmed continuous outline changes without a gray doubled contour, pose snapping, whole-image rotation, or a moving center notch. The calm spacing, ranked scale hierarchy, path, and follower timing were left unchanged during this wing-only iteration.
- Real wing proof: `/Users/liltroy/Downloads/murmur-calm-continuous-wings-v15.mp4`; H.264, `1600x900`, `30 fps`, `12.6s`. A 16-sample decoded contact sheet is stored at `work/calm-v15-wing-cycle-sheet.png`.
- Provisional transparent proof: `/Users/liltroy/Downloads/murmur-calm-continuous-wings-v15-alpha.webm`; VP9, `1600x900`, `30 fps`, `12.6s`, `alpha_mode=1`. Decoded alpha statistics include fully transparent and fully opaque pixels (`YMIN=0`, `YMAX=255`).
- Provisional loop proof: `/Users/liltroy/Downloads/murmur-continuous-wings-loop-v16.mp4`; H.264, `1600x900`, `30 fps`, `11.133s`, `334` frames. Decoded nonblank first/final frames measure `SSIM 0.999094`.
- Landing-regression proof: `/Users/liltroy/Downloads/murmur-continuous-wings-landing-v17.mp4`; H.264, `1600x900`, `30 fps`, `12.067s`, `362` frames. An eight-sample `3.4–6.6s` approach sheet confirms 3 perch + 4 gather birds follow the landing route while 15 retain fly-through timing, with no last-second pull.
- Rechecked the extreme depth control in live playback: the same selected hero is a readable distant bird at `0.8s` and grows to span most of the stage at `8.3s`; support birds remain restrained instead of scaling into an overlapping attack mass.
- Final opaque renderer proof after distant-contour reinforcement: `/Users/liltroy/Downloads/murmur-calm-current-renderer-v18.mp4`; H.264, `1600x900`, `30 fps`, `12.6s`, `378` frames. The decoded 16-sample sheet retains the calm negative space, readable ranked tiers, and exact artist geometry.
- A one-PNG import path was prototyped as a lightweight fallback. Iteration 11 corrects the preferred contract to the newest pack's ordered eight-pose bundle and adds manifest-aware continuous runtime articulation.
- Real Apple handoff proof: `/Users/liltroy/Downloads/murmur-apple-alpha-proof-v19-apple-hevc-alpha-handoff.zip`; `8.4 MB`, 151 transparent `1600x900` PNG frames at `30 fps`, `README.txt`, `AGENTS.md`, and a motion brief. Decoded frame zero contains both transparent and opaque alpha (`YMIN=0`, `YMAX=255`); the README explicitly produces `murmur-apple-alpha-proof-v19-alpha.mov` as HEVC with alpha and does not mislabel HEIC as video.

## Iteration 11: superseded still-frame rig and manifest-aware bundles

- Re-read the newest `Three/Bird Artwork Pack.md`, `README_UPLOAD.md`, generator, manifest, and validation instead of relying on the older ±3° note. The newest source explicitly says an ordered eight-frame sequence is the best natural input and generates it with the full `-34/+30°` left and `+34/-32°` right center-notch rig.
- Restored that exact authored range while keeping continuous evaluation. Soft uses `0.55×`, Medium `0.78×`, and Strong the full generator range; cadence stays at the calm `0.30–0.55` beats/second with independent seeded phase/rate variation. This preserves the newest poses without returning to an eight-frame snap.
- Seven live close captures and decoded v20 sheets show a continuous upstroke → neutral/glide → downstroke cycle, fixed center notch, full-ink contour, and unsynchronized support birds. Calm spacing, size hierarchy, route, and timing were unchanged.
- Superseded opaque artifact: `/Users/liltroy/Downloads/murmur-authored-continuous-wings-v20.mp4`; H.264, `1600x900`, `30 fps`, `12.6s`, `378` frames. Superseded transparent artifact: `/Users/liltroy/Downloads/murmur-authored-continuous-wings-v20-alpha.webm`; VP9, `1600x900`, `30 fps`, `12.6s`, `alpha_mode=1`, decoded alpha `YMIN=0`, `YMAX=255`.
- Superseded loop artifact: `/Users/liltroy/Downloads/murmur-authored-wings-loop-v21.mp4`; H.264, `1600x900`, `30 fps`, `11.133s`, `334` frames. Decoded nonblank first/final frames measure `SSIM 0.999202`, but the artwork motion is not the accepted source-frame solution.
- Corrected the 16-candidate contract: each bundle contains one manifest plus eight numbered `1600 px` transparent poses, so 16 candidates contain 128 primary PNG frames. MP4/WebM/MOV remain review/output formats, not editable bird frames.
- Added strict manifest parsing for exactly one identity: canvas, in-bounds center-notch pivot, source direction, unique ordered 2–16 filenames, and exact filename/canvas agreement with selected images. Selecting `manifest.json` plus eight PNGs gives a custom identity continuous center-notch motion rather than flipbook stepping. Invalid or ambiguous bundles are rejected with a plain-language status message.
- Live UI now tells a nontechnical user to select one candidate's manifest plus eight PNGs together, never mix identities, and use one Flock tab per candidate. A centered single PNG remains a fallback, not the preferred delivery.

## Iteration 12: canonical flight and landing source restoration

- Audited the complete earlier-agent chronology from `Animate Birds 101 source` and the two new `bird anime source` archives rather than inferring motion from an old generator. The canonical flight library contains 16 identities, 8 aligned transparent frames per identity, three resolution tiers, a source preview at 8 fps, and explicit 6–10 fps playback guidance. The landing library contains the same 16 identities with matched 8-frame approach, perch/settle, and launch/flyoff tracks.
- Found the exact regression: Iterations 10 and 11 loaded frame one and continuously re-rigged it, bypassing the artist's seven other flight drawings and every supplied landing drawing. The user was correct that this weakened wing travel and regressed already-completed work.
- Curated the strongest ten identities non-destructively. Retained C hero glide/climb/dive, A support glide/lift/drop, B flock glide/lift/drop, and D distant glide. Quarantined four redundant pre-stretched sweep variants plus D distant lift/drop. The source archives remain intact; `SOURCE_CURATION.md` records every decision.
- Added 320 runtime PNGs: ten identities × flight, approach, perch, and launch × eight frames. The default mixed flock uses four readable roles; every curated identity is also selectable per flock.
- Replaced canonical runtime deformation with exact chronological source-frame playback. Soft, Medium, and Strong display the eight source poses at approximately 6, 8, and 10 fps respectively, with restrained seeded per-bird phase/rate variation. The old continuous two-half rig remains only as an explicit single-still fallback.
- Landing participants transition flight → authored approach → restrained perch/settle → authored launch → flight. Fly-through birds remain on the flight track. The constant arc-length route and distance-based landing runway remain unchanged, so visual pose changes cannot reintroduce a position rush.
- Rewrote the downloadable artwork-agent contract around the proven source input: 32 transparent PNGs per identity when landing is required, exact canonical filenames, fixed track-local canvas/shared normalized anchor/direction metadata, 6/8/10 fps QA, and MP4/WebM/MOV only as review/delivery files. A flock of 1–8 visible birds can reuse one identity with independent timing; it does not need one source file per visible bird.
- Validated all 320 curated assets: every one of the 40 tracks contains exactly eight PNGs, every PNG has transparent and visible pixels, every track has one stable canvas, and each identity's three action tracks share one canvas. The supplied flight and action canvases intentionally differ and are preserved without destructive normalization.
- Live browser captures 0.5 seconds apart show large, independent source-pose changes in the hero and support birds while the default 22-bird composition remains broad and non-stacked. Browser warning/error log is empty.
- Current landing proof: `/Users/liltroy/Downloads/murmur-canonical-source-landing-v22.mp4`; H.264 `avc1`, `1600x900`, `30 fps`, `362` frames, `12.0667s`. Frame zero is nonblank (`YMIN=62`, `YAVG=220.816`, `YMAX=231`). Decoded half-second landing crops show the participant holding its landing location through the two-second restrained perch sequence, then departing without a catch-up jump while 17 fly-through birds continue.
- Current transparent proof: `/Users/liltroy/Downloads/murmur-canonical-source-landing-v22-alpha.webm`; VP9, `1600x900`, `30 fps`, `12.066s`, `alpha_mode=1`. Decoded alpha spans fully transparent through fully opaque (`YMIN=0`, `YMAX=255`).
- Current loop proof: `/Users/liltroy/Downloads/murmur-canonical-source-loop-v23.mp4`; H.264 `avc1`, `1600x900`, `30 fps`, `334` frames, `11.1333s`. Decoded first/final frames are populated and visually matching; `SSIM 0.999555` is the lossy compression residual, not a blank or reset.

## Iteration 13: direct bundle intake, no-substitute loading, and large-flock correction

- Removed the procedural/generic renderer fallback from the live engine. Assigned artist tracks preload before the stage draws; reload now displays `Loading artist bird artwork…` over an empty stage and then the actual art. A missing asset surfaces an error instead of silently changing the bird design.
- Added direct one-ZIP intake for a complete identity. The importer accepts a versioned manifest plus nested flight, approach, perch, and launch folders; ignores macOS metadata; resolves duplicate basenames by track; validates alpha, visibility, order, canvas dimensions, and the all-or-none action contract; and retains legacy flat flight PNG intake.
- Live import proof used `murmur-full-bird-bundle-v1.zip`: status passed with `8 flight poses plus 24 matched landing-action poses`, the custom name appeared in preview, browser warnings/errors remained empty, and the same custom template restored after a full reload.
- Replaced localStorage-only project persistence with versioned IndexedDB storage and a legacy localStorage migration/fallback. This prevents a 32-frame RGBA identity from silently exceeding localStorage quota; a visible warning is shown if durable saving fails.
- Dynamically load both JSZip and the browser video encoder only on import/export paths, avoiding unnecessary initial-bundle work. The paused stage also stops its animation loop while still redrawing on data, resize, seek, and asset-load events.
- Added a real `MAKE_PRORES_4444.command` to the Apple handoff. The executable checks for ffmpeg and creates a transparent ProRes 4444 MOV; Compressor/AVFoundation remain the honest path from that master to HEVC with alpha.
- Found the attack-like Waterfall entry in a normal-speed browser check: six large leaders shared one zero-delay path point. Replaced it with the accepted staggered-leader/compact-tail roster so exactly one lead bird is present on frame zero and every follower has its own constant-speed delayed path sample.
- Found the Vortex late-column cause in the generated contact sheet: `Pull upward` nudged every left-moving path to a fixed point on the right. The exit now continues the authored horizontal direction while rising; a unit test locks leftward/upward continuation.
- Opaque Waterfall proof: `/Users/liltroy/Downloads/murmur-waterfall-canonical-v24.mp4`; H.264 `1600x900`, `30 fps`, `16.7333s`. Decoded frame zero contains the artist lead bird. The 1 fps full-playback sheet shows continuous entry, dive, broad bloom, and short final clearance; the 8 fps close sheet shows authored upstroke/downstroke changes across foreground and support birds.
- Transparent Waterfall proof: `/Users/liltroy/Downloads/murmur-waterfall-canonical-v24-alpha.webm`; VP9 `1600x900`, `30 fps`, `alpha_mode=1`, decoded alpha `YMIN=0`, `YMAX=255`.
- Current Apple proof: `/Users/liltroy/Downloads/murmur-waterfall-canonical-v24-apple-hevc-alpha-handoff.zip`; 502 RGBA PNG frames plus README, AGENTS, brief, and executable converter. Running the included command produced `murmur-waterfall-canonical-v24-prores4444.mov`: ProRes profile 4444, `1600x900`, `30 fps`, `16.7333s`, decoded `yuva444p12le` with transparent and opaque alpha range.
- Corrected Vortex proofs: `/Users/liltroy/Downloads/murmur-vortex-canonical-v25.mp4` and `murmur-vortex-canonical-v25-alpha.webm`; H.264/VP9, `1600x900`, `30 fps`, `17.3s`. The full contact sheet shows a low-right traveling sweep, brief elastic tightening, asymmetric up-left release, and exit rather than a static ring. VP9 carries `alpha_mode=1` and decodes alpha `YMIN=0`, `YMAX=255`.
- The default calm cadence is now the source library's natural `8 fps` Medium setting. Slow `6 fps` and active `10 fps` remain explicit user choices.

## Iteration 14: deterministic guide contrast and background visibility

- Replaced the ambiguous icon-only backdrop control with an always-labeled `Hide background` / `Show background` toggle whenever a scene image is loaded. The control exposes a matching accessible name and pressed state; the existing Remove action remains separate so hiding is reversible and cannot delete the scene accidentally.
- Rebuilt the editable path guide as a three-layer stroke: black outer edge, white inner halo, and blue semantic center. Start, end, and intermediate handles use concentric black/white rings with green, red, and blue centers. At least one neutral edge remains visible independent of the underlying image luminance or hue.
- Rebuilt the landing guide with black/white perimeter layers, an amber semantic stroke/fill, a concentric resize handle, and outlined `LANDING` text. It no longer depends on the application's theme token matching the uploaded background.
- Live browser proof used deterministic `#ffffff` and `#080b12` 1600×900 scene images. Path, every control point, landing perimeter, label, and resize handle remained readable on both extremes. The labeled button removed the image from the DOM and changed to `Show background`, then restored the same image and changed back to `Hide background`.
- Browser warning/error log remained empty. TypeScript, lint, and all 31 tests passed after the change.

## Requirement-by-requirement audit

| Requirement | Status | Current evidence |
| --- | --- | --- |
| Ground improvements in reference generations One → Two → Three without regressing | Proven | `MOTION_FOUNDATION.md` records the complete chronology through the canonical flight and landing libraries. Iteration 12 restores direct source playback and explicitly rejects the Iteration 10/11 single-still rig. |
| Use the real artist rendering, never generic substitute birds | Proven | `public/artist-birds/curated` contains 320 supplied transparent source frames. The live engine has no procedural fallback; asset loading shows an honest overlay and then only the assigned artist PNGs. |
| Graceful visible wing motion | Proven for the curated built-in set | Ten identities each use all eight authored flight frames in chronological order at approximately 6/8/10 fps with independent seeded phase/rate variation. Decoded Waterfall v24 close sheets show large upstroke/downstroke changes in foreground and support birds; frame one is not procedurally re-rigged. |
| Peaceful spacing, readable tiers, and non-attack energy | Proven | Canonical v22 and Waterfall v24/Vortex v25 full sheets show a staged lead hierarchy, descending supports, broad negative space, and continuous group travel. The shared-zero-delay entry pile and fixed-x Vortex pullout were found visually and corrected in Iteration 13. |
| Exact visible bird count, bird size, flight speed, and formation spacing | Proven | Exact birds `1–120`; size `0.35–6×`; speed `0.25–2.5×`; spacing `0.5–5×`; controls are live and serialized per flock. |
| Background↔foreground travel and a genuinely giant foreground bird | Proven | Bidirectional depth control, perspective strength, exact foreground count and boost; live `0.8s` vs `8.3s` giant-depth comparison. |
| Direction follows entry/path/exit and never turns upside down | Proven | Source-facing metadata plus automatic mirroring and `±0.48 rad` upright bank clamp; orientation/bank unit tests and live left/right route inspections. |
| No landing rush, catch-up, or teleport | Proven | Constant arc-length clock, landing as a real spline waypoint, rank delays without acceleration, transition tests, live approach inspection, and decoded v22 half-second landing crops. |
| Exact perch/gather/fly-through counts including zero | Proven | Current UI and v22 proof: 3 perch, 2 gather, 17 fly through; loop mode deterministically forces all birds to fly through. |
| No multi-second blank lead-in | Proven | Entry begins inside the canvas without alpha fade; all decoded normal and Apple proof frame-zero samples are nonblank. |
| No wasteful multi-second tail | Proven | Exit runway is 6%; canonical-source v22 remains populated through the useful movement and has only short final clearance, not the former 1–4s waste. |
| Opt-in endless background loop with matching nonblank seam | Proven | Canonical-source v23 first/final decoded frames are populated and `SSIM 0.999555`; loop mode uses closed geometry and periodic motion/wing phases. |
| Start over clears path and landing without destroying styling/art | Proven | Two-step Erase/Cancel UI, geometry-reset tests, and Iteration 6 browser proof. |
| Background can be hidden without deleting it | Proven | Iteration 14 adds a visible labeled toggle. Live browser inspection proved Hide removes only the rendered image and Show restores it; the destructive Remove action remains separate. |
| Path and landing remain readable over light or dark backgrounds | Proven | Triple black/white/blue path strokes and black/white/amber landing strokes were visually inspected over deterministic pure-white and near-black 1600×900 images with all handles and labels readable. |
| Separate artwork per flock and easy intake for candidate bundles | Proven | Every sequence stores its own `birdTemplate`; one complete identity ZIP imports all 32 frames directly and persists through reload in IndexedDB. The live proof passed all four tracks; additional identities use additional Flock tabs. |
| User-defined export filename | Proven | Sanitized name input drives MP4, WebM, ZIP, briefs, and guide references. Waterfall v24 and Vortex v25 artifacts use the entered names; generated command/docs use the same base name. |
| Background MP4 | Proven | Current Waterfall v24 and corrected Vortex v25 are H.264 `avc1`, `1600x900`, `30 fps`, with the selected ivory background baked in. |
| Transparent Chrome/Chromium WebM | Proven | Current Waterfall v24 and corrected Vortex v25 are VP9 with `alpha_mode=1`; both decode alpha across `0–255`. |
| Transparent Apple delivery and HEIC clarification | Proven | Current Waterfall v24 Apple bundle contains 502 RGBA frames, generated docs, and an executable converter that was run successfully to a true ProRes 4444 alpha MOV. HEIC remains correctly treated as still/image-sequence; Compressor/AVFoundation instructions cover HEVC-alpha MOV. |
| Agent guide for applying video over the selected background | Proven | Application AGENTS.md contains MOV→WebM source ordering, shared aspect-ratio box, `object-fit`, pointer-events, accessibility, reduced-motion, and browser validation checklist. |
| Research, tests, debug log, and visual inspection at each material step | Proven | This log records baseline through Iteration 13 plus real artifacts and contact sheets; current lint, 31 tests, TypeScript, production build, live browser rendering, ZIP import/reload, codec probes, alpha decode, landing crops, and seam measurements are recorded below. |

The announced candidate delivery has arrived and was audited. Ten identities are retained in the tool and six are quarantined non-destructively; see `SOURCE_CURATION.md`. Final creative approval remains the user's decision after normal-speed review.

## Current verification

- `pnpm lint`: pass.
- `pnpm test`: pass, 31 tests across timing, constant-speed landing, action-track transitions, exact counts and roles, grounded quick starts, leader staging, directional pullout, hero/support depth hierarchy, formation spacing, lead-in, closed-loop state, chronological wing phase, all ten curated frame/action bundles, bank clamping, export naming/guides, full-track manifests, ProRes command generation, per-flock artwork, orientation, and geometry reset preservation.
- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass; extracted read-only audit archives are intentionally excluded from application lint.
- Live browser reload renders the mixed four-role canonical set plus ten curated per-flock identities. Close timestamp captures show independent authored pose changes, immediate frame-zero occupancy, upright direction, and calm negative space. Browser warning/error log is empty.
- Download route: HTTP 200, `text/markdown`, attachment filename `murmur-bird-artwork-agent-prompt.md`; the contract specifies one directly importable ZIP per identity with 8 flight + 8 approach + 8 perch + 8 launch transparent PNGs, `1600 px` preferred frames, fixed track-local canvases/shared normalized anchor/direction, and 6/8/10 fps QA.
- `pnpm build`: pass; Next.js 16.3.0 production bundle compiled and statically prerendered `/`, `/_not-found`, and `/api/bird-artwork-agent-prompt`.
