from pathlib import Path
from PIL import Image
import numpy as np
import math
import subprocess

ROOT=Path('/home/ubuntu/birds_exact_pixels')
ASSET=ROOT/'authentic_extracted_pose_study'
W,H,FPS,DURATION=1672,941,24,12.0
FRAMES=int(FPS*DURATION)
PAD=82

raw={
    'C': Image.open(ASSET/'C_source_linesone_monochrome.png').convert('RGBA'),
    'A': Image.open(ASSET/'A_source_rightside_monochrome.png').convert('RGBA'),
    'B': Image.open(ASSET/'B_source_twolines_monochrome.png').convert('RGBA'),
    'D': Image.open(ASSET/'D_source_leftside_monochrome.png').convert('RGBA'),
}
pivot_ratio={'C':(0.53,0.66),'A':(0.49,0.62),'B':(0.42,0.61),'D':(0.50,0.66)}

def trim(image):
    bbox=image.getbbox(); return image.crop(bbox) if bbox else image

def make_source(image,ratio):
    image=trim(image)
    canvas=Image.new('RGBA',(image.width+2*PAD,image.height+2*PAD),(0,0,0,0))
    canvas.alpha_composite(image,(PAD,PAD))
    px=PAD+image.width*ratio[0]; py=PAD+image.height*ratio[1]
    arr=np.asarray(canvas); alpha=arr[:,:,3]
    xx=np.arange(canvas.width)[None,:]; yy=np.arange(canvas.height)[:,None]
    left_mask=(xx<=px+8)&(alpha>0); right_mask=(xx>=px-8)&(alpha>0)
    center_mask=(np.hypot(xx-px,yy-py)<=22)&(alpha>0)
    left=np.zeros_like(arr); left[left_mask]=arr[left_mask]
    right=np.zeros_like(arr); right[right_mask]=arr[right_mask]
    center=np.zeros_like(arr); center[center_mask]=arr[center_mask]
    return canvas,(px,py),Image.fromarray(left,'RGBA'),Image.fromarray(right,'RGBA'),Image.fromarray(center,'RGBA')

sources={k:make_source(raw[k],pivot_ratio[k]) for k in raw}

def wingbeat(key,phase,strength):
    base,(px,py),left,right,center=sources[key]
    s=math.sin(phase); up=max(s,0.0); down=max(-s,0.0)
    # Large continuous motion around the source's original center notch.
    left_angle=(-34.0*up+30.0*down)*strength
    right_angle=(34.0*up-32.0*down)*strength
    left=left.rotate(left_angle,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    right=right.rotate(right_angle,resample=Image.Resampling.BICUBIC,center=(px,py),expand=False)
    result=Image.new('RGBA',base.size,(0,0,0,0))
    result.alpha_composite(left); result.alpha_composite(right); result.alpha_composite(center)
    return result

def ease(u):
    u=max(0.0,min(1.0,u)); return u*u*(3-2*u)

def lane_position(t,start,end,y,arc):
    u=ease((t-start)/(end-start))
    x=W+290-(W+580)*u
    yy=y-arc*math.sin(math.pi*u)+5*math.sin(2*math.pi*0.12*t+u*1.7)
    return (x,yy),u

def place(canvas,image,center,width,bank):
    scale=width/image.width
    scaled=image.resize((max(1,int(image.width*scale)),max(1,int(image.height*scale))),Image.Resampling.LANCZOS)
    rot=scaled.rotate(bank,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.alpha_composite(rot,(int(center[0]-rot.width/2),int(center[1]-rot.height/2)))

flock=[
    # key, start, end, y, arc, width, cycle, phase, strength, bank
    ('C',1.2,11.0,555,105,430,0.28,0.15,1.00,-1.5),
    ('C',2.0,10.2,310,58,245,0.31,1.40,0.73,-0.8),
    ('B',0.6,9.8,682,74,235,0.25,2.80,0.85,1.2),
    ('A',2.2,10.5,420,48,175,0.32,1.70,0.75,-1.0),
    ('D',1.6,10.8,172,38,160,0.29,0.75,0.62,-0.6),
    ('D',3.0,11.2,790,50,130,0.34,3.35,0.58,0.9),
]

cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
     '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'layered_extracted_flock_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(FRAMES):
    t=frame/FPS
    canvas=Image.new('RGBA',(W,H),(0,0,0,0))
    # Draw far and small birds first, then hero.
    ordered=sorted(flock,key=lambda row: row[5])
    for key,start,end,y,arc,width,cycle,phase,strength,bank in ordered:
        if start<=t<=end:
            bird=wingbeat(key,2*math.pi*cycle*t+phase,strength)
            pos,u=lane_position(t,start,end,y,arc)
            place(canvas,bird,pos,width,bank*math.sin(math.pi*u))
    proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0: raise SystemExit('render failed')
print('Wrote layered_extracted_flock_prores4444.mov')
