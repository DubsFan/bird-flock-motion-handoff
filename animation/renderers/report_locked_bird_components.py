from pathlib import Path
import cv2
import numpy as np
from PIL import Image

path=Path('/home/ubuntu/birds_exact_pixels/extracted_bird_candidates/linesone_hero_lowright.png')
alpha=np.asarray(Image.open(path).convert('RGBA'))[:,:,3]
count, labels, stats, centroids=cv2.connectedComponentsWithStats((alpha>0).astype(np.uint8),8)
rows=[]
for i in range(1,count):
    x,y,w,h,area=stats[i]
    cx,cy=centroids[i]
    rows.append((area,x,y,w,h,round(cx,1),round(cy,1)))
rows.sort(reverse=True)
text='area,x,y,width,height,cx,cy\n'+'\n'.join(','.join(map(str,row)) for row in rows)+'\n'
out=path.parent/'linesone_component_report.csv'
out.write_text(text)
print(text)
