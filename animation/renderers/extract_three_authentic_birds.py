from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src=Path('/home/ubuntu/birds_exact_pixels/extracted_bird_candidates')
out=Path('/home/ubuntu/birds_exact_pixels/authentic_extracted_pose_study')
out.mkdir(parents=True,exist_ok=True)
inputs=[
    ('A_source_rightside',src/'rightside_hero_center.png'),
    ('B_source_twolines',src/'twolines_hero_topright.png'),
    ('C_source_linesone',src/'linesone_hero_lowright.png'),
]
INK=(4,58,120,255)
assets=[]
for name,path in inputs:
    rgba=np.asarray(Image.open(path).convert('RGBA'))
    alpha=rgba[:,:,3]
    count, labels, stats, _=cv2.connectedComponentsWithStats((alpha>0).astype(np.uint8),8)
    largest=int(np.argmax(stats[1:,cv2.CC_STAT_AREA]))+1
    x,y,w,h,_=stats[largest]
    pad=22
    mask=labels==largest
    mono=np.zeros_like(rgba)
    mono[mask]=INK
    raw=np.zeros_like(rgba)
    raw[mask]=rgba[mask]
    box=(max(0,x-pad),max(0,y-pad),min(rgba.shape[1],x+w+pad),min(rgba.shape[0],y+h+pad))
    raw_crop=Image.fromarray(raw,'RGBA').crop(box)
    mono_crop=Image.fromarray(mono,'RGBA').crop(box)
    raw_crop.save(out/f'{name}_original_color.png')
    mono_crop.save(out/f'{name}_monochrome.png')
    assets.append((name,mono_crop,raw_crop.size))

# White board is deliberately a source-extraction study, not a fabricated motion sheet.
W,H=1672,700
board=Image.new('RGB',(W,H),'white')
draw=ImageDraw.Draw(board)
font=ImageFont.load_default()
for i,(name,asset,size) in enumerate(assets):
    x=60+i*545
    draw.text((x,54),name.replace('_',' ').upper(),fill=(80,98,118),font=font)
    draw.line([(x,88),(x+455,88)],fill=(216,228,241),width=1)
    view=asset.copy()
    view.thumbnail((470,370))
    board.paste(view,(x+(470-view.width)//2,180),view)
    draw.line([(x,585),(x+455,585)],fill=(232,238,246),width=1)
    draw.text((x,615),f'original component pixels · {size[0]}×{size[1]} crop',fill=(105,121,140),font=font)
draw.text((60,665),'All three silhouettes are extracted source contours converted to one ink color. No silhouette geometry was redrawn.',fill=(82,102,125),font=font)
board.save(out/'three_authentic_extracted_bird_study.png')
print(f'Wrote extracted study to {out}')
