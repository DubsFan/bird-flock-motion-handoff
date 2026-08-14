# Locked Contour Wing Motion Method

Each extracted bird remains a source-pixel asset. The contour is not regenerated, redrawn, or replaced.

The method splits each bird at its existing center notch. The two wing regions rotate independently around that center notch by only **±3°** on slow, offset sine curves between **0.42 and 0.56 cycles per second**. The notch remains fixed and the outer wing tips ease through the movement. This creates a small, smooth flex in the original silhouette while preventing the prior failure mode: a whole-bird or side-edge door hinge.

The hero and two support birds receive different timing offsets. Their body path remains the existing curved glide trajectory. No filled bodies, new wing lines, generated bird forms, or additional marks are introduced.
