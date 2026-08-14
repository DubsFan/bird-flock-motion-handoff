# Fast Bird Flight Verification

## Motion Design

The final loop is **8 seconds at 24 fps**. It holds an empty transparent frame from the start through 0.75 seconds, moves the retained bird group from off-screen left to off-screen right, then remains empty after the group exits at 6.50 seconds. Each retained line-art component uses symmetric flex around its lower wing joint at approximately **3.00–3.48 flap cycles per second**. This replaces the rejected one-sided edge-hinge rotation.

| Checkpoint | Frame | Result |
| --- | ---: | --- |
| Start | 0 | 0 visible alpha pixels |
| Before entry | 17 | 0 visible alpha pixels |
| During entry | 36 | 66 visible alpha pixels |
| Mid-flight | 96 | 4,429 visible alpha pixels |
| Exit completed | 156 | 0 visible alpha pixels |
| Loop end | 191 | 0 visible alpha pixels |

## Style Constraint

No realistic rendering was added. The clip uses the retained original blue line-art pixels only. It has no realistic anatomy, tonal shading, fill, feather texture, volumetric form, or invented bird designs.

## Deliverables

| File | Role | Alpha |
| --- | --- | --- |
| `birds-fast-flight-transparent-prores4444.mov` | Native-resolution master, 1672 × 941 | ProRes 4444 alpha |
| `birds-fast-flight-transparent.webm` | Browser delivery, 1672 × 940 | VP9 alpha |
| `birds-fast-flight-review.mp4` | Dark-background review copy | None |

The WebM uses a one-pixel bottom crop required for 4:2:0 alpha encoding. No retained bird pixels occupy that row.
