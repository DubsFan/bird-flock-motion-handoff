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
 'C':Image.open(ASSET/'C_leftward.png').convert('RGBA'),
 'A':Image.open(ASSET/'A_leftward.png').convert('RGBA'),
 'B':Image.open(ASSET/'B_leftward.png').convert('RGBA'),
 'D':Image.open(ASSET/'D_leftward_mirrored.png').convert('RGBA'),
}
pivot={'C':(0.53,0.66),'A':(0.49,0.62),'B':(0.42,0.61),'D':(0.50,0.66)}

def trim(im):
 box=im.getbbox(); return im.crop(box) if box else im

def prep(im,ratio):
 im=trim(im); base=Image.new('RGBA',(im.width+2*PAD,im.height+2*PAD),(0,0,0,0)); base.alpha_composite(im,(PAD,PAD))
 px=PAD+im.width*ratio[0]; py=PAD+im.height*ratio[1]
 arr=np.asarray(base); a=arr[:,:,3]; xx=np.arange(base.width)[None,:]; yy=np.arange(base.height)[:,None]
 lm=(xx<=px+8)&(a>0); rm=(xx>=px-8)&(a>0); cm=(np.hypot(xx-px,yy-py)<=22)&(a>0)
 left=np.zeros_like(arr); left[lm]=arr[lm]; right=np.zeros_like(arr); right[rm]=arr[rm]; center=np.zeros_like(arr); center[cm]=arr[cm]
 return base,(px,py),Image.fromarray(left,'RGBA'),Image.fromarray(right,'RGBA'),Image.fromarray(center,'RGBA')
sources={k:prep(raw[k],pivot[k]) for k in raw}

def wing(key,phase,strength):
 base,(px,py),left,right,center=sources[key]
 s=math.sin(phase); up=max(s,0); down=max(-s,0)
 la=(-34*up+30*down)*strength; ra=(34*up-32*down)*strength
 left=left.rotate(la,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
 right=right.rotate(ra,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
 out=Image.new('RGBA',base.size,(0,0,0,0)); out.alpha_composite(left); out.alpha_composite(right); out.alpha_composite(center)
 return out

def clip(v): return max(0.0,min(1.0,v))
def smooth(v):
 v=clip(v); return v*v*(3-2*v)
def route(u):
 # A broad rising turn, crest, then gentle drop into the leftward exit.
 x=W+490-(W+980)*u
 y=675-350*math.sin(math.pi*u)-95*math.sin(2*math.pi*u)
 return x,y
def bank(u):
 e=.001; x0,y0=route(clip(u-e)); x1,y1=route(clip(u+e))
 return max(-12,min(12,math.degrees(math.atan2(y1-y0,-(x1-x0)))))
def place(canvas,im,cx,cy,width,angle):
 scale=width/im.width; im=im.resize((max(1,int(im.width*scale)),max(1,int(im.height*scale))),Image.Resampling.LANCZOS)
 im=im.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
 canvas.alpha_composite(im,(int(cx-im.width/2),int(cy-im.height/2)))

# key, lag, relative y, width, hz, phase, wing strength, lateral departure
birds=[
 ('C',0.000,   0,430,0.25,0.15,1.00,  0),
 ('B',0.040, -72,225,0.31,2.10,0.84,-35),
 ('C',0.075,  88,260,0.22,4.00,0.74, 44),
 ('A',0.110,-165,175,0.33,1.25,0.72,-60),
 ('D',0.138, -28,155,0.27,3.20,0.66, 62),
 ('D',0.162, 160,130,0.30,5.15,0.60, 52),
 ('A',0.190,-250,122,0.35,2.75,0.58,-78),
 ('B',0.215, 225,145,0.19,4.65,0.63, 70),
 ('D',0.238,  60,105,0.32,0.95,0.55, 88),
 ('A',0.265,-105,112,0.24,3.80,0.59,-92),
 ('B',0.292, 305,118,0.29,1.85,0.56, 82),
 ('D',0.318,-320, 92,0.34,5.65,0.52,-100),
]
cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-', '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'denser_dynamic_flock_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(FRAMES):
 t=frame/FPS; canvas=Image.new('RGBA',(W,H),(0,0,0,0))
 if 1.0<=t<=11.0:
  u=smooth((t-1.0)/10.0)
  entry_exit=math.sin(math.pi*u)
  breathe=entry_exit*(0.72+0.63*math.sin(math.pi*u))
  # Back-to-front layering preserves a cohesive multi-depth flock silhouette.
  for key,lag,rel_y,width,hz,phase,strength,side in reversed(birds):
   fu=clip(u-lag*entry_exit)
   x,y=route(fu)
   wave=math.sin(2*math.pi*u+phase)
   x += side*0.25*breathe*wave
   y += rel_y*breathe + side*0.48*breathe*math.cos(2*math.pi*u+phase)
   y += 7*math.sin(2*math.pi*0.15*t+phase)
   angle=bank(fu)+1.1*math.sin(2*math.pi*0.11*t+phase)
   place(canvas,wing(key,2*math.pi*hz*t+phase,strength),x,y,width,angle)
 proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0: raise SystemExit('render failed')
print('Wrote denser_dynamic_flock_prores4444.mov')
