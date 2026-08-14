# Canonical Source Curation

The delivered flight and landing archives remain intact under `work/source-audit/`. Runtime assets are a non-destructive curation of the strongest ten identities; the other six are quarantined, not deleted.

## Retained in the tool

| Variant | Reason retained |
| --- | --- |
| `c_hero_glide` | Cleanest source-faithful hero and neutral lead identity. |
| `c_hero_climb` | Readable upward bank for a foreground leader. |
| `c_hero_dive` | Readable downward bank for dive and landing approach. |
| `a_support_glide` | Calm medium support mark. |
| `a_support_lift` | Useful upper support without hero-scale dominance. |
| `a_support_drop` | Useful descending support. |
| `b_flock_glide` | Broad middle-flock contour distinct from A and C. |
| `b_flock_lift` | Readable lift variation for middle layers. |
| `b_flock_drop` | Readable drop variation for middle layers. |
| `d_distant_glide` | Strongest minimal distant mark; survives deep downscaling. |

Each retained identity includes its eight-frame flight cycle and the matched eight-frame approach, perch, and launch tracks.

## Quarantined from runtime

| Variant | Reason quarantined |
| --- | --- |
| `c_hero_sweep` | Pre-stretched transform is redundant with engine path banking and risks distortion at giant scale. |
| `a_support_sweep` | Compact stretch adds little new identity and duplicates editable engine direction. |
| `b_flock_sweep` | Lateral stretch is redundant with route motion and less source-faithful. |
| `d_distant_sweep` | Difference disappears at intended distant size. |
| `d_distant_lift` | Pre-baked bank is nearly indistinguishable when small; engine banking is cleaner. |
| `d_distant_drop` | Pre-baked bank is nearly indistinguishable when small; engine banking is cleaner. |

Quarantined files can be reconsidered after normal-speed user review, but they are not silently mixed into current flocks.
