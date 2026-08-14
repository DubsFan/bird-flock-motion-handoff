from pathlib import Path
from PIL import Image, ImageDraw
import math
import subprocess
import numpy as np

OUT = Path('/home/ubuntu/birds_exact_pixels')
W, H, S = 1672, 941, 2
RW, RH = W*S, H*S
FPS, DURATION = 24, 10.0
FRAMES = int(FPS * DURATION)
ENTRY, EXIT = 0.75, 8.65

# Each line represents one family of birds on its own gently curved aerial route.
LANES = [
    # y0, span, bird count, speed factor, phase, lane arc amplitude, scale base
    (0.30, 0.75, 5, 0.86, 0.10, 0.11, 0.74),
    (0.52, 0.92, 5, 0.98, 1.70, 0.15, 0.96),
    (0.70, 0.80, 4, 1.10, 2.70, 0.10, 0.62),
    (0.18, 0.68, 3, 0.77, 0.85, 0.08, 0.45),
]

# Three larger, distinct foreground gestures create the source-like scale hierarchy.
HEROES = [
    # x offset, baseline y, wingspan fraction, curved-path arc, flap rate, phase
    (-0.14, 0.54, 0.255, 0.135, 0.86, 0.30),
    ( 0.11, 0.40, 0.205, 0.105, 0.96, 1.55),
    ( 0.24, 0.65, 0.180, 0.120, 0.90, 2.35),
]

INK = (17, 74, 177, 255)
INK_LIGHT = (76, 125, 220, 210)


def cubic(p0, p1, p2, p3, count=18):
    points = []
    for i in range(count+1):
        t = i/count
        u = 1-t
        points.append((int(u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0]),
                       int(u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1])))
    return points


def stroke(draw, p0, p1, p2, p3, color, width):
    draw.line(cubic(p0,p1,p2,p3), fill=color, width=max(1,int(width)), joint='curve')


def gesture_bird(draw, cx, cy, wing, flap, bank, weight, accent=False):
    # A bird is two open, unequal ink gestures joined near the body. The tip and inner arc change independently
    # during the flap so it reads as wing flex, never as a rigid V swinging on a left hinge.
    lift = -0.16*wing*flap
    fold = 0.07*wing*(1-flap)
    shoulder = (cx, cy)

    # Near wing: longer, sweeping, with a low relaxed downstroke and higher upstroke.
    left_tip = (cx - 0.60*wing, cy - 0.14*wing + lift + bank*0.035*wing)
    stroke(draw, shoulder,
           (cx - 0.14*wing, cy - 0.15*wing + 0.45*lift),
           (cx - 0.39*wing, cy - 0.23*wing + lift),
           left_tip, INK, weight)
    # A short broken secondary gesture, echoing the loose reference styling rather than closing a filled wing.
    if wing > 60*S:
        stroke(draw, (cx - 0.06*wing, cy + 0.015*wing),
               (cx - 0.20*wing, cy + fold),
               (cx - 0.36*wing, cy - 0.03*wing + 0.55*lift),
               (cx - 0.47*wing, cy - 0.09*wing + 0.72*lift), INK_LIGHT, weight*0.48)

    # Far wing: not mirrored exactly, with shorter sweep and a different elbow cadence.
    right_tip = (cx + 0.53*wing, cy - 0.10*wing + 0.82*lift - bank*0.04*wing)
    stroke(draw, shoulder,
           (cx + 0.12*wing, cy - 0.12*wing + 0.30*lift),
           (cx + 0.32*wing, cy - 0.25*wing + 0.75*lift),
           right_tip, INK, weight*0.92)
    if accent:
        stroke(draw, (cx + 0.02*wing, cy + 0.02*wing),
               (cx + 0.13*wing, cy + 0.055*wing),
               (cx + 0.24*wing, cy + 0.02*wing + 0.28*lift),
               (cx + 0.31*wing, cy - 0.025*wing + 0.43*lift), INK_LIGHT, weight*0.42)

    # Tiny body gesture only, never a detailed body or realistic bird profile.
    stroke(draw, (cx - 0.055*wing, cy + 0.010*wing),
           (cx + 0.005*wing, cy + 0.046*wing),
           (cx + 0.080*wing, cy + 0.035*wing),
           (cx + 0.130*wing, cy + 0.005*wing), INK, weight*0.82)


def smoothstep(v):
    return v*v*(3-2*v)

manifest = [
    'style=open, sparse, hand-drawn blue gesture birds',
    'prohibited=no white outline, no fill, no closed realistic body, no feathers, no feet, no AI redraw',
    'motion=slow layered curved lanes with vertical drift, gentle banks, and 1.15 to 1.55 wing cycles per second',
    'timeline=transparent handles then left entry, diagonal/curved flock passage, right exit, transparent handle',
]
(OUT/'graceful_flock_manifest.txt').write_text('\n'.join(manifest)+'\n')

cmd = ['ffmpeg','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
       '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-movflags','+faststart',
       str(OUT/'birds-graceful-natural-flight-prores4444.mov')]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for frame in range(FRAMES):
    t = frame/FPS
    image = Image.new('RGBA',(RW,RH),(0,0,0,0))
    draw = ImageDraw.Draw(image)
    if ENTRY <= t <= EXIT:
        travel = smoothstep((t-ENTRY)/(EXIT-ENTRY))
        for lane_index,(base_y,lane_span,count,velocity,phase,arc,scale) in enumerate(LANES):
            # Individual birds are staggered on the same lane so it reads as one leisurely flock, not a rigid row.
            for bird_index in range(count):
                offset = bird_index/(count-1) if count>1 else 0.5
                raw_x = -0.20 + 1.38*travel + (offset-0.5)*lane_span
                # Full lane arcs upward then downward and drifts gently on a second slow sine.
                lane_y = base_y - arc*math.sin(math.pi*travel) + 0.018*math.sin(2*math.pi*(0.12*t)+phase+bird_index)
                # Birds bank differently as they rise/fall, avoiding a mechanical horizontal sweep.
                bank = 0.65*math.sin(math.pi*travel + 0.55*bird_index + phase)
                cx = raw_x*W*S
                cy = lane_y*H*S
                wing = (0.065 + 0.055*scale + 0.018*math.sin(bird_index*1.7+lane_index))*W*S
                hz = 1.15 + 0.10*((bird_index+lane_index)%4)
                flap = math.sin(2*math.pi*hz*t + phase + bird_index*0.62)
                gesture_bird(draw,cx,cy,wing,flap,bank,max(2,2.0*S*scale),accent=(bird_index%3==0))

        # Hero birds glide on their own slow, high-to-low arcs, independent from the smaller grouped lanes.
        for hero_index, (x_offset, base_y, span_factor, hero_arc, hz, phase) in enumerate(HEROES):
            hx = (-0.29 + 1.58*travel + x_offset) * W * S
            hy = (base_y - hero_arc*math.sin(math.pi*travel) + 0.018*math.sin(2*math.pi*0.08*t + phase)) * H * S
            hflap = math.sin(2*math.pi*hz*t + phase)
            hbank = 0.75*math.sin(math.pi*travel + phase)
            gesture_bird(draw, hx, hy, span_factor*W*S, hflap, hbank, 3.3*S, accent=True)
    image=image.resize((W,H),Image.Resampling.LANCZOS)
    proc.stdin.write(np.asarray(image).tobytes())

proc.stdin.close()
if proc.wait()!=0:
    raise SystemExit('render failed')
print('Wrote birds-graceful-natural-flight-prores4444.mov')
