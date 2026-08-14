# Next Agent Context

## Mission

Create transparent website-background animation using the approved hand-drawn bird contours. Motion must be elegant, coordinated, intentional around the page layout, and readable without compromising card and CTA legibility.

## Critical User Feedback to Preserve

| Failed behavior | Required correction |
| --- | --- |
| Realistic/redesigned birds | Use only C/A/B/D extracted source contours. |
| Door-hinge wing swing | Use the center-notch split-wing rig. |
| First 2–3 birds only flapping | Apply `wing(..., strength=1.0)` to every member and prove it in close browser frames. |
| Straight generic crossing | Give the flock a coherent group story such as compress, dive, curl, split, release, or pullout. |
| Static murmuration formation | Apply group shape as offsets around a continuously travelling route, never as static slots. |
| Delivery without visual inspection | Use Chromium contact sheets and iterate before delivery. |

## Locked Input Contours

| Contour | Location | Role |
| --- | --- | --- |
| C | `source_art/orientation_locked_flock_assets/C_leftward.png` | Hero contour. |
| A | `source_art/orientation_locked_flock_assets/A_leftward.png` | Medium support contour. |
| B | `source_art/orientation_locked_flock_assets/B_leftward.png` | Medium support contour. |
| D | `source_art/orientation_locked_flock_assets/D_leftward_mirrored.png` | Small support contour. |

## Rendering Contract

The main rig is `animation_workspace/birds_exact_pixels/flock_rig.py`. It renders 1672 × 941 RGBA frames at 24 fps and applies the approved center-notch wing construction. Build every scene around one continuous `route(u)` and give members delayed route samples plus controlled local offsets.

| Output | Required format |
| --- | --- |
| Website | VP9 WebM, alpha-enabled, 1672 × 940 px, 24 fps. |
| Master | ProRes 4444 MOV with alpha. |
| Review | H.264 MP4 on white. |
| Evidence | Chromium timeline sheet and close-interval wing proof. |

## Prompt for the Next Site-Specific Video

```text
Create one transparent hand-drawn bird flock background video from the approved C/A/B/D source contours. Treat the attached Bird Motion Mapper JSON and visual map as the spatial source of truth. Keep birds leftward-facing and give every visible bird natural, center-notch wing flapping.

The flock must enter on blank alpha, travel as one coordinated group, perform one visually strong movement story around the mapped cards and anchors, exit, and leave blank alpha again. Do not use realistic birds, filled silhouettes, static murmuration formations, target-shaped rings, door-hinge wings, or isolated crossings.

Deliver VP9 alpha WebM, ProRes 4444 alpha MOV, white-background review MP4, Chromium playback contact sheet, and close-interval wing proof. Iterate visually before delivery.
```
