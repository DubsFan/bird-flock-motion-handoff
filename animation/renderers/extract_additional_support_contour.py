from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT=Path('/home/ubuntu/birds_exact_pixels')
src=ROOT/'extracted_bird_candidates'/'leftside_hero_midleft.png'
out=ROOT/'authentic_extracted_pose_study'
INK=(4,58,120,255)
rgba=np.asarray(Image.open(src).convert('RGBA'))
alpha=rgba[:,:,3]
count, labels, stats, _=cv2.connectedComponentsWithStats((alpha>0).astype(np.uint8),8)
largest=int(np.argmax(stats[1:,cv2.CC_STAT_AREA]))+1
x,y,w,h,_=stats[largest]
pad=22
mask=labels==largest
mono=np.zeros_like(rgba); mono[mask]=INK
raw=np.zeros_like(rgba); raw[mask]=rgba[mask]
box=(max(0,x-pad),max(0,y-pad),min(rgba.shape[1],x+w+pad),min(rgba.shape[0],y+h+pad))
Image.fromarray(mono,'RGBA').crop(box).save(out/'D_source_leftside_monochrome.png')
Image.fromarray(raw,'RGBA').crop(box).save(out/'D_source_leftside_original_color.png')
print('Wrote D_source_leftside_monochrome.png')
