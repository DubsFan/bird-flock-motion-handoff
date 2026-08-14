from pathlib import Path
from PIL import Image
import numpy as np
import math
import subprocess

ROOT=Path('/home/ubuntu/birds_exact_pixels')
ASSET=ROOT/'orientation_locked_flock_assets'
W,H,FPS,DURATION=1672,941,24,12.0
FRAMES=int(FPS*DURATION); PAD=82

raw={
    'C': Image.open(ASSET/'C_leftward.png').convert('RGBA'),
    'A': Image.open(ASSET/'A_leftward.png').convert('RGBA'),
    'B': Image.open(ASSET/'B_leftward.png').convert('RGBA'),
    'D': Image.open(ASSET/'D_leftward_mirrored.png').convert('RGBA'),
}
pivot={'C':(0.53,0.66),'A':(0.49,0.62),'B':(0.42,0.61),'D':(0.50,0.66)}

def trim(im):
    box=im.getbbox(); return im.crop(box) if box else im

def prep(im,ratio):
    im=trim(im); base=Image.new('RGBA',(im.width+2*PAD,im.height+2*PAD),(0,0,0,0)); base.alpha_composite(im,(PAD,PAD))
    px=PAD+im.width*ratio[0]; py=PAD+im.height*ratio[1]
    arr=np.asarray(base); a=arr[:,:,3]; xx=np.arange(base.width)[None,:]; yy=np.arange(base.height)[:,None]
    lm=(xx<=px+8)&(a>0); rm=(xx>=px-8)&(a>0); cm=(np.hypot(xx-px,yy-py)<=22)&(a>0)
    left=np.zeros_like(arr); left[lm]=arr[lm]
    right=np.zeros_like(arr); right[rm]=arr[rm]
    center=np.zeros_like(arr); center[cm]=arr[cm]
    return base,(px,py),Image.fromarray(left,'RGBA'),Image.fromarray(right,'RGBA'),Image.fromarray(center,'RGBA')
sources={k:prep(raw[k],pivot[k]) for k in raw}

def wingbeat(key,phase,strength):
    base,(px,py),left,right,center=sources[key]
    s=math.sin(phase); up=max(s,0.0); down=max(-s,0.0)
    la=(-34*up+30*down)*strength; ra=(34*up-32*down)*strength
    left=left.rotate(la,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    right=right.rotate(ra,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    out=Image.new('RGBA',base.size,(0,0,0,0)); out.alpha_composite(left); out.alpha_composite(right); out.alpha_composite(center)
    return out

def clamp(v): return max(0.0,min(1.0,v))
def ease(v):
    v=clamp(v); return v*v*(3-2*v)
def route(u):
    # One large flock arc: lower-right entry, high middle sweep, gentle lower-left exit.
    x=W+480-(W+960)*u
    y=630-270*math.sin(math.pi*u)-60*math.sin(2*math.pi*u)
    return x,y
def route_bank(u):
    e=.001; x0,y0=route(clamp(u-e)); x1,y1=route(clamp(u+e))
    return max(-10,min(10,math.degrees(math.atan2(y1-y0,-(x1-x0)))))
def place(canvas,im,center,width,bank):
    sc=width/im.width; im=im.resize((max(1,int(im.width*sc)),max(1,int(im.height*sc))),Image.Resampling.LANCZOS)
    im=im.rotate(bank,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.alpha_composite(im,(int(center[0]-im.width/2),int(center[1]-im.height/2)))

# key, follow-lag, vertical relative location, width, cycle Hz, phase, wing strength, route-side amplitude
birds=[
    ('C',0.00,   0,430,0.25,0.15,1.00,  0), # lead
    ('B',0.055,-72,225,0.31,2.10,0.84,-28),
    ('C',0.085, 80,250,0.22,4.00,0.74, 34),
    ('A',0.115,-150,170,0.33,1.25,0.72,-44),
    ('D',0.145,-15,155,0.27,3.20,0.66, 52),
    ('D',0.170,155,130,0.30,5.15,0.60, 38),
]
cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
     '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'dynamic_natural_flock_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(FRAMES):
    t=frame/FPS; canvas=Image.new('RGBA',(W,H),(0,0,0,0))
    if 1.0<=t<=11.0:
        u=ease((t-1.0)/10.0)
        stretch=math.sin(math.pi*u)  # zero at entry/exit so all birds clear together
        # Draw far followers first, then the leader.
        for key,lag,rel_y,width,hz,phase,strength,side in reversed(birds):
            fu=clamp(u-lag*stretch)
            x,y=route(fu)
            # Follower routes widen naturally through the middle then reconverge at exit.
            x+=side*0.20*stretch*math.sin(2*math.pi*u+phase)
            y+=rel_y*stretch + side*0.35*stretch*math.cos(2*math.pi*u+phase)
            minor=5*math.sin(2*math.pi*0.14*t+phase)
            bird=wingbeat(key,2*math.pi*hz*t+phase,strength)
            place(canvas,bird,(x,y+minor),width,route_bank(fu)+0.7*math.sin(2*math.pi*0.12*t+phase))
    proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0: raise SystemExit('render failed')
print('Wrote dynamic_natural_flock_prores4444.mov')
