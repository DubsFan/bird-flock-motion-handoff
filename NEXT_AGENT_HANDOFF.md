# Current Murmur handoff

Updated: 2026-08-18

For a five-second, plain-English overview, open `HANDOFF_DASHBOARD.html` first. It links directly to both preview videos, both import ZIPs, the decision guide, and the deeper evidence.

## Repository state

- Canonical upstream: `DubsFan/bird-flock-motion-handoff`, default branch `main`.
- Working fork: `scottspencer1914/bird-flock-motion-handoff`.
- Publication branch: `codex/non-bird-artwork-handoff`.
- Publication PR: [DubsFan/bird-flock-motion-handoff#9](https://github.com/DubsFan/bird-flock-motion-handoff/pull/9).
- This branch contains the complete Silver Vortex Smoke and Quarter Note Gentle Orbit authoring workspaces, import bundles, QA, and the imported-manifest anchor fix.

Open `HANDOFF_DASHBOARD.html` first for the nontechnical status and decision guide. Keep its readiness wording, bundle counts, and links aligned with this file whenever the handoff changes.

The dashboard is a standalone HTML file with inline styling and behavior and only local asset links. Its checked desktop and phone screenshots are under `artwork/handoff-dashboard/qa/`.

Read `AGENTS.md`, `MOTION_FOUNDATION.md`, and `SOURCE_CURATION.md` before changing renderer or artwork behavior. Read the two project audit files below before revising either custom identity.

## Silver Vortex Smoke

- Authoring workspace: `artwork/smoke-cloud/`
- Direct import ZIP: `artwork/smoke-cloud/delivery/silver-vortex-smoke-v1.zip`
- Unzipped identity: `artwork/smoke-cloud/delivery/silver-vortex-smoke-v1/`
- QA and validation: `artwork/smoke-cloud/qa/`
- Top-level audit record: `AUDIT_LOG.md`, Iteration 25
- Current result: 15 frames per track, 60 total; live import, playback, reload, validation, tests, lint, TypeScript, and build passed before publication.

## Quarter Note Gentle Orbit

- Exact supplied master: `deliverables/quarter-note-murmur/source/quarter-note-master.png`
- Authoring review workspace: `artwork/quarter-note/` (six representative poses synced from the accepted 64-frame bundle)
- Direct import ZIP: `deliverables/quarter-note-murmur/quarter-note-01-murmur.zip`
- Unzipped identity: `deliverables/quarter-note-murmur/quarter-note-01/`
- Deterministic builder/spec/verifier: `deliverables/quarter-note-murmur/source/`
- Detailed audit: `deliverables/quarter-note-murmur/AUDIT_LOG.md`
- Current result: 16 frames per track, 64 total; rigid rotation/translation only at constant scale. The rejected 32-frame squash/stretch version is superseded and must not be restored.
- Live Murmur import result: `Passed: 16 flight poses plus 48 matched landing-action poses. Murmur will switch tracks automatically.`
- Visual review: chronological sheets and normal-speed localhost playback passed; no browser warnings/errors. Alpha-area drift is 0.016%, minimum clear border is 178px.

## Application change

`components/flock/asset-panel.tsx` now copies normalized manifest anchors into `trackAnchors` for flight, approach, perch, and launch. Without this, imported custom artwork can align incorrectly when Murmur switches tracks.

The retained pool-scene visual reference used for live review is `artwork/references/pool-scene-reference.png`. The six blue quarter-note explorations under `public/quarter-notes/` are curation history; `quarter-note-01-classic.png` is the selected identity source.

## Rebuild and verification

Quarter note:

```bash
python3 deliverables/quarter-note-murmur/source/build_quarter_note_bundle.py
python3 deliverables/quarter-note-murmur/source/verify_quarter_note_bundle.py
python3 artwork/quarter-note/tools/sync_from_verified_bundle.py
```

Repository gates:

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Where the next agent should begin

1. Open `HANDOFF_DASHBOARD.html`, then read this file and both custom-identity audit records.
2. Confirm the publication PR status and CI result before making new changes.
3. If visual refinement is requested, start from `deliverables/quarter-note-murmur/source/motion-spec.json`; preserve rigid transforms and the exact master hash.
4. Use Murmur's real ZIP importer and normal-speed playback for every material motion iteration. Do not approve from alpha checks or contact sheets alone.
5. Keep `HANDOFF_DASHBOARD.html`, this file, and the relevant audit record synchronized before publishing another handoff.
