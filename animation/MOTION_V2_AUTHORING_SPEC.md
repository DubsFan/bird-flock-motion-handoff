# Murmur Motion V2 Authoring Specification

This document is the production contract for re-authoring the six operator-facing animal identities: crow, pigeon, swallow, butterfly, bat, and hummingbird. It supplements `MOTION_FOUNDATION.md` and `SOURCE_CURATION.md`; where they conflict, those repository-level regression guards remain authoritative.

The deliverable remains ordered, baked, true-alpha PNG artwork. Layered rigs, mesh deformation, 2.5D scenes, or 3D scenes are authoring tools only. Murmur must play the approved pixels directly and must not reconstruct or procedurally re-rig them at runtime.

## 1. Runtime and export contract

| Property | Required value |
| --- | --- |
| Authored facing direction | Right |
| Flight canvas | 1600 x 1200 RGBA; explicit authored body landmark per frame (current V2 rigs center near `(800, 501)`) |
| Avian/butterfly action canvas | 1600 x 1200 RGBA; bottom contact anchor `(800, 750)` |
| Bat action canvas | 1600 x 1200 RGBA; top roost anchor `(800, 450)` |
| Hummingbird action canvas | 1600 x 1200 RGBA; body/hover anchor `(800, 620)` |
| Source ink | `#043A78`; antialiasing uses alpha, not extra RGB colors |
| Background | Fully transparent; no black matte, checkerboard, branch, wire, flower, or target geometry |
| Published flight length | Crow 12, pigeon 10, swallow 7, butterfly 6, bat 6, hummingbird 4 blur-shimmer poses |
| Action length | Exactly 8 approach, 8 perch/alight/hover/roost, and 8 launch frames |
| File order | Unique filenames beginning `01_` through the track's final index |
| Playback | Chronological, forward-only, no cross-fade, no ping-pong, no neutral-frame substitution |

The fixed action target is an external scene coordinate. Feet, claws, or roost toes must remain on that coordinate once contact occurs. The renderer may mirror the completed image for leftward travel; the authoring rig must not pre-bake both directions.

### 1.1 Physical cycle-rate metadata

`cycleHz` records physical species cadence. Sampling density is a separate contract: normal chronological art declares the FPS required to expose every baked pose, while hummingbird declares a reduced-pose motion-blur shimmer. The three values correspond to Murmur's Soft, Medium, and Strong controls.

Runtime playback retains those physical rates as source provenance but uses a
lower, readable display cycle for the stylized baked poses. Display cadence is
also multiplied by the square root of the operator's route-speed control,
bounded to 0.55–1.35x, so slow travel cannot retain sprint-level flapping.
Soft / Medium / Strong display cycles are Crow 1.6/2.0/2.5, Pigeon
2.0/2.6/3.2, Swallow 2.5/3.2/4.0, Butterfly 3.0/4.0/5.0, Bat 2.5/3.3/4.2,
and Hummingbird shimmer 1.8/2.1/2.4 Hz.

| Identity | Soft | Medium | Strong | Published poses | Declared chronological min FPS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Crow | 4.0 Hz | 4.5 Hz | 5.0 Hz | 12 | 68 |
| Pigeon | 5.0 Hz | 6.0 Hz | 7.0 Hz | 10 | 79 |
| Swallow | 7.0 Hz | 8.0 Hz | 9.0 Hz | 7 | 72 |
| Butterfly | 8.0 Hz | 10.0 Hz | 12.0 Hz | 6 | 81 |
| Bat | 8.0 Hz | 10.0 Hz | 12.0 Hz | 6 | 81 |
| Hummingbird | 40 Hz | 50 Hz | 60 Hz | 4 blurred shimmer poses | 30 (display shimmer 1.8/2.1/2.4 Hz) |

Hummingbird hover uses `dwellCyclesPerSecond: 3` and `perchPlayback: "loop"`. Its physical cadence remains honest in metadata, while the display track uses authored motion-envelope/echo cues at a readable shimmer rate. Do not attempt literal hard-pose playback at 40–60 Hz; it would alias and strobe.

The detailed species chronology tables below define biomechanical landmarks on each continuous authoring curve. They are not permission to generate unrelated whole-animal stills, and they are not necessarily one-to-one with the smaller published sampling set. The deterministic baker samples the continuous layered rig at the published density above.

### 1.2 Shared action sampling semantics

Approach and launch are spatial tracks. Their eight frames are sampled in order over the actual approach or release runway, not played as time-based idle loops.

For crow, pigeon, swallow, butterfly, and bat, the perch-like track is semantic:

- frames 01–05: take weight, fold, compress, rebound, settle;
- frame 05: quiet stationary hold;
- frames 06–07: near-hold safety poses for source inspection and future samplers; they must not contain required story action;
- frame 08: launch preload.

The current dwell sampler may hold frame 05 and then move directly to frame 08. Therefore frames 05–08 must share the exact same contact point and must tolerate that transition without a pop.

Hummingbird is the exception: all eight `perch` frames form a body-locked continuous hover loop, so every frame is production-visible.

## 2. Layered authoring rules

### 2.1 Layer construction

Every rig must be rebuilt from a single approved master identity. Never generate each pose independently. Separate moving anatomy before deforming it; a flattened whole-animal mesh cannot recover hidden wing surfaces or correct overlap when wings cross the body.

Each deforming appendage needs a rigid proximal root and a distal fan or membrane controller. Keep the head, eye, beak/muzzle, torso contour, and signature engraving marks on locked identity layers. Deformation may bend appendage contours; it may not redraw identifying anatomy.

Default right-facing lateral depth order, back to front:

1. far wing or far-side appendages;
2. far leg/foot;
3. tail behind torso;
4. torso, neck, head, eye, and beak/muzzle;
5. near leg/foot;
6. near wing or near-side appendages;
7. intentional motion-echo lines.

Use discrete z-order swaps only on authored keys where an appendage actually crosses the torso. Do not interpolate a layer-order swap.

### 2.2 Joint conventions

- Put `root` at the rigid torso mass, not at a wingtip or the changing silhouette centroid.
- Bird wings use `shoulder -> elbow -> wrist -> primary_fan`; add `secondary_fan` as a sibling of `primary_fan` when feather overlap must change.
- Tail halves or fans rotate around one pelvis/tail-base joint; never scale the torso to fake a tail fan.
- Legs are hidden or tightly tucked in flight and receive separate hip, ankle, and contact-toe controllers in action tracks.
- Butterfly wings rotate at four thorax hinges. Forewing and hindwing remain distinct pieces on each side.
- Bat wings require shoulder, elbow, wrist, and digit rays; membrane panels are weighted between adjacent rays rather than stretched as one sheet.
- Hummingbird wings require stroke, deviation, and pitch controls. A single shoulder rotation is insufficient for the figure-eight envelope.

### 2.3 Offline authoring choices

- Layered 2D mesh or cutout rig: preferred for crow, pigeon, swallow, and butterfly.
- Blender Grease Pencil, a 2.5D layered rig, or a fixed-view 3D rig: preferred for bat and hummingbird because wing pitch, folding, membrane/feather overlap, and occlusion materially change through the cycle.
- Optical-flow inbetweening may propose a frame only between adjacent approved poses. It must never invent the upstroke/downstroke reversal, contact, wing/body crossing, or roost inversion. Every proposed frame remains subject to the same identity, alpha, topology, and seam gates.

## 3. Crow

Primary reference: [Scaling of mechanical power output during burst escape flight in the Corvidae](https://journals.biologists.com/jeb/article/214/3/452/33507/Scaling-of-mechanical-power-output-during-burst).

### 3.1 Rig

- Locked layers: head/beak/eye, neck/torso, engraved body detail.
- Deforming layers: far and near wings, each with shoulder/elbow/wrist/primary-fan/secondary-fan; three-part tail fan; two legs and two contact feet.
- Default wing depth: far wing behind torso, near wing in front. The far wing may cross behind the tail but never appear through the torso.
- Signature cues: broad rounded wing, separated primary tips, heavy torso, wedge/fan tail. Do not turn the crow into a narrow gull or pointed swallow.

### 3.2 Twelve-frame flight chronology

| Frame | Required pose |
| --- | --- |
| 01 | Level glide; wings broadly extended, primaries separated, tail modestly closed. Seam target. |
| 02 | Early upstroke; elbows flex, wrists rise, distal primaries begin to close. |
| 03 | Mid-upstroke; span shortens and the wing tips pass above the back. |
| 04 | Compact recovery; elbows high, wrists back, primaries grouped to reduce recovery area. |
| 05 | Upstroke peak; minimum projected span without collapsing the wing into the torso. |
| 06 | Reopening; wrists sweep outward, separated primary tips reappear. |
| 07 | Level transition; broad span restored, body remains stable. |
| 08 | Early downstroke; shoulders drive down and slightly forward. |
| 09 | Mid-downstroke; maximum loaded area, tail begins a small counter-fan. |
| 10 | Downstroke peak; broad lowest wing position and strongest primary spread. |
| 11 | Bottom reversal; elbows begin to flex while tips trail. |
| 12 | Recovery to glide; span reopens toward frame 01 with no neutral hold. |

### 3.3 Action tracks

| Frame | Approach | Perch | Launch |
| --- | --- | --- | --- |
| 01 | Stable approach glide | Feet take weight at anchor | Upright crouched preload |
| 02 | Tail fans; body starts braking | Wings continue folding | Toe release; body begins forward/downward move |
| 03 | Body/stroke plane becomes more upright | Leg compression | Wings rise high for power stroke |
| 04 | Broad flare with high drag | Controlled rebound | First forceful downstroke |
| 05 | Legs lower late; toes open | Quiet hold | Body and feet clear contact |
| 06 | Exact foot contact; wings still controlling | Near-hold micro-adjust | Acceleration with partial reopen |
| 07 | Wings fold without moving feet | Near-hold | Second loaded beat; stronger than the initial partial beat |
| 08 | Upright perch-ready pose | Launch preload; same foot anchor | Departure recovery compatible with flight frame 01 |

Crow-specific gate: at frame 05 flight, projected wingspan must be 45–65% of frame 10 wingspan; at frame 10, at least three separated primary tips must remain readable on each visible wing at master resolution.

## 4. Pigeon

Primary reference: [Wing and body kinematics of takeoff and landing flight in the pigeon](https://journals.biologists.com/jeb/article/213/10/1651/9685/Wing-and-body-kinematics-of-takeoff-and-landing).

### 4.1 Rig

- Locked layers: head/beak/eye, compact neck/chest, torso identity marks.
- Deforming layers: near/far wings with shoulder/elbow/wrist/primary fan; broad tail fan with left/center/right controllers; near/far legs and contact toes.
- Preserve a compact deep-chested silhouette, shorter tail, and rounded wing planform. Do not elongate the neck or convert the primaries into crow-like fingers.

### 4.2 Twelve-frame flight chronology

| Frame | Required pose |
| --- | --- |
| 01 | Compact level glide; tail closed. Seam target. |
| 02 | Early upstroke with fast elbow flexion. |
| 03 | Mid-upstroke; wrists lift close to torso. |
| 04 | Compact high recovery; primaries overlap cleanly. |
| 05 | Upstroke peak; minimum span, chest remains unchanged. |
| 06 | Fast reopen; wrists sweep outward. |
| 07 | Level transition with a subtle body rise, not a scale change. |
| 08 | Early downstroke; rounded wing area loads. |
| 09 | Mid-downstroke; tail opens slightly for stability. |
| 10 | Full downstroke; broad low wings, most powerful silhouette. |
| 11 | Bottom reversal; tips trail and elbows begin recovery. |
| 12 | Return toward compact glide; tail closes to match frame 01. |

### 4.3 Action tracks

| Frame | Approach | Perch | Launch |
| --- | --- | --- | --- |
| 01 | Forward glide, body near-horizontal | Toes take weight | Deep leg/torso preload |
| 02 | Tail opens wide | Wing fold continues | Toe release and upward-forward jump |
| 03 | Body and stroke plane rotate upright | Leg compression | Wings high; first partial beat |
| 04 | Maximum flare and drag | Rebound without foot slide | First full power downstroke |
| 05 | Feet extend late under body | Quiet hold | Clear contact |
| 06 | Exact contact; tail still fanned | Near-hold micro-adjust | Reopen and accelerate |
| 07 | Wings fold; tail begins closing | Near-hold | Second wingbeat carries the strongest acceleration cue |
| 08 | Upright perch-ready pose | Launch preload | Recovery compatible with flight frame 01 |

Pigeon-specific gate: from approach 01 to 06, body axis must rotate at least 30 degrees toward upright and tail width must increase by at least 25%; the contact toes may not appear before frame 05.

## 5. Swallow

Primary references: [Wingbeat frequency of barn swallows and house martins](https://journals.biologists.com/jeb/article/205/16/2461/9131/Wingbeat-frequency-of-barn-swallows-and-house) and [Wake structure and wingbeat kinematics of a house martin](https://pmc.ncbi.nlm.nih.gov/articles/PMC2373391/).

### 5.1 Rig

- Locked layers: small head/beak/eye, streamlined torso, throat/chest marks.
- Deforming layers: long near/far wings with shoulder/elbow/wrist/primary fan; independent upper and lower fork-tail streamers; small near/far legs and toes.
- Keep pointed tips, high aspect ratio, and fork-tail length. No broad rounded primaries or pigeon-like chest bob.

### 5.2 Sixteen-frame flight chronology

| Frame | Required pose |
| --- | --- |
| 01 | Long level glide; fork tail aligned. Seam target. |
| 02 | Minor feather/tail adjustment; not a duplicate hold. |
| 03 | Shallow dihedral begins. |
| 04 | Transition into lift; elbows start flexing. |
| 05 | Quarter upstroke. |
| 06 | Half upstroke; span visibly shortens. |
| 07 | Three-quarter upstroke; wings compact beside body. |
| 08 | Compact upstroke peak. |
| 09 | Brief peak release/pause; silhouette change remains visible. |
| 10 | Quarter downstroke; pointed tips reopen. |
| 11 | Half downstroke; area loads. |
| 12 | Three-quarter downstroke. |
| 13 | Full downstroke peak with long pointed tips. |
| 14 | Bottom recovery; elbows begin flexing. |
| 15 | Shallow glide return. |
| 16 | Level loop closure matching frame 01 without becoming identical. |

The compact mid-upstroke character and optional glide behavior are essential. The normal loop must not become a slow broad gull flap.

### 5.3 Action tracks

| Frame | Approach | Perch | Launch |
| --- | --- | --- | --- |
| 01 | Fast shallow approach | Toes take weight | Forward-lean preload |
| 02 | Fork tail spreads for control | Wings fold tightly | Release from wire/contact |
| 03 | Compact braking upstroke | Small leg compression | Narrow wings rise rapidly |
| 04 | Fast flare | Rebound | Sharp first downstroke |
| 05 | Tiny legs extend late | Quiet hold | Clear contact |
| 06 | Exact contact | Near-hold micro-adjust | Streamlined acceleration |
| 07 | Wings snap folded | Near-hold | Second pulse-like beat |
| 08 | Sleek perch-ready pose | Launch preload | Long-wing departure compatible with flight 01 |

Swallow-specific gate: flight frames 07–09 must have no more than 55% of frame 01 wingspan, and frames 01/15/16 must preserve two separately readable tail streamers with neither streamer changing length by more than 3%.

## 6. Butterfly

Primary reference: [Butterflies fly using efficient propulsive clap mechanism owing to flexible wings](https://pmc.ncbi.nlm.nih.gov/articles/PMC7879755/).

### 6.1 Rig

- Locked layers: thorax, abdomen, head, eye, two antennae.
- Deforming layers: near/far forewings and near/far hindwings, each hinged independently at the thorax; six legs grouped into near/far contact sets for action tracks.
- Wing surface markings remain registered to their wing pieces. They may foreshorten with the wing plane but may not slide across the membrane.
- Depth order: far hindwing, far forewing, body/legs, near hindwing, near forewing, antennae. At the clap, near and far wings may converge but must remain separately legible at the outer contour.

### 6.2 Twelve-frame flight chronology

| Frame | Required pose |
| --- | --- |
| 01 | Broad open wing plane; abdomen stable. Seam target. |
| 02 | Wings begin rising; forewings lead slightly. |
| 03 | Near-clap; projected area narrows. |
| 04 | Clap/near-contact at upstroke completion; no merged four-wing blob. |
| 05 | Leading-edge peel begins; forewings separate first. |
| 06 | Reopening with cupped wing surfaces. |
| 07 | Broad propulsive downstroke. |
| 08 | Low open/cupped position; maximum body rise cue. |
| 09 | Downstroke bottom; hindwings trail slightly. |
| 10 | Rebound; wing pitch reverses. |
| 11 | Rising recovery with small abdomen counter-pitch. |
| 12 | Open return compatible with frame 01. |

Allow deliberate non-mechanical timing through the path/phase system, but do not change the authored chronological order or independently randomize the four wings.

### 6.3 Action tracks

| Frame | Approach/alight | Alighted hold | Launch |
| --- | --- | --- | --- |
| 01 | Flutter approach | Contact legs take weight | Closed/upright preload |
| 02 | Decelerate with shorter stroke | Wings move toward closed profile | Wings begin opening |
| 03 | Body pitches upright | Closed-wing profile | First clap/drive preparation |
| 04 | Legs extend toward target | Tiny leg compression | First propulsive opening/downstroke |
| 05 | First leg contact | Quiet hold | Legs clear target |
| 06 | High-wing braking while legs remain fixed | Near-hold antenna/abdomen micro-adjust | Rebound upstroke |
| 07 | Wings close above body | Near-hold | Second downstroke/fast flutter |
| 08 | Stable alight-ready closed profile | Launch preload | Open departure compatible with flight 01 |

Butterfly-specific gate: all four wings must remain identifiable in frames 01, 04, 07, and 09; antenna tips may drift no more than 8 px relative to the head root across the flight loop; alight frames 05–08 must keep the same leg-contact point within 5 px.

## 7. Bat

Primary references: [Rapid flapping and fibre-reinforced membrane wings are key to high-performance bat flight](https://pmc.ncbi.nlm.nih.gov/articles/PMC10645508/) and [Falling with Style: Bats Perform Complex Aerial Rotations by Adjusting Wing Inertia](https://pmc.ncbi.nlm.nih.gov/articles/PMC4646499/).

### 7.1 Rig

- Locked layers: head/muzzle/eyes/ears, torso, pelvis identity marks.
- Deforming layers per wing: humerus, radius/ulna, wrist, thumb, digits II–V, and membrane panels between body/hindlimb and adjacent digit rays.
- Separate near/far hindlimbs, feet, and roost toes. The feet are the top contact, never the head or wing tip.
- Membrane linework is bound to adjacent rays. Never scale the entire wing triangle from the shoulder; span reduction must come from elbow, wrist, and digit folding.
- Preferred source is a fixed-view 2.5D or 3D rig rendered to the same one-color PNG contract.

### 7.2 Twelve-frame flight chronology

| Frame | Required pose |
| --- | --- |
| 01 | Level flight with broad but not maximal span. Seam target. |
| 02 | Early upstroke; elbows flex and wrists begin folding. |
| 03 | Mid-upstroke; handwings rotate and digits group. |
| 04 | Strong compact fold; minimum membrane area. |
| 05 | Upstroke peak; wrists closest to torso without self-intersection. |
| 06 | Reopening; digits spread sequentially from proximal to distal. |
| 07 | Level transition with restored membrane camber. |
| 08 | Loaded downstroke begins; span expands. |
| 09 | Mid-downstroke; maximum membrane area develops. |
| 10 | Broad power stroke; greatest span and clear digit rays. |
| 11 | Bottom reversal; handwings trail while wrists prepare to fold. |
| 12 | Rebound/recovery toward frame 01. |

### 7.3 Action tracks

| Frame | Overhead approach | Inverted roost | Drop launch |
| --- | --- | --- | --- |
| 01 | Controlled approach below target | Toes take weight at top anchor | Inverted preload; toes still fixed |
| 02 | Brake with expanded membrane | Membranes begin folding around body | Toe release; gravity-driven drop begins |
| 03 | Feet reach upward | Compact inverted compression | Membranes start opening during drop |
| 04 | Body rotates head-down beneath feet | Small pendulum rebound | Rotate from head-down toward travel heading |
| 05 | Exact overhead toe contact | Quiet inverted hold | First loaded downstroke |
| 06 | Wings fold while feet stay fixed | Near-hold tiny sway | Accelerate clear of roost |
| 07 | Inverted settle | Near-hold | Recovery upstroke |
| 08 | Compact roost-ready hang | Drop-launch preload | Departure compatible with flight 01 |

Bat-specific gate: frame 05 flight projected span must be 40–65% of frame 10 span; frame 10 must show at least four distinct distal digit rays on the near wing; roost frames 05–08 must keep the highest toe-contact pixel within 5 px of `(800, 450)` while the head remains below that point.

## 8. Hummingbird

Primary references: [Hovering hummingbird wing aerodynamics during the annual cycle](https://pmc.ncbi.nlm.nih.gov/articles/PMC5579086/) and [Winging it: hummingbirds alter flying kinematics during molt](https://pmc.ncbi.nlm.nih.gov/articles/PMC11583918/).

### 8.1 Rig

- Locked layers: head/eye/long beak, compact torso, feet tucked against body.
- Deforming layers: near/far wings with shoulder stroke control, deviation control, long-axis pitch control, and distal feather fan; three-part tail fan.
- Optional motion-echo layer may use lower alpha of the same ink color. It must describe the wing envelope only and must never ghost the head, beak, torso, eye, or tail.
- Preferred source is a fixed-view 3D or 2.5D rig because a flat shoulder rotation cannot express simultaneous sweep, deviation, and pitch reversal.

### 8.2 Eight-frame flight/hover chronology

| Frame | Required pose |
| --- | --- |
| 01 | Forward/high reversal of the figure-eight; body and beak fixed. Seam target. |
| 02 | Forward-mid power sweep; downstroke-biased wing pitch. |
| 03 | Low/back portion of the stroke; tail counters body pitch. |
| 04 | Rear reversal arc; wing long-axis pitch visibly changes. |
| 05 | Return/high portion crossing the opposite lobe of the envelope. |
| 06 | Reverse-mid upstroke; projected wing surface differs from frame 02. |
| 07 | Low/opposite portion; far/near wing depth remains coherent. |
| 08 | Loop return; motion envelope closes cleanly into frame 01. |

The torso anchor may bob no more than 4 px across the loop. The downstroke poses should read stronger than the upstroke poses; experimental work reports asymmetric lift support rather than an insect-like perfectly symmetric stroke.

### 8.3 Action tracks

| Frame | Braking approach | Hover dwell loop | Launch |
| --- | --- | --- | --- |
| 01 | Fast forward flight | Forward/high hover reversal | Hover departure pose |
| 02 | Tail opens for braking | Forward-mid sweep | Body pitches forward slightly |
| 03 | Body becomes more upright | Low/back sweep | Tail narrows |
| 04 | Broad braking stroke | Rear pitch reversal | Acceleration stroke |
| 05 | Near-hover capture | Return/high sweep | Forward clear of target |
| 06 | Stable hover at body anchor | Reverse-mid sweep | Second stroke |
| 07 | Tiny lateral/vertical hover adjustment | Low/opposite sweep | Recovery |
| 08 | Hover-ready loop entry | Loop closure matching frame 01 | Fast departure compatible with flight 01 |

Hummingbird-specific gate: body-anchor maximum residual is 4 px within flight and hover tracks; beak-tip displacement relative to torso root is at most 3 px; wing-motion echo alpha is 15–45% of solid-line alpha and never touches the head/eye/beak mask.

## 9. Measurable acceptance gates

All gates are blocking unless marked as visual review.

### 9.1 File, alpha, and color gates

1. Every PNG decodes as 1600 x 1200 RGBA.
2. Flight contains the exact species count in section 1; each action track contains exactly eight frames.
3. All four outer image borders have maximum alpha `0` and the nonempty alpha bounding box leaves at least 16 px padding on every side.
4. Every pixel with alpha greater than `0` has source RGB `#043A78`; antialiasing is represented only by alpha.
5. Alpha extrema are `[0, 255]`; no frame is empty; no opaque background component touches an outer border.
6. Composite every frame on black, white, and 50% gray. No matte or fringe wider than one output pixel may be visible at 100% zoom.

### 9.2 Anchor and contact gates

1. Flight body-anchor residual from `(800, 620)` is at most 12 px for every frame; hummingbird is at most 4 px.
2. Avian/butterfly perch contact residual from `(800, 750)` is at most 5 px for every settled frame.
3. Bat top-contact residual from `(800, 450)` is at most 5 px for every roost frame.
4. Hummingbird approach, hover, and launch body-anchor residual from `(800, 620)` is at most 4 px while stationary and 12 px at the moving ends.
5. The final approach and first perch contact points differ by at most 1 px. The final perch and first launch contact points differ by at most 1 px.
6. No foot/contact point may move more than 2 px between adjacent settled hold frames.

### 9.3 Identity and deformation gates

1. On locked body layers, body-length and body-height variance is at most 3% from the master; head-to-eye, eye-to-beak-tip/muzzle, and shoulder-to-tail-base distances vary at most 2% unless a documented 2.5D foreshortening key requires otherwise.
2. Eye count, beak/muzzle topology, antenna count, tail-streamer count, digit-ray count, and visible foot count remain anatomically consistent.
3. No wing, membrane, feather, antenna, or leg line may terminate inside the torso unless it is visibly occluded by a foreground torso layer.
4. Adjacent line-mask connected-component count may not exceed twice either neighbor's count; any new isolated component smaller than 8 pixels is rejected as debris.
5. Texture/engraving landmarks remain registered to their anatomical layer within 4 px and never swim across a deformed surface.

### 9.4 Motion continuity gates

1. Adjacent flight silhouette IoU must be less than `0.97`; near-duplicate neighboring poses fail.
2. The last-to-first flight seam IoU must be at least `0.25` and no lower than the minimum internal adjacent IoU minus `0.02`.
3. Compute symmetric chamfer distance on one-pixel line masks for all adjacent pairs and the loop seam. Seam distance must be no more than `1.5x` the median internal adjacent distance.
4. Wingtip displacement must progress monotonically between named extrema within each stroke segment; a one-frame reversal or teleport fails.
5. At 30 fps, fast chronological flight must declare temporal shutter sampling; hard frame dropping and silently reduced biological cadence both fail. The shutter composite may include only ordered poses from the same one-color alpha track.
6. No optical-flow candidate is accepted if it creates double contours, translucent duplicate anatomy, line-width growth over 25%, or a topology change not present in either neighboring key.

### 9.5 Playback and handoff gates

1. Review three uninterrupted normal-speed flight loops at Soft, Medium, and Strong.
2. Review one uninterrupted `flight -> approach -> perch/alight/hover/roost -> launch -> flight` sequence at normal speed.
3. Review rightward source playback and runtime-mirrored leftward playback. Eyes, beaks, wing depth, and contact anchors must remain coherent.
4. Review the smallest intended distant size. The wing extrema and species identity must still change visibly.
5. Review light, dark, and checker backgrounds. Alpha proof does not pass from a contact sheet alone.
6. Confirm crow/pigeon/swallow/butterfly/bat settle to a quiet mid-track hold and transition safely to the final preload pose; confirm hummingbird hover loops its complete dwell track.
7. Record exact proof paths and pass/fail findings in `AUDIT_LOG.md` when implementation occurs. This specification alone is not visual proof.

## 10. Source and method notes

- Bird wing upstroke mechanics vary with speed and wing shape; broad-winged birds flex more, while pointed high-aspect-ratio wings can use feathered or swept recovery: [Biomechanics of bird flight](https://journals.biologists.com/jeb/article/210/18/3135/17027/Biomechanics-of-bird-flight).
- Raster interpolation is not an authority for line-art topology. A line-aware study found perceptual LPIPS and chamfer line distance more appropriate than PSNR/SSIM for 2D animation evaluation: [Improving the Perceptual Quality of 2D Animation Interpolation](https://github.com/ShuhongChen/eisai-anime-interpolator).
- A skeleton-driven bitmap method demonstrates why occlusion-aware 2.5D partial layering is needed when drawings cross themselves: [Skeleton-Driven Inbetweening of Bitmap Character Drawings](https://github.com/kbrodt/inbetweening).
- Blender's official authoring references for a baked transparent workflow are [Grease Pencil Armature Modifier](https://docs.blender.org/manual/en/5.0/grease_pencil/modifiers/deform/armature.html) and [Film transparency](https://docs.blender.org/manual/en/latest/render/cycles/render_settings/film.html).
