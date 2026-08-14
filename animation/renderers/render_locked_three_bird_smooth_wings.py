from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import math
import subprocess

ROOT=Path('/home/ubuntu/birds_exact_pixels')
ASSET=ROOT/'authentic_extracted_pose_study'
W,H,FPS,DURATION=1672,941,24,12.0
FRAMES=int(FPS*DURATION)
PAD=60

raw={
    'hero': Image.open(ASSET/'C_source_linesone_monochrome.png').convert('RGBA'),
    'support_a': Image.open(ASSET/'A_source_rightside_monochrome.png').convert('RGBA'),
    'support_b': Image.open(ASSET/'B_source_twolines_monochrome.png').convert('RGBA'),
}


def trim(img):
    box=img.getbbox()
    return img.crop(box) if box else img

# Pivot values were measured against the extracted original crops: they point to the artist-drawn center notch.
PIVOT_RATIO={
    'hero': (0.53,0.66),
    'support_a': (0.49,0.62),
    'support_b': (0.42,0.61),
}
raw={name:trim(img) for name,img in raw.items()}


def padded(img):
    layer=Image.new('RGBA',(img.width+2*PAD,img.height+2*PAD),(0,0,0,0))
    layer.alpha_composite(img,(PAD,PAD))
    return layer

sources={name:padded(img) for name,img in raw.items()}
pivots={name:(PAD+raw[name].width*PIVOT_RATIO[name][0],PAD+raw[name].height*PIVOT_RATIO[name][1]) for name in raw}


def ease(u):
    u=max(0.0,min(1.0,u))
    return u*u*(3-2*u)


def flex_source(name, phase, amplitude):
    base=sources[name]
    px,py=pivots[name]
    # Split only existing source pixels. No contours are synthesized.
    alpha=np.asarray(base)[:,:,3]
    xx=np.arange(base.width)[None,:]
    left_mask=(xx <= px+7) & (alpha>0)
    right_mask=(xx >= px-7) & (alpha>0)
    center_mask=(np.hypot(xx-px,np.arange(base.height)[:,None]-py) <= 15) & (alpha>0)
    arr=np.asarray(base)
    left_arr=np.zeros_like(arr); left_arr[left_mask]=arr[left_mask]
    right_arr=np.zeros_like(arr); right_arr[right_mask]=arr[right_mask]
    center_arr=np.zeros_like(arr); center_arr[center_mask]=arr[center_mask]
    # Slow opposing flex, less than three degrees, rotates around the extracted center notch.
    left=Image.fromarray(left_arr,'RGBA').rotate(-amplitude*math.sin(phase),resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    right=Image.fromarray(right_arr,'RGBA').rotate(amplitude*0.82*math.sin(phase+0.18),resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    result=Image.new('RGBA',base.size,(0,0,0,0))
    result.alpha_composite(left)
    result.alpha_composite(right)
    result.alpha_composite(Image.fromarray(center_arr,'RGBA'))
    return result


def place(canvas,img,center,width,bank):
    ratio=width/img.width
    scaled=img.resize((max(1,int(img.width*ratio)),max(1,int(img.height*ratio))),Image.Resampling.LANCZOS)
    banked=scaled.rotate(bank,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.alpha_composite(banked,(int(center[0]-banked.width/2),int(center[1]-banked.height/2)))

cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
     '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'three_bird_dramatic_slow_wings_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(FRAMES):
    t=frame/FPS
    canvas=Image.new('RGBA',(W,H),(0,0,0,0))
    if 1.0 <= t <= 11.0:
        u=ease((t-1.0)/10.0)
        hero=flex_source('hero',2*math.pi*0.25*t+0.2,17.0)
        hero_x=-260+(W+520)*u
        hero_y=555-105*math.sin(math.pi*u)+8*math.sin(2*math.pi*0.20*t)
        place(canvas,hero,(hero_x,hero_y),430*(1+0.018*math.sin(2*math.pi*0.18*t)),2.5*math.sin(math.pi*u))
        a=flex_source('support_a',2*math.pi*0.29*t+1.3,13.0)
        a_x=-100+(W+280)*u
        a_y=268-56*math.sin(math.pi*u+0.20)+5*math.sin(2*math.pi*0.17*t+1.3)
        place(canvas,a,(a_x,a_y),175*(1+0.012*math.sin(2*math.pi*0.15*t+1)),1.6*math.sin(math.pi*u+0.15))
        b=flex_source('support_b',2*math.pi*0.23*t+2.2,15.0)
        b_x=-240+(W+430)*u
        b_y=666-76*math.sin(math.pi*u-0.25)+4*math.sin(2*math.pi*0.15*t+2.2)
        place(canvas,b,(b_x,b_y),235*(1+0.014*math.sin(2*math.pi*0.14*t+2)), -1.8*math.sin(math.pi*u-0.2))
    proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0:
    raise SystemExit('render failed')
print('Wrote three_bird_dramatic_slow_wings_prores4444.mov')
