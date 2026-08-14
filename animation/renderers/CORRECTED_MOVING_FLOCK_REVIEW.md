# Corrected Moving-Flock Browser Review

## Status

The previous static, target-slot murmuration outputs are rejected and superseded. The corrected videos return to the accepted renderer architecture: every source-contour bird samples a delayed version of a shared, continuous right-to-left route; flock behavior is applied only as a moving offset around that route.

## Browser playback verification

All three corrected transparent WebM files were played in Chromium and inspected through fresh chronological contact sheets after the final denser 28-bird render.

| Video | Verified playback behavior | Status |
| --- | --- | --- |
| `corrected_spiral_crest_transparent.webm` | The flock enters from the right, rises into a clustered curl around its live route, then travels completely out left. The foreground source contours show clearly different upstroke/downstroke poses across time. | Pass. |
| `corrected_split_rejoin_transparent.webm` | The moving group opens into high and low traveling streams at mid-flight, reunites while still crossing leftward, and exits together. The added distant birds create a continuous flock field between foreground contours. | Pass. |
| `corrected_murmuration_ribbon_transparent.webm` | The flock remains in continuous leftward flight while the membership stretches along a curved ribbon body, then compresses for exit. Wings visibly change pose throughout the travel. | Pass. |

## Invariants checked

| Requirement | Result |
| --- | --- |
| Continuous travel | Pass. The flock's center advances right-to-left in all chronological browser frames. |
| Wing flapping | Pass. Foreground birds have independent 0.32–0.42 Hz notch-rig flap cycles; close-interval Chromium captures show distinct wing poses. |
| Source artwork constraint | Pass. Rendering uses only extracted normalized C/A/B/D contours. |
| Flight direction | Pass. All bird source contours remain leftward-facing. |
| Group behavior | Pass. The 28 birds retain delayed motion around the same route, rather than becoming separate cross-screen events. |
| Alpha loop edges | Pass. Entry and exit are blank alpha. |
| Style | Pass. Monochromatic dark-blue hand-drawn line work is retained. |

## Rejection retained

Do not use `murmuration_flash_*`, `murmuration_split_*`, or the prior static `murmuration_ribbon_*` deliverables. They remain in the working directory only as failed experiments and are not approved assets.
