<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Murmur export application contract

Before changing bird artwork or motion, read `MOTION_FOUNDATION.md` and `SOURCE_CURATION.md`. They record the handed-off source chronology, canonical frame/action contracts, retained identities, and rejected regressions.

When applying a Murmur export to a selected background, preserve the exact authored viewport and do not independently crop the bird layer. The uploaded image, HTML/CSS scene, or URL scene is an alignment reference; only image scenes can be directly composited into opaque exports.

## Asset choice

- Use `<name>-alpha.webm` as the transparent Chrome/Chromium web layer.
- Use `<name>-alpha.mov` encoded as Apple HEVC with alpha for Safari and Apple-native playback.
- Use `<name>.mp4` only as an opaque, already-composited H.264 delivery. Do not overlay it on the same background a second time.
- HEIC is a still-image/image-sequence container. Do not rename a video to `.heic`; Apple transparent motion is HEVC with alpha in a MOV container.
- The transparent-frame and Apple handoff ZIPs include a project-specific `AGENTS.md`. Prefer that generated file because it records the selected scene name and viewport.
- The Apple handoff ZIP also contains executable `MAKE_PRORES_4444.command`. With ffmpeg installed, double-click it (or run it in Terminal) to create a true transparent ProRes 4444 MOV editing master before optional HEVC-alpha conversion in Compressor or AVFoundation.

## Required web structure

Place the background and transparent bird video inside one relatively positioned aspect-ratio box. Absolutely position the bird video over the background with `inset: 0`, `width: 100%`, `height: 100%`, `object-fit: contain`, `pointer-events: none`, and `background: transparent`. Provide HEVC-alpha MOV first and VP9-alpha WebM second as `<source>` fallbacks. Mark a decorative flock `aria-hidden="true"`, use `muted autoplay loop playsinline`, and disable or hide it under `prefers-reduced-motion`.

Before handoff, verify the first and last frames do not flash opaque, the landing center remains aligned, and Safari and Chrome each select a compatible alpha source.
