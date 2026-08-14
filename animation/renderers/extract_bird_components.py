from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image

src = Path('/home/ubuntu/upload/BGbnlRIGHTSIDE.png')
out = Path('/home/ubuntu/birds_exact_pixels')
out.mkdir(parents=True, exist_ok=True)
rgb = np.asarray(Image.open(src).convert('RGB'))
r, g, b = rgb[:,:,0], rgb[:,:,1], rgb[:,:,2]

# More conservative threshold rejects the nearly-white background construction lines.
strength = 255 - np.minimum(np.minimum(r, g), b)
blue = b.astype(np.int16) - r.astype(np.int16)
mask = ((strength >= 48) & (blue >= 5)) | (strength >= 105)
h, w = mask.shape
seen = np.zeros_like(mask, bool)
components = []
for y in range(h):
    for x in range(w):
        if not mask[y, x] or seen[y, x]:
            continue
        stack = [(y,x)]; seen[y,x] = True; pts=[]
        while stack:
            cy,cx = stack.pop(); pts.append((cy,cx))
            for ny in range(max(0,cy-1), min(h,cy+2)):
                for nx in range(max(0,cx-1), min(w,cx+2)):
                    if mask[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=True; stack.append((ny,nx))
        ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
        components.append((pts,min(xs),min(ys),max(xs),max(ys)))

keep = np.zeros_like(mask, bool)
selected=[]
for pts,x0,y0,x1,y1 in components:
    count=len(pts); bw=x1-x0+1; bh=y1-y0+1
    ratio=bh/bw
    # Compact, non-boundary, V-shaped/drawn-bird candidates. This rejects the long parallel construction lines.
    is_candidate=(
        count >= 18 and count <= 1650 and
        bw >= 14 and bw <= 285 and bh >= 5 and bh <= 150 and
        ratio >= 0.10 and ratio <= 1.20 and
        x0 >= 720 and x1 <= 1640 and y0 >= 70 and y1 <= 885
    )
    if is_candidate:
        for py,px in pts: keep[py,px]=True
        selected.append((count,x0,y0,x1,y1,bw,bh,round(ratio,3)))

rgba=np.zeros((h,w,4), dtype=np.uint8)
rgba[:,:,:3]=rgb
rgba[:,:,3]=np.where(keep,255,0).astype(np.uint8)
Image.fromarray(rgba,'RGBA').save(out/'bird_only_component_candidate.png')

lines=['count,x0,y0,x1,y1,width,height,height_width_ratio']
lines += [','.join(map(str,row)) for row in sorted(selected, reverse=True)]
(out/'selected_bird_components.csv').write_text('\n'.join(lines)+'\n')
print(f'Selected components: {len(selected)}')
print(f'Original pixel count retained: {int(keep.sum())}')
print('\n'.join(lines[:41]))
