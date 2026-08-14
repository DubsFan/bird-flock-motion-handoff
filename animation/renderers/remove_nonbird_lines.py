from pathlib import Path
import csv
import math
import numpy as np
from PIL import Image
import cv2

src = Path('/home/ubuntu/upload/BGbnlRIGHTSIDE.png')
out = Path('/home/ubuntu/birds_exact_pixels')
out.mkdir(parents=True, exist_ok=True)

rgb = np.array(Image.open(src).convert('RGB'))
gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
# Preserve the original ink pixels only, retaining their exact original RGB values.
ink = (255 - gray >= 18).astype(np.uint8) * 255
edges = cv2.Canny(ink, 40, 120)
lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=55, minLineLength=115, maxLineGap=18)

remove = np.zeros(ink.shape, dtype=np.uint8)
rows = []
if lines is not None:
    for line in lines.reshape(-1, 4):
        x1, y1, x2, y2 = map(int, line)
        length = math.hypot(x2 - x1, y2 - y1)
        angle = math.degrees(math.atan2(y2-y1, x2-x1))
        # Lines this long are the parallel architectural/background strokes.
        # Use a narrow 5 px band so curved bird strokes remain original pixels.
        if length >= 115:
            cv2.line(remove, (x1, y1), (x2, y2), 255, thickness=5, lineType=cv2.LINE_AA)
            rows.append((x1, y1, x2, y2, round(length, 1), round(angle, 1)))

# Remove detected long straight lines while keeping every other original ink pixel.
keep = (ink > 0) & (remove == 0)
rgba = np.zeros((rgb.shape[0], rgb.shape[1], 4), dtype=np.uint8)
rgba[:, :, :3] = rgb
rgba[:, :, 3] = np.where(keep, 255, 0).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(out / 'bird_candidates_after_line_removal.png')

with (out / 'removed_line_candidates.csv').open('w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['x1','y1','x2','y2','length_px','angle_deg'])
    writer.writerows(rows)

print(f'Detected long line candidates: {len(rows)}')
print(f'Ink pixels retained: {int(keep.sum())}')
