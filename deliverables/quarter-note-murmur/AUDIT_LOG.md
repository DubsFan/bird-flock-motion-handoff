# Quarter Note — Gentle Orbit audit

Date: 2026-08-18
Application: Murmur at `http://localhost:3001/`
Scene: `Codex Image Aug 17, 2026, 11_12_42 PM.png`, Desktop 1600 × 900

## Rejected first pass

The original 32-frame Beat Bop bundle used nonuniform scale and shear for squash/stretch poses. Although its alpha and packaging checks passed, visual review showed that the quarter note changed proportions between frames. That result is rejected and superseded by Gentle Orbit.

## Current source and motion

- Exact supplied identity SHA-256: `b156a1d8ce6178ac95ea5bef0d7723c77eda69e80cbc0b1d61b6e585e2cb088b`.
- 64 RGBA frames: 16 flight, 16 approach, 16 perch, and 16 launch.
- 1600 × 1200 canvas with shared route anchor `(800, 900)`.
- One visible ink color: `#0D8EEB`.
- Rigid transforms only: rotation plus translation at constant scale.
- No squash, stretch, shear, tracing, redraw, or AI regeneration between frames.
- Alpha-area drift across all rigidly transformed frames: 0.016%.
- Minimum transparent border: 178px.

## Visual review

- Chronological flight and full-action contact sheets were inspected at native output scale. The notehead/stem relationship stays constant through every stage.
- Flight uses a restrained ±5° orbit with sub-20px offsets instead of the rejected shape deformation.
- Approach returns to the exact landing anchor, perch uses only micro-motion, and launch returns to the exact neutral flight silhouette.
- The directly importable ZIP was loaded through Murmur's real artwork control. Murmur reported: `Passed: 16 flight poses plus 48 matched landing-action poses. Murmur will switch tracks automatically.`
- Normal-speed playback was inspected over the retained pool scene with one moving/landing participant. The note remained one coherent glyph while traveling; two separated playback screenshots showed the same proportions at different route positions.
- Browser warnings/errors during import and playback: none.

## Machine verification

- Builder and independent verifier: passed.
- Every frame has full transparent and visible alpha, zero RGB under transparent pixels, one visible ink color, correct canvas dimensions, and at least 80px transparent padding.
- Each track contains 16 chronologically numbered, content-distinct frames.
- QA reviews: `qa/quarter-note-01-flight-{12,16,20}fps.mp4` and `qa/quarter-note-01-action-motion-review.mp4`.
- Machine-readable evidence: `qa/validation-report.json` and `qa/build-summary.json`.

## Intentional deviations from the bird prompt

- This is a quarter-note identity, not a bird; bird anatomy and wing-stage semantics do not apply.
- The ink color is `#0D8EEB` rather than the recommended `#043A78` so the note remains legible over the selected dark scene.
- The bundle uses 16 frames per track instead of eight. Murmur already supports 2–16 frames per track, so no intake-contract expansion was required.
