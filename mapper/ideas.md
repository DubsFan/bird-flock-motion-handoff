# Bird Motion Mapper Design Directions

## Three Approaches

### 1. Flight Instrument

**Very Brief Intro:** A cinematic navigation instrument built around dark ink, fine vector paths, and the restrained confidence of an aeronautical plotting desk. It makes motion planning feel precise while retaining the poetry of flocking birds.

**Probability:** 0.047

### 2. Paper Choreography

**Very Brief Intro:** A warm editorial workspace that treats every route as an ink drawing on a designer’s desk. It prioritizes tactile annotation and calm visual storytelling.

**Probability:** 0.081

### 3. Museum Control Room

**Very Brief Intro:** A high-contrast archival display where route records, anchors, and previews are arranged like a conservation lab. It feels quiet, systematic, and slightly theatrical.

**Probability:** 0.026

## Chosen Approach: Flight Instrument

### Design Movement

**Dark editorial aviation cartography.** The interface combines contemporary creative-software clarity with the visual language of a flight plotting table: fine coordinate grids, measured path marks, restrained instrument panels, and a live composition field.

### Core Principles

1. **The canvas is primary.** The mapped page and drawn bird path always receive the largest area and strongest contrast.
2. **Motion is legible.** Direction, timing, density, and anchor interactions are visible without digging through a form.
3. **Technical but warm.** Fine grid texture, ink-blue route lines, and paper-toned page previews keep the tool deliberate rather than sterile.
4. **One decisive action at a time.** Select, add anchor, draw flight, or preview. The tool never overwhelms the user with simultaneous modes.

### Color Philosophy

Near-black navy creates focus and lets the route field recede like night sky. A singular marine ink blue, **#043A78**, belongs to bird movement and selected anchors only. Warm ivory is reserved for the simulated page surface so the user can evaluate contrast and background placement honestly.

### Layout Paradigm

An **instrument bay** rather than a centered dashboard: a narrow command rail on the left, an expansive live page stage in the center, and a contextual flight inspector on the right. Controls attach to the task being done and never compete with the stage.

### Signature Elements

1. Directional route splines rendered as fine blue paths with cadence dots and tapered arrowheads.
2. Numbered anchor stamps, like waypoints on a flight chart.
3. A subtle drifting coordinate grid and a compact flight-status strip showing route, density, duration, and layer.

### Interaction Philosophy

Every interaction is physical and spatial. Clicking a page object pins a waypoint. Dragging creates a route. Selecting a route reveals only the fields required to shape its behavior. Preview turns the route into a moving flock of simple ink markers, so the user sees composition before exporting.

### Animation

UI state changes use crisp 180–240ms opacity and transform transitions. The preview flock moves with a gentle, uneven cadence, and the route line receives a restrained travelling dash only while preview is active. No decorative ambient animation competes with the mapping task. Respect reduced-motion settings.

### Typography System

Use **DM Mono** for coordinate data, control labels, and numeric values. Use **Manrope** for dense readable interface copy. Use **Fraunces** only for the large stage heading and key editorial moments. Hierarchy is compact and intentional: mono labels, sans controls, serif signal words.

### Brand Essence

**Bird Motion Mapper gives site designers a spatial language for directing living background motion around the layout.**

Personality: **Precise, cinematic, attentive.**

### Brand Voice

Headlines are direct and visual. CTAs describe the exact spatial action.

Example lines:

> “Plot the flock around what matters.”

> “Draw the flight. Export the choreography.”

### Wordmark & Logo

An abstract, forward-moving three-stroke bird mark: one long curved flight line and two shorter diverging wing marks, cut from marine blue with no text inside the symbol. The wordmark pairs it with measured wide-set sans lettering.

### Signature Brand Color

**Marine Flight Blue — #043A78.**

## Style Decisions

- **Marine Flight Blue #043A78** is the core ink for route paths, selected anchors, and motion states. Brighter blue is only a thin readability highlight, never the dominant signal.
- The live page stage is the visual climax. Side rails, inspector controls, export material, and helper panels remain quieter than the mapped page and route system.
- The three-stroke forward-flight bird symbol is a primary navigation asset, paired with a measured wide-set **MAPPER** wordmark rather than default title casing.
