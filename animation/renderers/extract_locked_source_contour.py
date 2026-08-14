from pathlib import Path
import cv2
import numpy as np
from PIL import Image

root=Path('/home/ubuntu/birds_exact_pixels/extracted_bird_candidates')
source=root/'linesone_hero_lowright.png'
rgba=np.asarray(Image.open(source).convert('RGBA'))
alpha=rgba[:,:,3]
count, labels, stats, _=cv2.connectedComponentsWithStats((alpha>0).astype(np.uint8),8)
areas=stats[1:,cv2.CC_STAT_AREA]
label=int(np.argmax(areas))+1
x,y,w,h,_=stats[label]
pad=24
mask=(labels==label)
mono=np.zeros_like(rgba)
mono[mask,0]=4
mono[mask,1]=58
mono[mask,2]=120
mono[mask,3]=255
raw=np.zeros_like(rgba)
raw[mask]=rgba[mask]
box=(max(0,x-pad),max(0,y-pad),min(rgba.shape[1],x+w+pad),min(rgba.shape[0],y+h+pad))
Image.fromarray(raw,'RGBA').crop(box).save(root/'locked_source_contour_original_color.png')
Image.fromarray(mono,'RGBA').crop(box).save(root/'locked_source_contour_monochrome.png')
# White review at 3× native crop retains exact source contour with space around it.
review=Image.new('RGB',((box[2]-box[0])*3,(box[3]-box[1])*3),'white')
asset=Image.open(root/'locked_source_contour_monochrome.png')
asset=asset.resize((asset.width*3,asset.height*3),Image.Resampling.NEAREST)
review.paste(asset,(0,0),asset)
review.save(root/'locked_source_contour_review.png')
print(f'locked_component_label={label}; bbox={x},{y},{w},{h}; crop={box}')
