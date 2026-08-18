# Smoke cloud baseline prompts

Generated with the built-in image generator on 2026-08-18. These are visual-direction candidates, not sequential animation frames.

## `smoke-cloud-turbulent-v1.png`

Create one isolated, realistic cloud of smoke for the neutral keyframe of a future 32–60 frame Murmur animation. The cloud should feel like a living murmuration made of smoke: one cohesive, horizontally elongated silver-gray entity composed of interlocking curls, soft billows, wisps, and subtle vortices. Keep the central third denser but translucent, taper both sides into airy tendrils, balance the artwork around a fixed center anchor, and leave generous transparent padding on every side. Use high-end photorealistic volumetric VFX detail and neutral studio-like illumination. Deliver genuine transparent alpha with no matte, background, clipping, text, watermark, birds, animals, fire, sparks, explosion, mushroom cloud, dust, steam plume, colored ink, faces, objects, or scenery.

## `smoke-cloud-diffuse-v1.png`

Create one isolated photorealistic cloud of airborne smoke or vapor that feels capable of flock-like collective motion. It is a calm neutral keyframe, not a finished scene. Make one cohesive, horizontally elongated cloud with a compact but partially translucent center plus flowing lobes, thin vapor sheets, curling eddies, internal gaps, and long dissolving wisps. Use organic asymmetry and many small turbulent structures moving as one larger body. Keep it centered around a stable midpoint on a wide canvas with generous transparent padding. Use neutral pearl and medium gray only. The material must be gaseous and fluid, not fibrous, woolly, cotton-like, painted, or sculpted. Deliver actual RGBA transparency with no visible or baked checkerboard, matte, background, clipping, text, watermark, bird shapes, animals, faces, fire, embers, explosion, mushroom cloud, pollution plume, dust, steam jet, colored ink, liquid splash, scenery, shadow, or objects.

## Initial QA

- Both candidates are 1672 px wide and exceed Murmur's preferred 1600 px source width.
- Both candidates decode as 8-bit RGBA PNGs with genuine transparency and soft partial alpha: turbulent is 58.1% fully transparent / 41.9% partially transparent; diffuse is 56.8% / 43.2%.
- An intermediate refinement was rejected because it baked a checkerboard into an opaque RGB image.
- Anchor consistency, temporal identity, padding across extremes, and normal-speed motion remain to be validated after one visual direction is selected and expanded into tracks.
