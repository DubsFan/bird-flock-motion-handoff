from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import math

ROOT=Path('/home/ubuntu/birds_exact_pixels')
OUT=ROOT/'forward_wingbeat_pose_proof'
OUT.mkdir(parents=True,exist_ok=True)
PAD=78
source=Image.open(ROOT/'authentic_extracted_pose_study/C_source_linesone_monochrome.png').convert('RGBA')
bbox=source.getbbox(); source=source.crop(bbox)
base=Image.new('RGBA',(source.width+2*PAD,source.height+2*PAD),(0,0,0,0))
base.alpha_composite(source,(PAD,PAD))
px=PAD+source.width*0.53
py=PAD+source.height*0.66
arr=np.asarray(base); alpha=arr[:,:,3]
xx=np.arange(base.width)[None,:]; yy=np.arange(base.height)[:,None]
left_mask=(xx<=px+8)&(alpha>0)
right_mask=(xx>=px-8)&(alpha>0)
center_mask=(np.hypot(xx-px,yy-py)<=22)&(alpha>0)
left_arr=np.zeros_like(arr); left_arr[left_mask]=arr[left_mask]
right_arr=np.zeros_like(arr); right_arr[right_mask]=arr[right_mask]
center_arr=np.zeros_like(arr); center_arr[center_mask]=arr[center_mask]

def pose(label, phase):
    s=math.sin(phase); up=max(s,0); down=max(-s,0)
    left=Image.fromarray(left_arr,'RGBA').rotate(-24*up+16*down,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    right=Image.fromarray(right_arr,'RGBA').rotate(24*up-20*down,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    result=Image.new('RGBA',base.size,(0,0,0,0))
    result.alpha_composite(left)
    result.alpha_composite(right)
    result.alpha_composite(Image.fromarray(center_arr,'RGBA'))
    result.save(OUT/f'{label.lower().replace(" ","_")}.png')
    return result

states=[('RECOVERY UPSTROKE',math.pi/2),('MID-GLIDE',0),('POWER DOWNSTROKE',-math.pi/2)]
assets=[(label,pose(label,phase)) for label,phase in states]
board=Image.new('RGB',(1672,660),'white'); draw=ImageDraw.Draw(board); font=ImageFont.load_default()
for i,(label,asset) in enumerate(assets):
    x=38+i*550
    draw.text((x+14,45),label,fill=(70,89,110),font=font)
    draw.line([(x+14,82),(x+505,82)],fill=(215,228,241),width=1)
    view=asset.copy(); view.thumbnail((500,400))
    board.paste(view,(x+(510-view.width)//2,145),view)
    draw.line([(x+14,565),(x+505,565)],fill=(232,238,246),width=1)
draw.text((55,610),'Fixed-position source-pixel proof: leading tip rises on recovery; both wing masses sweep down and rearward on power stroke.',fill=(85,103,125),font=font)
board.save(OUT/'forward_wingbeat_three_state_proof.png')
print('Wrote forward wingbeat proof')
