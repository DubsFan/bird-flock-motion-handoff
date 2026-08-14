from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

base = Path('/home/ubuntu/birds_exact_pixels/bird_only_component_candidate.png')
out_dir = Path('/home/ubuntu/birds_exact_pixels')
im = Image.open(base).convert('RGBA')
alpha = im.getchannel('A')
draw = ImageDraw.Draw(alpha)

# Coordinates are limited to the residual non-bird construction strokes observed in the mask diagnostic.
# This does not redraw, recolor, or modify any remaining original image pixels.
exclusions = [
    ((1282, 536), (1478, 430), 9),  # long diagonal background curve at right center
    ((1240, 651), (1312, 681), 9),  # lower-right construction slash
    ((1090, 305), (1130, 290), 8),  # small isolated non-bird dash near center-right
    ((1080, 649), (1110, 660), 8),  # small isolated non-bird dash lower center
]
for start, end, width in exclusions:
    draw.line([start, end], fill=0, width=width)

im.putalpha(alpha)
im.save(out_dir / 'birds_only_original_pixels.png')

arr = np.asarray(im)
mask = arr[:,:,3] > 0
preview = np.full((arr.shape[0], arr.shape[1], 3), 255, dtype=np.uint8)
preview[mask] = (0, 34, 110)
Image.fromarray(preview, 'RGB').save(out_dir / 'birds_only_original_pixels_diagnostic.png')
print(f'Retained original pixels: {int(mask.sum())}')
print('Wrote birds_only_original_pixels.png and birds_only_original_pixels_diagnostic.png')
