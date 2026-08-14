# Murmuration Reference Rules

Derived from starling murmuration photography and the National Geographic "Aerial Acrobatics" / "Escape Maneuvers" diagram.

## Documented mechanics to reproduce

| Mechanic | Reference description | Implementation rule |
| --- | --- | --- |
| Local neighbor tracking | Each bird tracks and mimics about seven neighbors; response is leaderless and collective | Boid-style local averaging of the 7 nearest neighbors, no single hero leader driving the group |
| Flash expansion | Flock suddenly bursts outward, opening a hollow center | Global radius multiplier spikes, center density drops |
| Split | The mass divides into two lobes with a thin bridge between them | Two attractor centers separate, membership blends between them |
| Merge | Lobes collapse back into one dense core | Attractors converge, cohesion weight rises |
| Flock dilution | Density falls, spacing becomes even and sparse | Separation weight rises, radius grows slowly |
| Wave events | A dark pulse travels across the flock; it is an orientation change, not a density change | Wing-phase and body-angle wave propagating across the group by position, not a scale change |
| Shape-shifting mass | The silhouette continually deforms: teardrop, hourglass, ribbon, funnel, comma | Group envelope driven by time-varying anisotropic scaling and shear |
| Edge sharpness | Outer boundary stays denser than the interior in dense phases | Slight inward bias for outer members during merge phases |

## Visual character of the reference

The reference flocks read as a **single deformable mass** whose interior density varies, not as evenly spaced individuals traveling in formation. Members near the boundary are sparse and readable as individual marks, while the core reads as tone. Motion is smooth and continuous; shape changes take one to three seconds, never a snap.

## Applied to this project

Because the locked art style is sparse hand-drawn line-art contours, the flock cannot be rendered as a dense tonal mass. The translation is:

1. Use a much larger member count so grouping is legible as a mass envelope.
2. Drive positions with real boid rules (cohesion, separation, alignment) so grouping is emergent.
3. Vary the group envelope over time to hit the reference silhouettes.
4. Propagate a wave of wing phase across the group by position, per the "orientation wave" note.
5. Keep the entry and exit blank by scaling the whole group's presence to zero at the loop edges.
