# Murmur Motion Foundation

This file is the regression guard for bird artwork and motion. Read it before changing the renderer, presets, asset intake, or export proofs.

## Canonical repository and legacy archive

- `/Volumes/Sam4T/External Project/bird-flock-motion-handoff` is the only active Git repository and the canonical Murmur application. Its GitHub remote is `DubsFan/bird-flock-motion-handoff`.
- `/Volumes/Sam4T/External Project/_Archive - Murmur Legacy Handoff 2026-08-13` is a dated, non-Git creative-production archive. It is not a second application checkout and the current tool has no runtime or build dependency on it.
- The active repository contains byte-identical C/A/B/D source contours and retained dive-curl WebM/MP4 proofs, plus the newer canonical flight and landing libraries. The archive uniquely retains historical masters such as the symmetric ProRes/WebM/MP4 set, the dive-curl ProRes master, and the superseded Python render workspace.
- Use the archive only for provenance or recovery of those historical outputs. Do not copy its old mapper, procedural rig, rejected render experiments, or hard-coded leftward/blank-edge contracts back into the current application.

## Authoritative chronology

1. `/Users/liltroy/Downloads/Animate Birds 101 source/How to Make a Transparent Background Video from an Image.zip` is the accumulated baseline: experiments, rejection notes, accepted flock renderers, browser reviews, and output examples.
2. `... Image Two.zip` advances Waterfall Bloom, corrected Vortex Pull, alpha delivery, and the editable mapper handoff.
3. `... Image Three.zip` advances the approved C/A/B/D artwork into aligned transparent PNG source sequences.
4. `/Users/liltroy/Downloads/bird anime source/Bird Anime Source.zip` is the canonical editable flight library. It contains sixteen named variants with eight aligned source frames in three size tiers.
5. `/Users/liltroy/Downloads/bird anime source/Bird landing anime source.zip` is the canonical landing library. It adds matched landing-approach, perch-settle/hold, and launch/fly-off tracks for the same sixteen identities.

Newer accepted evidence supersedes older experiments. A technically valid file is not automatically an accepted visual result.

## Locked artwork rules

- Use only the supplied artist-derived C/A/B/D contours unless the user explicitly imports a different identity.
- Preserve the hand-drawn open blue line language. No generic bird icon, filled body, white outline, realistic anatomy, feet, feathers, or changing AI-redrawn identity.
- During source generation, keep the artist-drawn center notch/body anchor fixed across every authored frame. Runtime playback uses the completed PNGs directly; it does not split or re-rig them.
- Source direction is metadata. Mirror automatically from actual flight direction; never force every bird leftward.

## Locked flight-cycle rules

- Every visible bird receives visible wing movement, including distant birds.
- Play the actual ordered source PNGs. Do not take frame one and procedurally re-rig it; that was the regression that made the handed-off motion look weaker than its source.
- Preload the assigned authored tracks before drawing. While loading, show an honest loading state; never flash a generic/procedural substitute bird for even one frame.
- The canonical order is: neutral settle → upstroke lift → upstroke peak → upstroke return → level glide → downstroke drive → downstroke peak → recovery.
- Render the eight frames at approximately 6 fps (slow), 8 fps (natural), or 10 fps (active), with restrained seeded per-bird phase variation.
- The `08 → 01` transition is intentionally gentle. Do not cross-fade it into doubled/ghost line art and do not replace it with a long neutral hold.
- Phase variation must be readable but coordinated. The calm flock is not synchronized, and it is not random visual noise.

## Locked landing-action rules

- A landing participant transitions from flight into the eight-frame `01_landing_approach` track over the real spatial approach runway.
- While anchored, it plays `02_perch_settle_hold` slowly; it does not keep full flight-flapping on the perch.
- On release it plays `03_launch_flyoff` over the same constant-speed spatial runway, then returns to the normal flight cycle.
- Pin the action canvas center to the external landing target. No branch, card, or perch geometry is baked into the bird artwork.
- Fly-through birds never enter the landing action tracks.

## Locked flock rules

- Birds travel as delayed samples of one continuous group route. Formation behavior is a moving offset around that route.
- Give every leader its own follower delay. Sharing a zero-delay entry point stacks the largest birds and is a rejected attack-like result; one lead bird may be visible on frame zero while the remaining flock enters in readable sequence.
- Preserve readable foreground/middle/distant tiers, broad negative space, and one clear lead hierarchy. Uniform stacking is a failure.
- Direction follows entry, path tangent, and exit. Clamp bank so no bird appears sideways or upside down.
- Landing is a true route waypoint with constant arc-length speed. No last-second catch-up, rush, or teleport.
- Normal exports begin with visible birds on frame zero and use only short final clearance. Seamless-loop exports start and end at the same nonblank state.

## Explicitly rejected regressions

- Procedural V/generic birds.
- Old `±3°` almost-static flex.
- Ignoring frames 2–8 and continuously re-rigging only the first PNG.
- Weakening or slowing the supplied cycle until wing motion is barely visible.
- Replacing the source cycle with a synthetic sine remap or a long neutral linger.
- Keeping a full flight flap active while a bird is perched.
- Static target-slot clouds, attack-like stacks, mechanical columns, or rings.
- Multi-second blank lead-ins/tails.
- Hard-coded left-facing artwork when the path travels right.
- Treating codec, alpha, unit tests, or contact sheets as a substitute for normal-speed visual playback.

## Custom source intake

- Lowest friction is one ZIP per bird identity: one manifest, eight flight PNGs, and—when landing is needed—eight approach, eight perch/settle, and eight launch/flyoff PNGs.
- The ZIP is directly importable. Murmur validates all 32 frames and stores the imported bundle in IndexedDB so large RGBA data survives reload without localStorage quota loss.
- One identity can drive 1–8 or more visible birds through independent timing, scale, and formation offsets. Create another Flock tab and import another identity only when the composition needs a distinct bird design.

## Required validation after a material motion change

1. Run unit tests, lint, TypeScript, and production build.
2. Play the real render at normal speed in a browser.
3. Inspect a chronological full-playback sheet and a close-interval enlarged eight-pose sheet.
4. Confirm every visible bird moves, the notch stays attached, the source identity remains stable, spacing remains calm, and direction stays upright.
5. Export opaque MP4 and transparent WebM proofs; for seamless mode compare decoded first/final nonblank frames.
6. Record the artifact paths and honest pass/fail result in `AUDIT_LOG.md`. Do not mark a visual requirement proven from code alone.
