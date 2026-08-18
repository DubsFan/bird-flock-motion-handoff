# Quarter-note authoring workspace

This is the quarter-note counterpart to `artwork/smoke-cloud/`.

The exact generated/user-supplied transparent quarter note is the identity master. Representative normalized key poses are curated here for quick visual review; the accepted full four-track, 64-frame Murmur input bundle remains under `deliverables/quarter-note-murmur/`.

## Layout

- `baseline/quarter-note-master.png` — byte-identical source identity.
- `baseline/BASELINE_PROMPT.md` — built-in image-generation provenance.
- `keyposes/normalized/` — six separate one-color review renderings covering neutral flight, lift/fall extremes, contact, quiet hold, and airborne launch.
- `qa/keypose-background-contact-sheet.png` — dark, light, and checkerboard review.
- `qa/keypose-validation.json` — RGBA, dimension, padding, anchor, and one-color checks.
- `tools/sync_from_verified_bundle.py` — reproducibly refreshes this workspace from the verified 64-frame bundle.

## Finished bundle

- Import ZIP: `deliverables/quarter-note-murmur/quarter-note-01-murmur.zip`
- Unzipped runtime source: `deliverables/quarter-note-murmur/quarter-note-01/`
- Full QA and live localhost audit: `deliverables/quarter-note-murmur/AUDIT_LOG.md`

The rejected 32-frame Beat Bop workspace was intentionally removed. Its nonuniform squash, stretch, and shear changed the note's proportions and must not be restored.

Run the sync tool with the bundled Codex Python runtime or any Python environment containing Pillow and NumPy:

```bash
python3 artwork/quarter-note/tools/sync_from_verified_bundle.py
```
