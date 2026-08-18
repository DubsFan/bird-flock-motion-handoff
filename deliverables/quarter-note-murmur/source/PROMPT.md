# Master artwork prompt

Built-in image generation was used for the identity master with this normalized production prompt:

> Create exactly one classic quarter note (crotchet) as a crisp traditional music-engraving silhouette. Center one large, recognizable filled oval notehead with a single straight stem on a transparent square canvas. Use pure solid black only. No text, staff lines, shadows, gradients, decorations, additional symbols, or watermark.

The generated master is byte-identical to the user-supplied reference image (`SHA-256 b156a1d8ce6178ac95ea5bef0d7723c77eda69e80cbc0b1d61b6e585e2cb088b`). The build script preserves that alpha silhouette as one identity and applies only rigid rotation and translation from `motion-spec.json`. The rejected v1 nonuniform scale/shear treatment is intentionally absent.
