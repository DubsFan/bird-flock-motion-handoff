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

## Iteration 15: repeatable landings, visible source choices, and one complete theme-aware handoff

- Reproduced the missing capability in the live app and data model: a sequence stored one singular `landing`, so placing another landing replaced the first. The current project had one stop with 1 perch + 2 gather birds, and its dark scene plus dark-blue bird palette made the action look absent even when the timing code ran.
- Replaced the singular runtime contract with an ordered `landings` collection while retaining legacy-project migration. Add landing now appends a numbered event, any event can be moved or resized, and the inspector exposes Add, Remove last, and Clear all controls. Zero events fly through; one or more events become real ordered path waypoints.
- Rebuilt the clock around multiple approach -> dwell -> launch cycles. Every stop uses its own action window and participant counts, all route travel remains distance-based and constant-speed, and gathering birds now visibly settle upright during their dwell instead of continuing to look like fly-through birds.
- Added separate light-theme and dark-theme bird colors plus an immediate stage-preview toggle. Both colors persist per flock and are written into the motion brief and generated integration contract.
- Replaced the text-only identity choice with a visible artwork library for all curated identities and four role presets. The selected identity also shows its authored Flight, Approach, Perch, and Launch tracks before export.
- Made `Complete browser + theme handoff (.zip)` the single recommended export. The ZIP contains 348 light RGBA frames, 348 dark RGBA frames, both browser-produced VP9-alpha WebMs, the motion brief, a generated `AGENTS.md`, README, executable all-browser converter, and drop-in React/CSS integration files. Individual exports remain available but are explicitly secondary.
- The generated agent contract requires dual theme assets, HEVC-alpha MOV first and VP9-alpha WebM second, one shared aspect-ratio box, `object-fit: contain`, transparent overlay positioning, `pointer-events: none`, `aria-hidden`, reduced-motion handling, and validation in both Safari and Chrome. It honestly identifies Compressor/AVFoundation as the final HEVC-alpha path rather than relabeling a non-HEVC file.

### Visual and export proof

- In-app browser editing proof: added a second landing by dragging a new box on the stage; both numbered landing guides remained visible and `Landing events · 2` appeared in the inspector. Normal-speed captures at 2.4s, 4.2s, 5.9s, and 7.7s showed the flock traverse both stops, settle/release at each, and continue without a teleport or catch-up jump.
- The dark-theme palette toggle changed the previously near-invisible birds to the configured light ink while retaining the dark scene and exact route alignment. A full reload preserved two landing events, the dark palette selection, and the recommended bundle control. Browser diagnostics contain no warning or error entries.
- Decoded visual sheets: `/Users/liltroy/Downloads/murmur-multi-landing-dark-full-playback-sheet.png`, `/Users/liltroy/Downloads/murmur-multi-landing-action-sheet.png`, `/Users/liltroy/Downloads/murmur-multi-landing-one-close-sheet.png`, and `/Users/liltroy/Downloads/murmur-multi-landing-two-close-sheet.png`. The sheets show authored approach/perch/launch poses, held participants at both stop regions, and eventual clearance.
- Complete handoff proof: `/Users/liltroy/Downloads/murmur-multi-landing-theme-proof-complete-cross-browser-handoff.zip` (`45,342,672` bytes). Extraction produced exactly 348 light + 348 dark PNG frames. Sample frame 120 decoded as RGBA `1600x900` with transparent and visible pixels. Both included WebMs probe as VP9 `1600x900`, `30 fps`, `11.6s`, and `alpha_mode=1`.
- Ran the ZIP's `MAKE_ALL_BROWSER_ASSETS.command` successfully. It produced light and dark ProRes 4444 MOV masters at `1600x900`, `30 fps`, `11.6s`, `yuva444p12le`; the generated handoff then gives the explicit Apple HEVC-alpha conversion step.

### Final verification

- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass.
- `pnpm test`: pass, 33 tests. Added coverage locks multiple ordered landing waypoints/action cycles and the complete dual-theme agent handoff contract.
- `pnpm build`: pass with Next.js 16.3.0; `/`, `/_not-found`, and `/api/bird-artwork-agent-prompt` statically prerendered.
- `git diff --check`: pass.

## Iteration 16: progressive nontechnical workflow and artwork drill-down

- Measured the compact live interface before editing: `5014 px` document height, `73` visible buttons, a duplicated artwork dropdown plus 11-card gallery, four always-visible action-stage thumbnails, and all specialist exports exposed in the primary scroll.
- Reorganized the working order as five plain-language steps: Scene and artwork, Choose the motion, Landings and timing, optional Colors and notes, and Export. The canvas Path/Add landing/Edit tools remain continuously available and the underlying project, motion, landing, artwork, and export contracts are unchanged.
- Replaced the duplicated artwork selector with one selected-artwork summary. The visual library/import control, Flight/Approach/Perch/Launch inspection row, and source setup remain available through separate one-click inline disclosures. The motion-stage disclosure explicitly identifies itself as a quality-control view rather than a required editing step.
- Kept the four grounded motion presets and essential count/size/speed controls visible. Cadence, density, spacing, depth, entry/exit, and reseeding moved under Fine-tune motion. Theme palettes/notes and individual specialist exports moved under labeled disclosures; the complete browser/theme handoff remains the single immediately visible recommended export.
- The compact default state now measures `2657 px` document height and `22` visible buttons: a `47%` height reduction and `70%` reduction in simultaneously exposed buttons. All seven disclosures default closed, with no modal, new page, or destructive state transition.
- Browser behavior simulation passed Path -> Add landing -> Edit instructions, artwork-stage open/close, alternate curated artwork selection plus restoration, Fine-tune controls, Colors and notes, advanced exports, recommended-export enablement, and normal-speed Play -> Pause. The compact and desktop layouts had no horizontal overflow or framework overlay; browser warning/error logs remained empty.
- React review: one shared stateless disclosure component, native keyboard-focusable `details/summary`, no new effects, no duplicate derived state, and no change to the established client boundary or dynamic import paths.

### Verification

- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass.
- `pnpm test`: pass, 33 tests.
- `pnpm build`: pass with Next.js 16.3.0; `/`, `/_not-found`, and `/api/bird-artwork-agent-prompt` statically prerendered.
- `git diff --check`: pass.
- Final live reload at `http://localhost:3000/`: title and selected artwork restored, all disclosures closed, meaningful content rendered, no console warning/error, and no Next.js error overlay.

## Iteration 17: obvious URL intake, true screen variations, and readable cockpit

- Promoted Background URL from a hidden secondary choice to the first visible action in Step 1. The field accepts Enter or the full-width `Use URL` button, validates `http://`/`https://`, identifies the current source, and keeps Remove background distinct.
- Reproduced the misleading responsive preview with the supplied Portfolio Readiness URL. The project said `1600 × 900`, but the cross-origin iframe was laid out at the editor stage's roughly 680px width, so the reference site selected the wrong navigation and content breakpoint.
- URL and pasted HTML/CSS scenes now lay out at the exact active output viewport first, then scale as one complete viewport into the editor. The bird canvas, route, and landing guides retain the same authored aspect box; the background is never independently cropped.
- Added Desktop `1600 × 900`, Tablet `1024 × 768`, and Mobile `390 × 844` as visible one-click output variations. Each variation saves its own viewport, flock paths, and landing zones while sharing the chosen scene and artwork. Returning to a variation restores its prior composition.
- Added an always-visible stage badge and an Exporting variation summary. All export filenames receive the active `-desktop`, `-tablet`, or `-mobile` suffix, and motion brief JSON/Markdown records the active variation.
- Rebuilt the responsive shell as a readable cockpit. At the tested `1422 × 800` browser viewport, the stage occupied `938px` and the independently scrollable control rail occupied `420px`; the rail's smallest labels computed to `12px`. Below the laptop breakpoint the stage and cards stack full-width instead of compressing into the illegible two-column arrangement.
- Portrait and 4:3 previews are height-fitted without changing their output viewport. Live measurements: Desktop displayed `938 × 526` while its iframe remained `1600 × 900`; Tablet displayed `832 × 623` while remaining `1024 × 768`; Mobile displayed `288 × 619` while remaining `390 × 844`.
- Browser simulation loaded `https://practical-portfolio-management-brie.vercel.app/ppm-bakeoff/briefing/portfolio-readiness`, switched Desktop → Mobile → Tablet → Desktop, confirmed the selected badge and true iframe dimensions at every stop, retained the URL scene, and found no warning or error logs.

### Verification

- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass.
- `pnpm test`: pass, 35 tests. New coverage locks variation creation, independent path/landing preservation, and restoration.
- `pnpm build`: pass with Next.js 16.3.0; `/`, `/_not-found`, and `/api/bird-artwork-agent-prompt` statically prerendered.
- `git diff --check`: pass.
- Live server: `http://localhost:3000/` returned HTTP 200 after the production-build check.

## Iteration 18: canvas-native edit safety and automatic landing polish

- Reproduced the editing-control gap in the live interface. Start over and the buried Step 3 Remove last/Clear all actions existed, but the canvas had no Undo, Redo, selected path-point deletion, selected landing deletion, or keyboard history controls.
- Added a compact edit toolbar directly on the background canvas: Undo, Redo, and contextual Delete selected. Clicking a path dot or landing gives it a cyan selection ring and names the selected item in the toolbar. Escape clears selection; Delete/Backspace removes it; Command/Ctrl+Z, Shift+Command/Ctrl+Z, and Command/Ctrl+Y drive history.
- History checkpoints once per canvas draw/drag gesture instead of once per pointer-move frame. Inspector sliders coalesce rapid updates, history is capped, and Undo/Redo pause playback before restoring a project snapshot.
- Replaced ambiguous Remove last with a visible ordered Landing 1/Landing 2 list in Step 3. Every landing has its own labeled Delete action, plus Clear all landings. Removing the final stop automatically returns its participants to Fly through.
- Browser behavior proof: path dots `4 → delete → 3 → Undo → 4 → Redo → 3 → Undo → 4`. Canvas-selected Landing 1 and listed Landing 2 each deleted exactly one stop and Undo restored two. Keyboard Command+Z and Shift+Command+Z reproduced the same state transitions. The final live canvas showed Landing 1 selected, a cyan perimeter, and the contextual Delete landing button.
- Kept all landing frame decisions inside Murmur. Users do not edit frames. The engine automatically sequences the supplied approach, perch, and launch artwork for every participating bird.
- Corrected perch timing so the semantic source frames play as contact → wing fold → settle → quiet hold/micro-lift → ready launch. The fold/settle happens once, the middle dwell stays within restrained hold frames, and the final frame prepares the launch regardless of total dwell length.
- Corrected touchdown orientation. Landing participants now retain the approach direction/mirroring while their bank eases upright through the landing blend; launch eases that bank back in. The previous dwell branch could suddenly remove mirroring at contact.

### Motion and export proof

- Normal-speed browser playback at `2.4s`, `4.2s`, `5.9s`, and `7.7s`, plus seven close `0.4s` samples across the first landing, showed distinct braking/fold/settle/launch poses and continuous follower travel. Browser warning/error logs remained empty.
- Opaque proof: `/Users/liltroy/Downloads/murmur-native-landing-controls-v26-desktop.mp4`; H.264 `avc1`, `1600x900`, `30 fps`, `348` frames, `11.6s`.
- Transparent proof: `/Users/liltroy/Downloads/murmur-native-landing-controls-v26-desktop-alpha.webm`; VP9, `1600x900`, `30 fps`, `11.6s`, `alpha_mode=1`; decoded alpha spans `YMIN=0` through `YMAX=255`.
- The active dark-page bird palette is intentionally light and the URL reference cannot be composited into the opaque export. Visual motion proof therefore decodes the transparent WebM over the working blue background rather than pretending the low-contrast ivory fallback represents the selected page.
- Decoded sheets: `work/landing-v26-proof/full-playback-dark-sheet.png`, `work/landing-v26-proof/landing-one-dark-close-sheet.png`, and `work/landing-v26-proof/landing-two-dark-close-sheet.png`. The close sheets show stable landing positions, restrained hold frames, continuous source identity, consistent facing, and authored launch poses.

### Verification

- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass.
- `pnpm test`: pass, 39 tests across 4 files. New coverage locks exact point deletion, exact landing deletion/final-stop fly-through repair, and native fold/hold/ready timing.
- `pnpm build`: pass with Next.js 16.3.0; `/`, `/_not-found`, and `/api/bird-artwork-agent-prompt` statically prerendered.
- `git diff --check`: pass.

## Iteration 19: six species-specific identities, semantic anchors, and travel-aligned motion

- Rejected the six initial 512×512 reference stills as runtime assets: they were opaque RGB images with baked black backgrounds and blue glow. The later full-size alpha files were retained as anatomy/identity references, not mistaken for chronological motion sequences.
- Re-authored six distinct identities from those references. The runtime now contains 202 verified new frames: swallow 16 flight + 24 action, crow 8 + 24, pigeon 8 + 24, butterfly 8 + 24, bat 10 + 24, and hummingbird 8 + 24. Bat received two extra flight recovery poses because its eight-pose seam was not coherent enough; swallow retained its already-coherent 16-pose loop.
- Every new runtime PNG is RGBA on a 1600×1200 canvas, has real 0–255 alpha with intermediate edge values, has a fully clear edge/border, contains exactly one visible RGB color (`#043A78`), stores zero RGB beneath alpha zero, and contains no visible white fill. `runtime-validation.json` in each species source directory records every frame hash and gate result.
- Replaced whole-wing-bbox centering with semantic anchoring. Flight/hover uses a rigid head/torso landmark; upright perch/alight uses the feet; bat roost uses the overhead foot contact. Flight anchor error now measures 2.2–5.0 px across all six identities. Perch/alight/roost/hover anchor error measures 1.4–4.5 px, within the 5 px contact / 12 px body gates.
- Added `motion-validation.json` as a hard build gate. It checks flight/action counts, body/contact anchors, approach and launch handoffs, duplicate/near-duplicate neighbors, loop overlap, and whether the loop seam is at least as coherent as internal wing transitions. All six identities pass. Loop-seam IoU: swallow .7758, crow .3535, pigeon .4158, butterfly .6232, bat .5113, hummingbird .6122; in every case the seam is no worse than the identity's internal chronological motion.
- Corrected the runtime engine rather than asking the art to hide engine defects: each track uses its real frame count; cadence is capped at 24 authored pose changes per second so 30 fps playback cannot skip hard poses; integer cycles close flight segments and loops; gather uses flight/hover art rather than floating perch poses; zero-second dwell still performs approach/contact/launch; launch returns to a phase-locked flight cycle; planted perch settles once and holds instead of hopping among frames.
- Separated travel heading from curvature bank. Side-profile animals mirror from actual path travel and pitch within an upright clamp; the engine no longer treats route tangent as banking or uses an entry/exit threshold that can flip near vertical motion. Species landing behavior is explicit: `perch`, butterfly `alight`, hummingbird `hover`, and bat `inverted-roost`.
- Operator color is shared across all eight artwork choices. All eight packaged templates route through the same source-in alpha tint path, and saved selections refresh by stable artwork id after asset revisions. `evidence/animal-motion/all-8-operator-color-proof.png` shows every option rendered with operator colors `#7c2d12` and `#0f766e` on light/dark scenes.
- The operator artwork library now presents exactly eight complete identity cards and hides frame-by-frame thumbnails behind the optional motion-inspection disclosure. The expanded library is not a wall of individual frames.

### Research basis

- Pigeon landing/takeoff work supports authored braking flare, foot contact, weight transfer, and launch as distinct kinematic phases: https://journals.biologists.com/jeb/article/213/10/1651/9685/Wing-and-body-kinematics-of-takeoff-and-landing
- Perching research supports locking the foot/contact landmark rather than the changing wing silhouette: https://pmc.ncbi.nlm.nih.gov/articles/PMC6684272/
- Bat/hummingbird hover research and hummingbird figure-eight kinematics support separate hover/membrane contracts rather than applying one bird-perch animation to all species: https://pmc.ncbi.nlm.nih.gov/articles/PMC6157961/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC11583918/
- Butterfly flight research supports a four-wing clap/flutter cycle and an alight behavior rather than a bird-like grounded perch: https://pmc.ncbi.nlm.nih.gov/articles/PMC13024673/
- Steering/path-following and follow-path references support deriving anatomical facing from local route velocity while treating curvature separately: https://www.red3d.com/cwr/papers/1999/gdc99steer.html and https://docs.blender.org/manual/ru/3.0/animation/constraints/relationship/follow_path.html
- FILM was reviewed as an in-between reference but not used to ghost/cross-fade final line art. The accepted runtime plays exact authored chronological PNGs: https://github.com/google-research/frame-interpolation

### Visual and export proof

- Six normal-speed, four-stage opaque review reels: `evidence/animal-motion/{swallow,crow,pigeon,butterfly,bat,hummingbird}-motion-stages-normal-speed.mp4`; each is H.264, 1600×1200, 24 fps, 4.0s, and shows flight → approach → perch/alight/roost/hover → launch.
- Six transparent flight proofs: `evidence/animal-motion/{swallow,crow,pigeon,butterfly,bat,hummingbird}-flight-alpha.webm`; each is VP9, 1600×1200, 24 fps, 3.0s, with `alpha_mode=1`.
- Chronological full-track and enlarged flight sheets: `animation/source_art/operator_options/<species>/runtime-contact-sheet.jpg` and `runtime-flight-review-sheet.jpg` for all six species.
- Live in-app normal-speed crow pilot passed two landing stops with one selected bird: direction mirrored with travel, planted dwell remained quiet, and flight-only art resumed between stops. The library snapshot exposed exactly eight artwork cards.
- An attempted expanded all-eight live browser pass was stopped by the in-app browser URL policy because the saved project contains an external URL scene. The policy forbade further clicks and alternate-browser circumvention. This limitation is recorded rather than converting source-reel/code proof into a false all-eight live-stage claim.

### Verification

- `pnpm test -- --run`: pass, 47 tests across 4 files.
- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass.
- `pnpm build`: pass with Next.js 16.3.0; `/`, `/_not-found`, and `/api/bird-artwork-agent-prompt` statically prerendered.
- React review: no new effect/state duplication, card keys remain stable ids, controls retain native button semantics, and the artwork refresh logic is a pure shared function rather than client-component-local duplicated work.

## Iteration 20: motion-forensics correction and layered V2 flight replacement

### Correction to Iteration 19 acceptance

- The prior static validator proved alpha, color, canvas, and file integrity; it
  did **not** prove natural motion. Fresh adjacent-pose analysis found torso
  scale changes up to 2.68x, camera-plane jumps up to 89.2 degrees, false wing
  reversals, and severe flight/action seams. The six Iteration 19 stage reels
  also predated their latest source manifests and are stale. They are retained
  as failure evidence, not production acceptance.
- Runtime optical-flow interpolation was prototyped and rejected because thin
  engraved contours doubled and ghosted at wing reversals. V2 therefore keeps
  exact PNG playback and moves interpolation/deformation into an offline,
  reviewable layered authoring pipeline.

### V2 flight work completed

- Added deterministic layered-rig baking, strict fail-closed validation,
  hash-bound normal-speed proof encoding, and gated publishing tools under
  `animation/`.
- Rebuilt all six flight identities around one locked body plus independently
  deforming near/far wings. Published sampling is crow 12, pigeon 10, swallow
  7, butterfly 6, bat 6, and hummingbird 4 motion-blur shimmer poses. Fast
  species use fewer truly adjacent display poses instead of slowing biology to
  satisfy an arbitrary frame budget.
- Every V2 flight frame is 1600x1200 RGBA, one visible RGB `#043A78`, zero RGB
  under alpha zero, clear by at least 64 pixels, and protected by an ordered
  SHA-256 list plus explicit authored body landmark and body scale. All six
  `validation-v2.json` reports pass 13/13 gates.
- Every V2 MP4 and VP9-alpha WebM proof is bound to the exact current ordered
  frame hashes, not merely a newer file timestamp. Proofs are under
  `evidence/animal-motion-v2/`.
- All six validated flight tracks are published into their packaged operator
  choices. The live browser loaded the 1600x1200 V2 previews and current crow
  flight frame, rendered the crow in the operator-selected teal `#0f766e`, and
  reported no warning/error logs.

### Runtime cadence correction

- `cycleHz` now records species cadence independently of authored frame count.
  Chronological tracks declare their required sampling FPS; unsupported FPS is
  rejected by a pure validator rather than silently slowing the animal.
- Hummingbird explicitly separates 40/50/60 Hz physical motion from a readable
  2.0/2.3/2.6 Hz baked motion-blur shimmer. Loop phase remains deterministic
  and seam-closed.

### Open production blocker

- Flight replacement is wired; the six approach/perch/launch tracks are still
  the rejected Iteration 19 action artwork. They must be rebuilt from layered
  action rigs with explicit foot/alight/roost/hover contact landmarks before
  the complete eight-option motion system can be called production-ready.
- A crow action-body atlas has been authored as a reference, but it is not
  published because body-shape transitions and shoulder registration have not
  yet passed normal-speed seam/contact gates. This prevents a cosmetic
  flight-only improvement from being mislabeled as a complete crow-perching
  solution.

### Verification

- Six V2 flight validators: pass, 13/13 each with exact evidence hash provenance.
- `pnpm test -- --run`: pass, 52 tests across 4 files.
- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass with zero warnings.
- `pnpm build`: pass with Next.js 16.3.0.
- Live localhost ownership: port 3000 belongs to this repository checkout.
- Live browser: V2 crow normal-speed frame rendered in selected teal; no warning/error logs.

## Iteration 21: all six V2 approach, dwell, and launch replacements

- Rebuilt all 24 Crow action frames from the same locked V2 body and detached
  wing/leg/tail layers used by the accepted flight identity. The sequence is
  chronological: braking flare and tail fan, late foot extension, contact,
  folded quiet hold, launch preload, release, downstroke, and leg tuck.
- Corrected the draft approach-to-perch discontinuity so the final folded
  approach pose enters the first settled pose without reopening the wing. The
  final settled preload is byte-identical to launch frame 1.
- Added a fail-closed action validator and a gated publisher. Crow passes 38/38
  gates: all frames are 1600x1200 RGBA; one visible RGB `#043A78`; zero RGB
  beneath alpha zero; at least 64 px clear border; exact authored hashes;
  locked body scale; last-three approach contact residual <=0.397 px; zero
  perch contact drift; exact approach/perch and perch/launch contact seams;
  monotonic launch release; and a stable quiet body hold.
- Generated fresh hash-bound 60 fps evidence from the exact accepted ordered
  frame hashes: `evidence/animal-motion-v2/crow-action-stages-v2-60fps.mp4`
  and `evidence/animal-motion-v2/crow-action-stages-v2-60fps-alpha.webm`.
  The MP4 was reviewed at normal speed in QuickTime across the complete
  approach -> perch -> launch timeline before publishing.
- Published the accepted pixels over the stable public Crow action filenames,
  updated the action contact anchor to `(801, 750)`, and recorded public hashes
  in `public/artist-birds/natural-crow/action-v2-provenance.json`.
- Applied the same locked-body/action-rig pipeline to Pigeon and Swallow, then
  authored separate non-bird state contracts: Butterfly alight with upright
  closed wings, Bat rotation into an overhead-claw inverted roost and downward
  release, and Hummingbird stationary hover/shimmer instead of false surface
  contact. All five additional bundles pass 38/38 gates.
- Generated and reviewed fresh hash-bound 60 fps action MP4/WebM pairs for all
  six species under `evidence/animal-motion-v2/`. Crow, Pigeon, Swallow,
  Butterfly, Bat, and Hummingbird were each played through at normal speed in
  QuickTime before publishing.
- Published all 144 accepted V2 action frames over stable public filenames and
  wrote per-species `action-v2-provenance.json` files containing the exact
  public SHA-256 values. This supersedes Iteration 20's action-art blocker.
- Reloaded localhost, selected `Natural engraved crow` in the eight-option
  operator library, and confirmed the live editor reports all four Crow tracks
  ready. Full live-stage sampling of every species/route state remains a final
  acceptance task; the packaged source reels and validators are current.
- Final live registry pass selected all six revised identities in turn; each
  reported flight/approach/perch-or-hover/launch ready and browser warning/error
  logs remained empty. The saved external URL scene prevented deterministic
  programmatic scrubbing of every route state, so normal-speed action acceptance
  is based on the six current hash-bound source reels plus the successful live
  packaged-selection/load pass, not a false claim of six complete stage reels.
- Final gates: six action validators pass 38/38; all six public provenance files
  reproduce their published hashes; Python compilation passes; 52 Vitest tests
  pass; TypeScript, ESLint, `git diff --check`, and the Next.js 16.3.0 production
  build pass.

## Iteration 22: normal-speed temporal rendering and 15-pose actions

- Rejected the prior 30 fps contract after live playback proved that the fast
  animals required 68–81+ discrete samples per second while Murmur exports 30
  fps by default. Added an explicit temporal-shutter policy for Crow, Pigeon,
  Swallow, Butterfly, and Bat. The renderer now composites only neighboring
  chronological one-color alpha poses within the delivery-frame exposure;
  physical cadence is no longer slowed and intermediate motion is no longer
  silently discarded.
- Added deterministic species rhythms: three-beat Crow bursts, five-beat
  Pigeon bursts, and two-beat Swallow bursts followed by authored glide holds.
  Butterfly and Bat remain continuous. Hummingbird retains a separate physical
  40/50/60 Hz contract and readable authored shimmer.
- Replaced constant-speed contact with paired Hermite distance profiles. Birds
  now enter the approach runway at cruise velocity, decelerate to zero at
  contact, and accelerate continuously from zero through launch, without a
  position teleport or catch-up.
- The first live Crow pass showed the eight-pose action handoff still read as a
  coarse wing collapse. Rebuilt all six animals from their layered body/wing/
  appendage rigs at 15 chronological poses per approach, dwell, and launch.
  No runtime mask morph or full-frame crossfade was used. Published 270 new
  one-color true-alpha action PNGs and removed the superseded eight-frame files.
- Fresh action proofs are hash-bound to the exact accepted ordered frames at
  `evidence/animal-motion-v2/*-action-stages-v3-60fps.mp4` and
  `evidence/animal-motion-v2/*-action-stages-v3-60fps-alpha.webm`.
  Each species passes 59/59 fail-closed action gates, including RGBA/one-color,
  transparent RGB cleanup, 64 px border, explicit body/contact landmarks,
  fixed body scale, contact seams, monotonic launch release, and exact proof
  hashes.
- Live localhost Crow playback was sampled at normal speed before and after the
  rebuild. Flight now shows readable flapping with restrained shutter trails;
  approach exposes the added intermediate poses; the body identity remains
  locked through settle. Live flight-direction sampling also covered Swallow,
  Pigeon, Butterfly, Bat, and Hummingbird. The packaged layered Butterfly and
  Bat masters are right-facing side profiles, so runtime mirroring remains the
  correct travel-orientation behavior.
- Verification: 55 Vitest tests pass; TypeScript, ESLint, `git diff --check`,
  and the Next.js 16.3.0 production build pass. Browser asset loading produced
  no new missing-frame error after publishing the 15-frame manifests.
- Actual Murmur browser exports, not source-only reels, were generated for the
  two species with the highest semantic risk. Crow and Bat each completed the
  full 10.67-second/two-landing route at 1600x900 and 30 fps in both opaque
  H.264 and VP9-alpha WebM:
  `evidence/runtime-v3/crow-two-landings-30fps.mp4`,
  `evidence/runtime-v3/crow-two-landings-30fps-alpha.webm`,
  `evidence/runtime-v3/bat-two-landings-30fps.mp4`, and
  `evidence/runtime-v3/bat-two-landings-30fps-alpha.webm`.
  Both WebMs report `alpha_mode=1`; frames decoded with libvpx have alpha
  extrema Crow `(0,245)` and Bat `(0,244)`, with all four corner alpha values
  zero. Crow runtime SHA-256 values are `093b101c...1224dd2e` (MP4) and
  `1c70274c...02adda9` (WebM); Bat values are `a629ad43...b30f30c` and
  `fe2fbb1b...acaf3f87`. Runtime contact sheets are stored beside the videos.

## Iteration 23: light/dark visibility and operator-color repair

- Reproduced the reported failure in the live localhost editor. The dark bird
  palette was being drawn over the same ivory no-scene surface used by the
  light palette. Artwork loaded without console errors, but the default dark
  ink and ivory background had insufficient visual separation.
- Added independent light and dark fallback backgrounds to the persisted
  project style. The no-scene stage and opaque encoder now use the background
  belonging to the active preview theme: ivory `#f3efe6` for light and navy
  `#0b1220` for dark by default. Existing saved projects migrate to the dark
  default without losing an operator-selected light fallback.
- Clarified the toolbar as `Preview: Light` / `Preview: Dark` and exposed both
  fallback colors in Step 4. Uploaded image, HTML, and URL scenes remain exact
  alignment references and are not recolored.
- Live browser proof covered the original Calm editorial flock on both theme
  surfaces. Selecting `#043a78` in light mode and `#e2e8f0` in dark mode
  immediately recolored the exact same authored bird. All eight artwork cards
  were then selected in turn; each reached its pressed selection state and no
  artwork-load error appeared. Static registry coverage additionally asserts
  that all eight use the shared operator-color tint path.

## Iteration 24: travel-linked natural flight cadence

- Reproduced the reported frantic flight in the live 30 fps stage. The five
  fast animal templates were advancing at 4–12 full authored cycles per second
  while the route crossed the viewport slowly, and cadence did not respond to
  the operator's flight-speed control.
- Preserved biological source-rate metadata, but added explicit readable
  display cycles for the baked line-art sequences: Crow 1.6/2.0/2.5 Hz,
  Pigeon 2.0/2.6/3.2, Swallow 2.5/3.2/4.0, Butterfly 3.0/4.0/5.0, Bat
  2.5/3.3/4.2, and Hummingbird shimmer 1.8/2.1/2.4 for Soft/Medium/Strong.
- Coupled display cadence to the square root of the actual route-speed
  multiplier, bounded to 0.55–1.35x. Gentle travel now reduces wing cadence;
  faster travel increases it without returning to the prior frantic range.
  The original editorial bird and clean gull use the same coupling.
- Live normal-speed proof watched the Crow at the normal 0.90x route speed and
  again at 0.35x. Broad chronological strokes remained readable at normal
  speed and slowed with travel rather than churning in place. The operator
  project was restored to 0.90x and Calm editorial after verification.

## Iteration 25: Silver Vortex Smoke 60-frame identity

- Created a new non-bird identity from built-in image-generated transparent
  volumetric smoke art. Rejected opaque checkerboard edits, colored-fringe
  regressions, and liquid-looking dissipation candidates instead of silently
  mixing them into the delivery. Retained surplus candidates under
  `artwork/smoke-cloud/keyposes/` for provenance and later refinement.
- Locked eleven 2048x1280 RGBA key poses around one `(1024, 640)` anchor:
  neutral flow, opposing wind-shear phases, opposing twirl phases, spread,
  partial and full gather, compressed micro-twirl, partial release, and late
  dissipation. Pre-rendered four chronological 15-frame tracks with
  premultiplied-alpha in-betweens, for 60 completed PNGs total. Runtime does
  not rig or synthesize the smoke.
- Packaged the directly importable identity at
  `artwork/smoke-cloud/delivery/silver-vortex-smoke-v1.zip` with SHA-256
  `54fea92119ac2c1e9d486ff692b9baa8ae54641599d41b81b84805b157d2279d`.
  The unzipped delivery includes `manifest.json`, all four track folders,
  README, and a verified `MANIFEST.sha256`.
- The fail-closed art validator passes 60/60 final frames: identical
  2048x1280 canvases, genuine full/partial transparency, transparent outer
  borders, at least 240 px measured padding at alpha >= 8, and neutral soft
  edges. The production manifest parser accepts 15 frames per track. Flight
  loop and all three action handoffs are exact byte-identical seams.
- Live localhost import reported `Passed: 15 flight poses plus 45 matched
  landing-action poses`. Normal-speed one-entity playback showed broad flowing
  flight, compact gather/hold at the landing target, and a wide release moving
  away. The name and all four tracks survived reload; browser warnings/errors
  remained empty.
- QA artifacts are under `artwork/smoke-cloud/qa/`, including chronological
  sheets, dark/light/checkerboard checks, 8 fps track previews, the combined
  action preview, per-frame JSON results, and the manifest/seam test. Final
  repository gates: 59 Vitest tests, TypeScript, ESLint, and the Next.js 16.3.0
  production build all pass.

## Iteration 26: Quarter Note Gentle Orbit 64-frame identity

- Rejected the first 32-frame Beat Bop attempt after visual review. Its
  nonuniform scaling and shear changed the quarter-note proportions even though
  the mechanical alpha/package checks passed. Technical validation is not
  accepted as a substitute for visual playback review.
- Rebuilt the identity as 64 frames: sixteen each for flight, approach, perch,
  and launch. Every frame is now the exact same source silhouette at constant
  scale, moved only by small rotations and translations. The identity master
  remains byte-identical to the supplied reference, SHA-256
  `b156a1d8ce6178ac95ea5bef0d7723c77eda69e80cbc0b1d61b6e585e2cb088b`.
- The independent verifier passes all 64 RGBA frames: one 1600x1200 canvas,
  shared `(800, 900)` path anchor, one `#0D8EEB` visible color, transparent RGB
  zero, at least 178px clear border, and only 0.016% alpha-area drift from rigid
  resampling.
- Imported `deliverables/quarter-note-murmur/quarter-note-01-murmur.zip` through
  the real localhost control. Murmur reported `Passed: 16 flight poses plus 48
  matched landing-action poses`. Normal-speed playback over the retained pool
  scene showed one coherent glyph at separated route positions; browser
  warnings/errors were empty.
- The manifest-anchor intake fix in `components/flock/asset-panel.tsx` preserves
  declared flight/action anchors for imported artwork. Reproducible source,
  contact sheets, MP4 reviews, validation JSON, unzipped files, and the direct
  import ZIP are retained under `deliverables/quarter-note-murmur/`.
