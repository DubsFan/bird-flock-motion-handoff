# Visual Playback Inspection: Articulated Flight Review

**Verdict: reject.** The alpha and codec checks passed, but the browser-playback review exposes major visual failures that make the clip unusable.

| Defect | Browser-playback evidence | Why it fails |
| --- | --- | --- |
| Style drift | The birds are rendered as dense, outlined cartoon birds with white interiors, extra contour strokes, feet, beaks, and feather details. | The source is sparse blue hand-drawn line art with open, minimal silhouettes. This is a different illustration system. |
| Invented flock | The clip introduces many new bird shapes, changes the count, changes scale hierarchy, and changes the original composition. | It does not preserve the supplied flock. |
| Not source-matched | The three larger source birds are replaced by heavily detailed, white-outlined designs rather than the original blue arc/V line gestures. | The requested look is lost even before evaluating movement. |
| Entry/exit readability | The browser screenshots show ghosted/low-opacity flock remnants during the intended empty portions, particularly near the exit. | The loop does not read cleanly as `empty → flock enters → flock exits → empty` in actual playback. |
| Motion reliability | The redraw generation changes bird forms between frames, so the flock does not retain stable line identity. | Even if individual wings move more naturally, the changing designs make it look like AI morphing rather than a controlled animation. |

## What Went Wrong in Production

I replaced the flawed rigid-pixel-wing renderer with an AI redraw video segment before establishing an approved **single-bird style sheet** and before visually reviewing the generated flight segment. That was the wrong order. The model invented a more elaborate bird design, and I incorrectly focused on alpha packaging rather than rejecting the style drift at the render stage.

## Correct Route for the Next Pass

The next pass should not animate the full flock directly. It should first create and approve a **three-pose source-matched line-art sheet** for one bird: upstroke, midstroke, and downstroke. The sheet must use only thin blue open curves, no fill, no white stroke, no feet, no feathers, no realistic anatomy, and no added contours. After that approval, all birds should be assembled as consistent instances of those poses and moved across the frame with clean empty handles at both ends. Each output must be rendered in Chromium playback and visually reviewed before delivery.
