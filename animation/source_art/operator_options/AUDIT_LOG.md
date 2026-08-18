# Operator artwork production audit

This log records source acceptance, rejected generations, runtime validation,
and live Murmur proof. A generated sheet is not a completed option until its
runtime bundle and normal-speed playback pass.

## Locked gates

- Runtime frames are 1600 x 1200 RGBA with alpha min 0, max 255, and at least
  64 transparent pixels around the visible artwork.
- Every alpha-visible pixel uses exactly one RGB ink color: `#043A78`.
- Alpha-zero pixels use RGB `0,0,0`; no white fill, black matte, checkerboard,
  baked glow, scenery, branch, wire, text, or shadow.
- Body identity, scale, direction, and anchor remain stable; the last flight
  frame must return naturally to the first.
- Flight, approach, dwell, and launch are inspected as enlarged sheets and in
  Murmur at normal speed. Manifests and unit tests alone are insufficient.

## 2026-08-16

### Engine prerequisite

- Fixed track layout so a 16-frame flight track no longer forces an invalid
  16-frame index into an eight-frame approach, perch, or launch track.
- Added a regression test for 16-flight/8-action and four-variant curated sets.

### Swallow - accepted runtime v1

- Source: operator-supplied `swallow.png` plus generated 16-flight, 8-approach,
  8-perch, and 8-launch pose sheets.
- Generation transparency request failed: the flight sheet contained a baked
  checkerboard. The sheet was not treated as transparent; blue-ink extraction
  rebuilt real alpha.
- First runtime build failed because `perch/01_take_weight.png` touched the top
  edge. Perch scaling was reduced and the entire bundle rebuilt.
- Final result: 40 frames; all true RGBA; one visible color `#043A78`; no white
  fill; all edges clear; minimum transparent border 65 px.
- Visual sheet: `swallow/runtime-contact-sheet.jpg`.
- Live proof: selected as operator option 3, source direction right, normal-speed
  flock playback on the dark scene, no artwork-load or console errors.

### Flight-source review for remaining animals

- Crow v1: accepted as action-generation reference. Adult crow mass, beak,
  primary separation, and tail identity remain coherent across 16 poses.
- Pigeon v1: accepted as action-generation reference. Compact head, deep chest,
  rounded wing, and short tail remain distinct across 16 poses.
- Butterfly v1: accepted as action-generation reference. Four-wing identity,
  venation, spots, body, and antennae remain legible across 16 poses.
- Hummingbird keyframes v1: accepted only as the first half of a 32-pose source
  process. Requires generated in-betweens and hover/action review before runtime.
- Bat flight v1: rejected. Identity is attractive, but wing deformation is too
  repetitive and one wing is excessively foreshortened for a convincing full
  cycle. Retained as `bat/flight-sheet-rejected-v1.png` for audit evidence; it
  must not be packaged or registered.

### Bat and hummingbird flight iteration

- Bat flight v2: accepted as the action-generation reference. Both membranes
  remain visible, the compact upstroke differs materially from the broad loaded
  downstroke, finger/membrane anatomy stays bat-specific, and the body identity
  remains coherent. The rejected v1 remains excluded.
- Hummingbird in-betweens v1: accepted for interleaving with the 16 keyframes.
  The runtime flight cycle will contain 32 frames in `keyframe, midpoint` order;
  this does not count as complete until the combined normal-speed hover/flight
  playback is visually inspected.

### Updated identity masters

- Received six higher-resolution alpha PNGs and retained them under
  `masters/updated-fullsize-alpha/` as identity references.
- They are not runtime frames: each contains 63,953 to 85,325 visible RGB
  colors, alpha peaks at 254, and visible glow or ink reaches at least one
  canvas edge. Direct use would violate the locked one-color and clear-border
  gates.

### Six-animal runtime rebuild

- Replaced largest-component extraction with component ownership by authored
  grid cell after enlarged sheets exposed both detached details and neighboring
  fragments. Rebuilt, revalidated, and re-inspected all six bundles.
- Swallow: 40 frames, minimum clear border 75 px.
- Crow: 40 frames, minimum clear border 82 px.
- Pigeon: 40 frames, minimum clear border 65 px.
- Butterfly: 40 frames, minimum clear border 71 px.
- Bat: 40 frames, minimum clear border 66 px; approach rotates into an inverted
  roost and launch drops before membranes open.
- Hummingbird: 56 frames total: 32 interleaved flight frames plus 8 approach,
  8 looping hover-dwell, and 8 launch frames; minimum clear border 105 px.
- Every listed frame is 1600 x 1200 RGBA, alpha extrema 0/255, edge alpha zero,
  exact visible RGB `#043A78`, alpha-zero RGB `0,0,0`, and contains no white
  fill, matte, checkerboard, scenery, or baked glow.

### Eight-option live and export proof

- Murmur presents exactly eight operator cards and reload persistence restored
  the selected hummingbird by stable packaged ID.
- All eight options loaded and rendered at normal speed with no warning/error
  browser logs or artwork-load error state.
- Shared operator tint was proven live by switching the crow from `#7c2d12`
  burgundy to `#0f766e` teal; the same teal then rendered through every option,
  including the previously exempt clean-alpha gull.
- Bat normal-speed samples at 4.4 s, 7.0 s, and 9.6 s showed flight, inverted
  roost/dwell, and departure. Hummingbird samples across the same intervals
  showed changing wing poses during its hover dwell rather than a frozen perch.
- Actual selected-hummingbird exports:
  - `/Users/liltroy/Downloads/final-eight-option-proof-desktop.mp4`: H.264,
    1600 x 900, 30 fps, 11.6 s, 348 frames, 1,956,788 bytes, SHA-256
    `d15f5d8c742bc4c1b64bec79211d97449f9a955e036d684ddfa30f581a70505a`.
  - `/Users/liltroy/Downloads/final-eight-option-proof-desktop-alpha.webm`:
    VP9, 1600 x 900, 30 fps, 11.6 s, `alpha_mode=1`, 9,038,278 bytes,
    SHA-256
    `e76d1229f9d56a23e6fc9761e54f432874c82dec1872dce44a4b18776ce45d45`.
- Decoded WebM first/middle/last frames retained transparency. First-frame
  alpha was 0..245, middle 0..255, last 0..57; transparent corners stayed
  `[0,0,0,0]`, so neither endpoint flashed opaque. The decoded MP4 middle frame
  was fully opaque over the selected fallback background as required.
- Final automated gates: 41 tests, TypeScript, ESLint, production build, and
  `git diff --check` all passed.
