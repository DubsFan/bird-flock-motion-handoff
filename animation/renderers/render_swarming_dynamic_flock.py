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
 left=left.rotate((-34*up+30*down)*strength,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
 right=right.rotate((34*up-32*down)*strength,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
 out=Image.new('RGBA',base.size,(0,0,0,0)); out.alpha_composite(left); out.alpha_composite(right); out.alpha_composite(center)
 return out

def clamp(v): return max(0.0,min(1.0,v))
def smooth(v):
 v=clamp(v); return v*v*(3-2*v)
def route(u):
 x=W+500-(W+1000)*u
 y=685-375*math.sin(math.pi*u)-115*math.sin(2*math.pi*u)
 return x,y
def bank(u):
 e=.001; x0,y0=route(clamp(u-e)); x1,y1=route(clamp(u+e))
 return max(-13,min(13,math.degrees(math.atan2(y1-y0,-(x1-x0)))))
def place(canvas,im,x,y,width,angle):
 s=width/im.width; im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.Resampling.LANCZOS)
 im=im.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
 canvas.alpha_composite(im,(int(x-im.width/2),int(y-im.height/2)))

# key, lag, base-y, width, Hz, wing phase, strength, orbit radius, orbit phase, orbit turns, layer sign
birds=[
 ('C',0.000,   0,430,.25,.15,1.00,  0,0.0,0.0, 0), # leader
 ('B',.035, -72,225,.31,2.10,.84, 38,.4,.80, 1),
 ('C',.070,  88,260,.22,4.00,.74, 52,1.2,.75,-1),
 ('A',.100,-165,175,.33,1.25,.72, 64,2.1,1.00, 1),
 ('D',.128, -28,155,.27,3.20,.66, 72,3.1,.85,-1),
 ('D',.150, 160,130,.30,5.15,.60, 76,4.0,1.10, 1),
 ('A',.178,-250,122,.35,2.75,.58, 84,5.0,.95,-1),
 ('B',.200, 225,145,.19,4.65,.63, 92,.8,1.05, 1),
 ('D',.222,  60,105,.32,.95,.55, 98,1.7,.88,-1),
 ('A',.245,-105,112,.24,3.80,.59,102,2.6,1.14, 1),
 ('B',.268, 305,118,.29,1.85,.56,108,3.6,.96,-1),
 ('D',.290,-320, 92,.34,5.65,.52,112,4.5,1.06, 1),
 ('A',.312, 105, 98,.21,2.40,.50,118,5.3,.86,-1),
 ('D',.334,-195, 85,.35,4.20,.48,122,.2,1.12, 1),
 ('B',.355, 365,100,.26,.60,.51,126,1.0,.92,-1),
 ('A',.376,-365, 78,.30,3.05,.46,130,2.0,1.00, 1),
 ('D',.398, 250, 72,.23,5.00,.44,136,2.9,.84,-1),
 ('D',.420, -40, 68,.33,1.55,.42,140,4.1,1.08, 1),
]
cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-', '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'swarming_dynamic_flock_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for f in range(FRAMES):
 t=f/FPS; canvas=Image.new('RGBA',(W,H),(0,0,0,0))
 if 1.0<=t<=11.0:
  u=smooth((t-1.0)/10.0); fade=math.sin(math.pi*u); breathe=fade*(.72+.68*math.sin(math.pi*u))
  # Farthest members render first. Layer orbits fade smoothly at the two blank loop edges.
  for key,lag,by,width,hz,wphase,strength,radius,ophase,turns,sign in reversed(birds):
   fu=clamp(u-lag*fade)
   x,y=route(fu)
   theta=ophase+sign*2*math.pi*turns*u
   orbit_x=radius*.65*breathe*math.cos(theta)
   orbit_y=radius*breathe*math.sin(theta)
   x += orbit_x
   y += by*breathe + orbit_y + 7*math.sin(2*math.pi*.14*t+ophase)
   angle=bank(fu)+1.3*math.sin(theta)*breathe
   place(canvas,wing(key,2*math.pi*hz*t+wphase,strength),x,y,width,angle)
 proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0: raise SystemExit('render failed')
print('Wrote swarming_dynamic_flock_prores4444.mov')
