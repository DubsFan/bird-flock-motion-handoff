# Quarter Note — Gentle Orbit for Murmur

This handoff replaces a bird identity with one animated quarter note while keeping Murmur's authored four-track input contract. The exact user-supplied quarter-note silhouette is preserved as the identity master and performed through 64 transparent PNG frames. Version 2 removes every squash, stretch, and shear from the rejected first pass.

## Deliverables

- `quarter-note-01-murmur.zip` — directly importable one-identity Murmur bundle.
- `quarter-note-01/` — the same import bundle unzipped.
- `qa/` — chronological contact sheets, alpha/native-background checks, 12/16/20 fps flight reviews, the continuous approach/perch/launch review, and machine-readable validation.
- `source/` — exact identity master, motion specification, deterministic builder, verifier, prompt provenance, and Python requirements.

## Motion performance

- `flight`: a small, smooth orbit around the route anchor with a gentle loop seam.
- `approach`: a restrained brake arc that returns precisely to the landing anchor.
- `perch`: sub-degree resting motion; it does not repeat the flight orbit.
- `launch`: positional anticipation, clean lift, and a neutral handoff back to flight.

Every frame is the same constant-scale silhouette transformed rigidly by rotation and translation only. The source never changes proportions.

Every track uses a 1600 × 1200 RGBA canvas and the same notehead anchor at `(800, 900)`. The note is one visible color, `#0D8EEB`, chosen to stay readable over the supplied dark pool scene.

## Import into Murmur

1. Open Murmur and select the desired Flock tab.
2. Click the Bird template preview card.
3. Choose `quarter-note-01-murmur.zip` by itself.
4. Confirm Murmur reports `Passed: 16 flight poses plus 48 matched landing-action poses`.
5. Draw the Enter, Path, Landing, and Exit route; Murmur mirrors and banks the authored note automatically.

## Rebuild and verify

Install the packages from `source/requirements.txt`, then run:

```bash
python3 source/build_quarter_note_bundle.py
python3 source/verify_quarter_note_bundle.py
```

FFmpeg is optional for import frames but required to rebuild the MP4 review proofs.
