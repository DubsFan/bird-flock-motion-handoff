# Sparse Blue Line-Art Flock: Delivery Notes

## Accepted Visual Route

The final flock is a controlled 2D line-art animation, not an AI-redrawn bird video and not a rigid-pixel transform. Every bird is built from open blue Bezier curves. The wings are redrawn continuously around a stable body center so the shoulder, elbow arc, and wing tip move together. This avoids the earlier left-edge door-hinge effect.

The visual system deliberately excludes the defects found in the rejected clip: there are no white outlines, filled bodies, feather textures, feet, detailed beaks, realistic anatomy, or changing cartoon-bird identities. The flock starts transparent, enters from left, crosses the frame, exits right, and leaves the final portion empty for a clean loop reset.

## Browser Playback Review

The attached contact sheet was captured from the actual VP9-alpha WebM rendered in Chromium over a white page. It confirms the intended source-like blue-on-white viewing context and shows: blank start; partial left entry; central flock crossing; right exit; blank end.

| File | Purpose | Format |
| --- | --- | --- |
| `birds-sparse-natural-flight-transparent.webm` | Website delivery | VP9 alpha, 1672 × 940, 24 fps |
| `birds-sparse-natural-flight-prores4444.mov` | Editor/master | ProRes 4444 alpha, 1672 × 941, 24 fps |
| `birds-sparse-natural-flight-review.mp4` | Dark-background review only | H.264, no alpha |
| `playback-contact-sheet.png` | Chromium WebM-over-white evidence | PNG |

## Website Embed

```html
<video autoplay muted loop playsinline aria-hidden="true" style="display:block;width:100%;height:auto">
  <source src="/birds-sparse-natural-flight-transparent.webm" type="video/webm" />
</video>
```
