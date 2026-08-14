# Murmuration Browser Playback Review

## Reference-driven final render pass

All three transparent VP9 WebM outputs were decoded in Chromium over white and reviewed through chronological contact sheets captured at ten timestamps each. The review route was used specifically to validate browser transparency and visual flock behavior rather than relying on the render pipeline alone.

| Video | Distinct murmuration behavior visible in playback | Decision |
| --- | --- | --- |
| `murmuration_flash_transparent.webm` | A compact cloud enters, widens into a reference-style flash expansion / tall funnel, then dilutes and leaves. The flock retains a filled core rather than the rejected hollow ring. | Retain. |
| `murmuration_split_transparent.webm` | A compact mass separates into two coherent upper and lower lobes, maintains a center gap, then closes before exit. This is a true split/merge structure, not an orbiting circle. | Retain. |
| `murmuration_ribbon_transparent.webm` | The flock extends into a long, thick S-shaped stream, with visible curvature along its body, then folds back into a compact group. | Retain. |

## Shared checks passed

| Requirement | Result |
| --- | --- |
| Source contour language | Pass. Only normalized C/A/B/D extracted contours are rendered. |
| Monochrome line-art appearance | Pass. The original dark marine-blue contour language is retained. |
| Direction | Pass. Every bird remains leftward-facing. |
| Wing behavior | Pass. Center-notch wing poses vary by bird, with an orientation-wave phase offset across the flock. |
| Alpha | Pass. Chromium decodes all VP9 WebM files with alpha metadata (`alpha_mode=1`). |
| Loop edges | Pass. Each timeline opens and closes on blank alpha. |
| Duration | Pass. Each master is 10 seconds at 24 fps. |

## Implementation note

The reference translation preserves the user-locked sparse illustration style. It uses local neighbor alignment, cohesion, separation, a constrained deformable envelope, and a phase wave, but deliberately caps density at a readable level so the source line-art contours do not collapse into illegible visual noise.
