from PIL import Image
from collections import deque
from pathlib import Path
import numpy as np

src = Path('/home/ubuntu/upload/BGbnlRIGHTSIDE.png')
out = Path('/home/ubuntu/birds_exact_pixels')
out.mkdir(parents=True, exist_ok=True)
img = Image.open(src).convert('RGB')
a = np.asarray(img)
r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]

# Original illustration uses blue ink on white. Preserve only visibly colored/dark ink.
ink_strength = 255 - np.minimum(np.minimum(r, g), b)
blue_bias = b.astype(np.int16) - r.astype(np.int16)
mask = (ink_strength >= 18) & (blue_bias >= 3)
# Include very dark navy strokes even where channels are close.
mask |= (ink_strength >= 90)

h, w = mask.shape
seen = np.zeros_like(mask, dtype=bool)
components = []
for y in range(h):
    for x in range(w):
        if not mask[y, x] or seen[y, x]:
            continue
        q = [(y, x)]
        seen[y, x] = True
        pts = []
        while q:
            cy, cx = q.pop()
            pts.append((cy, cx))
            for ny in range(max(0, cy - 1), min(h, cy + 2)):
                for nx in range(max(0, cx - 1), min(w, cx + 2)):
                    if mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        ys = [p[0] for p in pts]
        xs = [p[1] for p in pts]
        components.append({
            'count': len(pts),
            'x0': min(xs), 'y0': min(ys), 'x1': max(xs), 'y1': max(ys),
            'width': max(xs) - min(xs) + 1,
            'height': max(ys) - min(ys) + 1,
        })
components.sort(key=lambda c: c['count'], reverse=True)

report = [f'Image: {w}x{h}', f'Ink pixels: {int(mask.sum())}', f'Components: {len(components)}', '', 'rank,count,x0,y0,x1,y1,width,height']
for rank, c in enumerate(components[:200], 1):
    report.append(','.join(map(str, [rank, c['count'], c['x0'], c['y0'], c['x1'], c['y1'], c['width'], c['height']])))
(out / 'component_report.csv').write_text('\n'.join(report) + '\n')
print('\n'.join(report[:81]))
