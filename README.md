# Bird Flock Motion Handoff

This private repository is the reproducible source snapshot for the hand-drawn bird flock animation work and the Bird Motion Mapper web tool. It intentionally tracks **code, prompts, source contours, review evidence, and QA scripts**, while the large delivered video binaries remain in the local handoff package.

## Local Full Package

The complete package, including alpha WebM/MOV masters and review MP4s, is located on the project owner’s Mac at:

```text
/Volumes/Sam4T/External Project/Flock Murmuration Design/Bird_Flock_Project_Handoff_2026-08-13
```

Start with that package’s `00_START_HERE.md` for the full continuation guide.

## Repository Map

| Path | Content |
| --- | --- |
| `animation/source_art/` | Original user artwork and the approved normalized C/A/B/D source contours. |
| `animation/renderers/` | Python renderers, shared wing rig, FFmpeg packaging scripts, Chromium capture scripts, visual review records, and historical production notes. |
| `animation/qa/` | Browser playback and close-interval wing-motion evidence for the two held video directions. |
| `mapper/` | Bird Motion Mapper React source, bookmarklet overlay, package lockfile, and passing end-to-end test. |
| `context/` | Next-agent rules, asset status, full mapper prompt/copy, variation slate, and PPM live-page test context. |
| `generated_assets/` | Mapper logo and generated visual assets. |

## Held Creative Directions

| Treatment | Status | Source renderer |
| --- | --- | --- |
| Symmetric Murmuration | Held calm baseline | `animation/renderers/render_symmetric_murmuration.py` |
| Dive-Curl Murmuration | Held high-motion option | `animation/renderers/render_dive_curl_murmuration.py` |

Do not use the `murmuration_flash_*`, `murmuration_split_*`, or earlier static `murmuration_ribbon_*` assets as deliverables. The current creative rule is simple: **every visible bird must flap, and the flock must travel as one coordinated group.**

## Bird Motion Mapper

```bash
cd mapper
pnpm install
pnpm check
pnpm dev
node test-mapper-workflow.mjs
```

The test verifies the mapper workflow on the PPM briefing page: anchor capture, route drawing, preview, JSON export, live overlay injection, and Escape-to-close behavior.

## Animation Requirements

The target renderer runs on Python 3 with Pillow, NumPy, FFmpeg, Node.js, and Chromium available. The hand-drawn source art is locked. Use only C/A/B/D contours and the center-notch wing rig from `flock_rig.py`. For a new site-specific video, use the Bird Motion Mapper JSON plus visual map to route the flock around cards, headings, and CTAs.

After every render, produce a transparent VP9 WebM, a ProRes 4444 alpha MOV, an MP4 review copy, a Chromium contact sheet, and close-interval wing proof.
