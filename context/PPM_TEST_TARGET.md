# Bird Motion Mapper Test Target

## Tested page

**URL:** `https://practical-portfolio-management-necgu1dcq-ggs-projects-4525ede8.vercel.app/ppm-bakeoff/briefing`

The tool was tested end to end against this live PPM briefing page. The tested workflow loaded the page, added a fourth anchor, drew a second flight path, previewed 13 moving guide birds, exported JSON containing four anchors and two paths, injected the live overlay, added an anchor on the real page, drew a route, and closed the overlay with Escape.

## Useful Hero Anchors

| Anchor | Suggested flock relationship |
| --- | --- |
| Hero headline | Frame or pass behind while preserving legibility. |
| Portfolio comparison visual | Pass behind or dive toward depending on route. |
| Primary CTA zone | Avoid or exit past, never cover. |

## Mapper Output

The app exports normalized 0–1 viewport anchors and raw path points. Feed this JSON to the bird renderer prompt and use it to compose routes around the page elements.
