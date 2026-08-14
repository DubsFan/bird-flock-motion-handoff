from pathlib import Path
from PIL import Image
import numpy as np
import math
import subprocess

ROOT=Path('/home/ubuntu/birds_exact_pixels')
ASSET=ROOT/'orientation_locked_flock_assets'
W,H,FPS,DURATION=1672,941,24,12.0
FRAMES=int(FPS*DURATION)
PAD=82

raw={
    'C': Image.open(ASSET/'C_leftward.png').convert('RGBA'),
    'A': Image.open(ASSET/'A_leftward.png').convert('RGBA'),
    'B': Image.open(ASSET/'B_leftward.png').convert('RGBA'),
    'D': Image.open(ASSET/'D_leftward_mirrored.png').convert('RGBA'),
}
pivot_ratio={'C':(0.53,0.66),'A':(0.49,0.62),'B':(0.42,0.61),'D':(0.50,0.66)}

def trim(image):
    bbox=image.getbbox(); return image.crop(bbox) if bbox else image

def prepare(image,ratio):
    image=trim(image)
    base=Image.new('RGBA',(image.width+2*PAD,image.height+2*PAD),(0,0,0,0))
    base.alpha_composite(image,(PAD,PAD))
    px=PAD+image.width*ratio[0]; py=PAD+image.height*ratio[1]
    arr=np.asarray(base); alpha=arr[:,:,3]
    xx=np.arange(base.width)[None,:]; yy=np.arange(base.height)[:,None]
    lm=(xx<=px+8)&(alpha>0); rm=(xx>=px-8)&(alpha>0); cm=(np.hypot(xx-px,yy-py)<=22)&(alpha>0)
    left=np.zeros_like(arr); left[lm]=arr[lm]
    right=np.zeros_like(arr); right[rm]=arr[rm]
    center=np.zeros_like(arr); center[cm]=arr[cm]
    return base,(px,py),Image.fromarray(left,'RGBA'),Image.fromarray(right,'RGBA'),Image.fromarray(center,'RGBA')

sources={k:prepare(raw[k],pivot_ratio[k]) for k in raw}

def wingbeat(key,phase,strength):
    base,(px,py),left,right,center=sources[key]
    s=math.sin(phase); up=max(s,0.0); down=max(-s,0.0)
    # Continuous high-excursion beat around the original source notch.
    la=(-34*up+30*down)*strength
    ra=(34*up-32*down)*strength
    left=left.rotate(la,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    right=right.rotate(ra,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    result=Image.new('RGBA',base.size,(0,0,0,0))
    result.alpha_composite(left); result.alpha_composite(right); result.alpha_composite(center)
    return result

def ease(u):
    u=max(0.0,min(1.0,u)); return u*u*(3-2*u)

def place(canvas,image,center,width,bank):
    scale=width/image.width
    scaled=image.resize((max(1,int(image.width*scale)),max(1,int(image.height*scale))),Image.Resampling.LANCZOS)
    rot=scaled.rotate(bank,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.alpha_composite(rot,(int(center[0]-rot.width/2),int(center[1]-rot.height/2)))

# All birds share one group arc. Positive x offsets trail behind a leftward-moving leader.
formation=[
    ('C',  0,   0,430,0.00,1.00),
    ('B',145, -88,225,0.32,0.84),
    ('C',175,  95,250,0.58,0.74),
    ('A',280,-175,170,0.85,0.72),
    ('D',330, -35,155,1.10,0.66),
    ('D',300, 185,130,1.32,0.60),
]

cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
     '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'coordinated_natural_flock_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(FRAMES):
    t=frame/FPS
    canvas=Image.new('RGBA',(W,H),(0,0,0,0))
    if 1.0<=t<=11.0:
        u=ease((t-1.0)/10.0)
        gx=W+470-(W+950)*u
        gy=515-105*math.sin(math.pi*u)
        group_bank=-2.2*math.sin(math.pi*u)
        for idx,(key,dx,dy,width,phase,strength) in enumerate(reversed(formation)):
            # Shared cadence with small phase difference; gentle follower drift preserves grouping.
            bob_x=4*math.sin(2*math.pi*0.18*t+phase)
            bob_y=7*math.sin(2*math.pi*0.20*t+phase)
            bird=wingbeat(key,2*math.pi*0.28*t+phase,strength)
            place(canvas,bird,(gx+dx+bob_x,gy+dy+bob_y),width,group_bank+0.35*math.sin(2*math.pi*0.14*t+phase))
    proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0: raise SystemExit('render failed')
print('Wrote coordinated_natural_flock_prores4444.mov')
