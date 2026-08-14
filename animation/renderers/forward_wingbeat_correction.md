# Directional Wingbeat Correction

The fixed-position proof exposed a real defect: translating the split wing regions created visible gaps around the center notch. That is unacceptable.

The correction retains only larger rotation about the **original center notch**. Each source-pixel wing region remains attached at that point throughout the cycle. The upstroke and downstroke remain directionally distinct through rotational angle, but no translation or shear is applied. The center-notch source pixels are composited last as a continuous joint.
