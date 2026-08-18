# Silver Vortex Smoke QA report

## Delivery

- Import ZIP: `delivery/silver-vortex-smoke-v1.zip`
- Unzipped source: `delivery/silver-vortex-smoke-v1/`
- Identity: `Silver Vortex Smoke`
- Frames: 60 total; 15 each for flight, gather/approach, compressed hold, and release/launch
- Canvas: 2048 × 1280 RGBA
- Fixed anchor: 1024, 640
- ZIP SHA-256: `54fea92119ac2c1e9d486ff692b9baa8ae54641599d41b81b84805b157d2279d`

## Art development

- Two initial transparent baselines established the material and curl directions.
- Eleven normalized production key poses cover neutral flow, opposing wind shear, opposing twirls, spread, partial gather, full compression, compressed micro-twirl, partial release, and late dissipation.
- Surplus candidates and explicit rejects remain under `keyposes/review/` and `keyposes/rejected/`; they are not mixed into the delivery unknowingly.
- Reference-edit passes that baked checkerboards or lost alpha were rejected.
- Final in-between frames use premultiplied-alpha offline rendering. Murmur receives completed chronological PNGs and performs no procedural smoke rigging.

## Automated frame results

- `qa/final-frame-validation.json` contains one record for every final PNG.
- 60/60 frames pass.
- All frames decode as 2048 × 1280 RGBA.
- Every frame contains fully transparent and partially transparent pixels.
- Every outer border is fully transparent.
- Minimum measured visible-art padding is 240 px at alpha ≥ 8.
- Maximum measured colored-soft-edge contamination is 0.2166%, below the 0.5% rejection threshold.
- All files in the unzipped delivery reproduce `MANIFEST.sha256`.
- ZIP structural test reports no compressed-data errors.

## Manifest and transition results

- Murmur's production manifest parser accepts four 15-frame tracks.
- Flight frame 15 is byte-identical to flight frame 1 for the loop seam.
- Approach frame 15 is byte-identical to perch frame 1.
- Perch frame 15 is byte-identical to launch frame 1.
- Launch frame 15 is byte-identical to flight frame 1.
- The current automated suite passes 59/59 tests, including the smoke manifest and seam test.

## Visual and runtime results

- Chronological sheets: `qa/*-contact-sheet-dark.png`.
- Background checks: `qa/normalized-v2-background-contact-sheet.png`.
- Normal-speed previews: `qa/previews/flight-8fps-dark.mp4`, `approach-8fps-dark.mp4`, `perch-8fps-dark.mp4`, `launch-8fps-dark.mp4`, and `full-action-8fps-dark.mp4`.
- Live Murmur import reports: `Passed: 15 flight poses plus 45 matched landing-action poses. Murmur will switch tracks automatically.`
- Live route review with one smoke entity showed broad flow in flight, a compact gathered landing hold, and a wide release form departing the target.
- The selected name and all four action tracks persisted after a full reload.
- Browser warnings/errors during import, playback, and reload: none.

## Repository gates

- Vitest: pass, 59 tests.
- ESLint: pass.
- TypeScript `--noEmit`: pass.
- Next.js 16.3.0 production build: pass.
