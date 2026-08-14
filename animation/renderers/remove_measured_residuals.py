from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

src = Path('/home/ubuntu/birds_exact_pixels/bird_only_component_candidate.png')
out = Path('/home/ubuntu/birds_exact_pixels')
im = Image.open(src).convert('RGBA')
alpha = im.getchannel('A')
d = ImageDraw.Draw(alpha)

# Exact residual non-bird line segments measured in remaining_line_report.csv.
# Each segment is removed from alpha only. Surviving RGB pixels are byte-for-byte original source pixels.
segments = [
    ((1490,501),(1573,464),13),
    ((1459,520),(1519,489),13),
    ((1522,488),(1581,461),13),
    ((1438,530),(1478,507),13),
    ((1419,545),(1456,522),13),
    ((1382,569),(1424,539),13),
    ((1552,475),(1582,463),13),
    ((1327,698),(1400,728),13),
    ((1328,697),(1400,726),13),
]
for p1,p2,width in segments:
    d.line([p1,p2], fill=0, width=width)

im.putalpha(alpha)
im.save(out/'birds_only_original_pixels_v2.png')
arr=np.asarray(im)
mask=arr[:,:,3]>0
preview=np.full((arr.shape[0],arr.shape[1],3),255,dtype=np.uint8)
preview[mask]=(0,34,110)
Image.fromarray(preview,'RGB').save(out/'birds_only_original_pixels_v2_diagnostic.png')
print(f'Retained original pixels: {int(mask.sum())}')
