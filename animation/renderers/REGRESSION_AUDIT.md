# Regression Audit: Failed Murmuration Pass

## Browser comparison

| Baseline | What browser playback shows | Keep or remove |
| --- | --- | --- |
| `swarming_dynamic_flock_transparent.webm` | Clear right-edge entry, continuous leftward screen crossing, visible individual contour poses changing over time, group spacing opening and closing. | Keep as the motion rig baseline. |
| `murmuration_flash_transparent.webm` | Shape slots appear at discrete screen locations. The mass lacks a continuous travel read and the wing pose changes are too weak to register in playback. | Discard as a final-delivery direction. |

## Root cause

The failed engine directly relaxed birds toward static envelope targets every frame. That erased the accepted delayed-route motion, so the eye read a stationary diagram moving between formation snapshots rather than birds flying through the frame. Its phase wave adjusted wing state numerically but did not preserve the stronger, visible flapping cadence and contour motion already proven in the accepted rig.

## Non-negotiable correction rules

1. Every bird must travel from outside the right frame edge to outside the left frame edge on a delayed sample of a shared, moving route.
2. Every bird must retain the accepted center-notch wing rig and a 0.30–0.42 Hz independent flap cycle. Wings may not be pose-cached or flattened for the corrected videos.
3. Murmuration behavior may only be applied as a time-varying **offset field** around the moving route: compression, split/rejoin, ribbon curvature, and density wave.
4. At least three chronological browser frames per video must visibly show different wing positions for foreground birds, with the whole flock materially farther left at each sample.
5. A contact sheet is evidence only. Delivery is blocked until the motion itself has passed this review.
