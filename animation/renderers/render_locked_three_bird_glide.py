from pathlib import Path
from PIL import Image
import numpy as np
import math
import subprocess

ROOT=Path('/home/ubuntu/birds_exact_pixels')
ASSET=ROOT/'authentic_extracted_pose_study'
W,H=1672,941
FPS=24
DURATION=8.0
FRAMES=int(FPS*DURATION)

# Assets are source-extracted monochrome contours, never redrawn geometry.
assets={
    'hero': Image.open(ASSET/'C_source_linesone_monochrome.png').convert('RGBA'),
    'support_a': Image.open(ASSET/'A_source_rightside_monochrome.png').convert('RGBA'),
    'support_b': Image.open(ASSET/'B_source_twolines_monochrome.png').convert('RGBA'),
}


def trim(image):
    bbox=image.getbbox()
    return image.crop(bbox) if bbox else image

assets={key:trim(value) for key,value in assets.items()}


def ease(u):
    u=max(0.0,min(1.0,u))
    return u*u*(3-2*u)


def place(canvas,image,center,width,angle=0.0):
    ratio=width/image.width
    resized=image.resize((max(1,int(image.width*ratio)),max(1,int(image.height*ratio))),Image.Resampling.LANCZOS)
    rotated=resized.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    x=int(center[0]-rotated.width/2)
    y=int(center[1]-rotated.height/2)
    canvas.alpha_composite(rotated,(x,y))

cmd=['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
     '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',str(ROOT/'three_bird_locked_glide_prores4444.mov')]
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(FRAMES):
    t=frame/FPS
    canvas=Image.new('RGBA',(W,H),(0,0,0,0))
    if 0.75 <= t <= 6.75:
        u=ease((t-0.75)/6.0)
        # The hero rises gently at mid passage, banks no more than three degrees, and stays a locked image contour.
        hero_x=-260+(W+520)*u
        hero_y=555-105*math.sin(math.pi*u)+8*math.sin(2*math.pi*0.20*t)
        place(canvas,assets['hero'],(hero_x,hero_y),430*(1+0.018*math.sin(2*math.pi*0.18*t)),2.8*math.sin(math.pi*u))
        # Support A travels higher and slower, moving on a separate arc.
        a_x=-100+(W+280)*u
        a_y=268-56*math.sin(math.pi*u+0.20)+5*math.sin(2*math.pi*0.17*t+1.3)
        place(canvas,assets['support_a'],(a_x,a_y),175*(1+0.012*math.sin(2*math.pi*0.15*t+1)),1.8*math.sin(math.pi*u+0.15))
        # Support B is lower, delayed, and subtly banks the opposite direction.
        b_x=-240+(W+430)*u
        b_y=666-76*math.sin(math.pi*u-0.25)+4*math.sin(2*math.pi*0.15*t+2.2)
        place(canvas,assets['support_b'],(b_x,b_y),235*(1+0.014*math.sin(2*math.pi*0.14*t+2)), -2.0*math.sin(math.pi*u-0.2))
    proc.stdin.write(np.asarray(canvas).tobytes())
proc.stdin.close()
if proc.wait()!=0:
    raise SystemExit('render failed')
print('Wrote three_bird_locked_glide_prores4444.mov')
