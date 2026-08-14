from pathlib import Path
from PIL import Image
import numpy as np
import math
import subprocess

ROOT=Path('/home/ubuntu/birds_exact_pixels')
ASSET=ROOT/'authentic_extracted_pose_study'
W,H,FPS,DURATION=1672,941,24,12.0
FRAMES=int(FPS*DURATION)
PAD=78

raw={
    'hero': Image.open(ASSET/'C_source_linesone_monochrome.png').convert('RGBA'),
    'support_a': Image.open(ASSET/'A_source_rightside_monochrome.png').convert('RGBA'),
    'support_b': Image.open(ASSET/'B_source_twolines_monochrome.png').convert('RGBA'),
}
PIVOT_RATIO={'hero':(0.53,0.66),'support_a':(0.49,0.62),'support_b':(0.42,0.61)}


def trim(image):
    bbox=image.getbbox()
    return image.crop(bbox) if bbox else image


def pad(image):
    layer=Image.new('RGBA',(image.width+2*PAD,image.height+2*PAD),(0,0,0,0))
    layer.alpha_composite(image,(PAD,PAD))
    return layer

raw={k:trim(v) for k,v in raw.items()}
sources={k:pad(v) for k,v in raw.items()}
pivots={k:(PAD+raw[k].width*PIVOT_RATIO[k][0],PAD+raw[k].height*PIVOT_RATIO[k][1]) for k in raw}


def ease(u):
    u=max(0.0,min(1.0,u))
    return u*u*(3-2*u)


def directional_wingbeat(name, phase, strength):
    base=sources[name]
    px,py=pivots[name]
    arr=np.asarray(base)
    alpha=arr[:,:,3]
    xx=np.arange(base.width)[None,:]
    yy=np.arange(base.height)[:,None]
    # Source pixels are split at their original center notch. The circular notch itself is restored unchanged.
    left_mask=(xx<=px+8)&(alpha>0)
    right_mask=(xx>=px-8)&(alpha>0)
    center_mask=(np.hypot(xx-px,yy-py)<=22)&(alpha>0)
    left_arr=np.zeros_like(arr); left_arr[left_mask]=arr[left_mask]
    right_arr=np.zeros_like(arr); right_arr[right_mask]=arr[right_mask]
    center_arr=np.zeros_like(arr); center_arr[center_mask]=arr[center_mask]
    left=Image.fromarray(left_arr,'RGBA')
    right=Image.fromarray(right_arr,'RGBA')
    s=math.sin(phase)
    up=max(s,0.0)
    down=max(-s,0.0)
    # Upstroke: tips rise above the fixed notch. Downstroke: tips sweep down and slightly rearward (left).
    # Rotation assists shape preservation; translated source-pixel regions create visible vertical flight-direction travel.
    left_angle=(-34.0*up + 30.0*down)*strength
    right_angle=(34.0*up - 32.0*down)*strength
    left_dx=0
    left_dy=0
    right_dx=0
    right_dy=0
    left=left.rotate(left_angle,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    right=right.rotate(right_angle,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    result=Image.new('RGBA',base.size,(0,0,0,0))
    result.alpha_composite(left,(left_dx,left_dy))
    result.alpha_composite(right,(right_dx,right_dy))
    result.alpha_composite(Image.fromarray(center_arr,'RGBA'))
    return result


def place(canvas,image,center,width,bank):
    scale=width/image.width
    scaled=image.resize((max(1,int(image.width*scale)),max(1,int(image.height*scale))),Image.Resampling.LANCZOS)
    banked=scaled.rotate(bank,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.alpha_composite(banked,(int(center[0]-banked.width/2),int(center[1]-banked.height/2)))

cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
     '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'three_bird_reversed_high_wingbeat_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(FRAMES):
    t=frame/FPS
    canvas=Image.new('RGBA',(W,H),(0,0,0,0))
    if 1.0<=t<=11.0:
        u=ease((t-1.0)/10.0)
        hero=directional_wingbeat('hero',2*math.pi*0.28*t+0.15,1.00)
        hx=W+260-(W+520)*u
        hy=555-105*math.sin(math.pi*u)+7*math.sin(2*math.pi*0.13*t)
        place(canvas,hero,(hx,hy),430,-1.5*math.sin(math.pi*u))
        a=directional_wingbeat('support_a',2*math.pi*0.32*t+1.7,0.75)
        ax=W+100-(W+280)*u
        ay=268-56*math.sin(math.pi*u+0.20)+5*math.sin(2*math.pi*0.15*t+1.3)
        place(canvas,a,(ax,ay),175,-1.1*math.sin(math.pi*u+0.15))
        b=directional_wingbeat('support_b',2*math.pi*0.25*t+2.8,0.85)
        bx=W+240-(W+430)*u
        by=666-76*math.sin(math.pi*u-0.25)+4*math.sin(2*math.pi*0.14*t+2.2)
        place(canvas,b,(bx,by),235,1.2*math.sin(math.pi*u-0.2))
    proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0:
    raise SystemExit('render failed')
print('Wrote three_bird_reversed_high_wingbeat_prores4444.mov')
