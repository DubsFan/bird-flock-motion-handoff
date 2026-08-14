from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import math

src = Path('/home/ubuntu/birds_exact_pixels/birds_only_original_pixels.png')
out = Path('/home/ubuntu/birds_exact_pixels/remaining_line_report.csv')
a = np.asarray(Image.open(src).convert('RGBA'))
alpha = a[:,:,3]
edges = cv2.Canny(alpha, 40, 120)
lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=18, minLineLength=25, maxLineGap=8)
rows=[]
if lines is not None:
    for x1,y1,x2,y2 in lines.reshape(-1,4):
        length=math.hypot(x2-x1,y2-y1)
        angle=math.degrees(math.atan2(y2-y1,x2-x1))
        if length >= 24:
            rows.append((int(x1),int(y1),int(x2),int(y2),round(length,1),round(angle,1)))
rows.sort(key=lambda r:r[4], reverse=True)
out.write_text('x1,y1,x2,y2,length_px,angle_deg\n'+'\n'.join(','.join(map(str,r)) for r in rows)+'\n')
print('\n'.join(['x1,y1,x2,y2,length_px,angle_deg']+ [','.join(map(str,r)) for r in rows[:100]]))
