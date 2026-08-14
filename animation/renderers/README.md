# Exact-Pixel Bird Wing-Flap Animation

## Asset Guarantee

The bird-only source PNG contains only pixels copied directly from the supplied illustration. It has **0 RGB mismatches** against the original for all 4,370 visible pixels. The cleanup changes alpha only, removing non-bird construction strokes. The wing animation uses nearest-neighbor rotation of these original pixels around each bird’s lower wing joint. No generative model, restyling, recoloring, redrawing, or realism pass was used.

## Deliverables

| File | Use | Alpha |
| --- | --- | --- |
| `birds-only-wing-flap-transparent-prores4444.mov` | Editor/master file | Yes, ProRes 4444 |
| `birds-only-wing-flap-transparent.webm` | Website file for supporting browsers | Yes, VP9 |
| `birds_only_original_pixels_v2.png` | Clean transparent bird-only still | Yes, RGBA PNG |
| `birds-only-wing-flap-review.mp4` | Visible review copy on dark gray | No |

## Motion

The loop is 8 seconds at 24 fps. Every bird uses its original blue line-art pixels. Its left and right wing segments rotate in opposite directions around the existing lower wing joint to create a gentle flap. The motion is cyclic and returns to its base pose at the loop boundary.

## Website Embed

```html
<video autoplay muted loop playsinline aria-hidden="true">
  <source src="/birds-only-wing-flap-transparent.webm" type="video/webm" />
</video>
```
