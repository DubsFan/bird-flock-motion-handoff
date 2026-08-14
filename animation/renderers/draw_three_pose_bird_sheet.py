from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path('/home/ubuntu/birds_exact_pixels/pose_sheet')
OUT.mkdir(parents=True, exist_ok=True)
S = 4
W, H = 1672, 760
NAVY = (3, 42, 97, 255)
BLUE = (11, 96, 205, 255)
LIGHT = (122, 179, 235, 205)
GRAY = (90, 108, 128, 255)


def bezier(p0,p1,p2,p3,n=48):
    result=[]
    for i in range(n+1):
        t=i/n; u=1-t
        result.append((int(u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0]),
                       int(u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1])))
    return result


def stroke(draw,p0,p1,p2,p3,color,width):
    draw.line(bezier(p0,p1,p2,p3),fill=color,width=max(1,round(width)),joint='curve')


def p(points,cx,cy,scale):
    return tuple((int((cx+x*scale)*S),int((cy+y*scale)*S)) for x,y in points)


def curve(draw,pts,cx,cy,scale,color,width):
    q=p(pts,cx,cy,scale)
    stroke(draw,q[0],q[1],q[2],q[3],color,width*S)


def notch(draw,cx,cy,scale):
    # The hand-drawn source uses a small graphic break where wing strokes meet, not an illustrated torso.
    pts=p([(-18,0),(0,8),(18,-12)],cx,cy,scale)
    draw.line(pts,fill=NAVY,width=round(4.8*S),joint='curve')


def upstroke(draw,cx,cy,scale):
    # Left wing remains long and relaxed; right wing pulls high into an asymmetrical lifting stroke.
    curve(draw,[(-300,8),(-214,-78),(-82,-10),(0,0)],cx,cy,scale,NAVY,6.4)
    curve(draw,[(0,0),(46,-42),(82,-188),(186,-258)],cx,cy,scale,BLUE,5.8)
    # Sparse interior echo is intentionally incomplete and runs only under the lifting wing.
    curve(draw,[(-190,-12),(-104,-50),(-42,4),(-10,3)],cx,cy,scale,LIGHT,2.1)
    curve(draw,[(20,-4),(64,-52),(98,-130),(133,-175)],cx,cy,scale,LIGHT,1.8)
    notch(draw,cx,cy,scale)


def glide(draw,cx,cy,scale):
    # Broad uneven low arcs, with a second wing trace on the stronger left side.
    curve(draw,[(-320,-15),(-225,-90),(-95,-26),(0,0)],cx,cy,scale,NAVY,6.6)
    curve(draw,[(0,0),(65,-18),(142,-95),(257,-116)],cx,cy,scale,BLUE,5.7)
    curve(draw,[(-270,5),(-180,-43),(-75,13),(-8,5)],cx,cy,scale,LIGHT,2.0)
    curve(draw,[(23,-2),(92,-41),(161,-61),(203,-68)],cx,cy,scale,LIGHT,1.5)
    notch(draw,cx,cy,scale)


def downstroke(draw,cx,cy,scale):
    # Both wings are lower and forward, but their curvature and endpoint heights stay intentionally unequal.
    curve(draw,[(-296,38),(-211,-26),(-92,52),(0,0)],cx,cy,scale,NAVY,6.5)
    curve(draw,[(0,0),(58,30),(138,-20),(236,-74)],cx,cy,scale,BLUE,5.7)
    curve(draw,[(-202,34),(-120,56),(-47,24),(-9,4)],cx,cy,scale,LIGHT,2.0)
    curve(draw,[(18,4),(89,26),(140,-10),(180,-37)],cx,cy,scale,LIGHT,1.5)
    notch(draw,cx,cy,scale)

# Draw the three poses directly on one high-resolution board rather than shrinking full canvases.
board=Image.new('RGB',(W*S,H*S),'white')
draw=ImageDraw.Draw(board)
font=ImageFont.load_default()
entries=[('UPSTROKE',upstroke,300),('GLIDE',glide,836),('DOWNSTROKE',downstroke,1372)]
for label,fn,cx in entries:
    draw.text((int((cx-190)*S),58*S),label,fill=GRAY,font=font)
    draw.line([(int((cx-190)*S),94*S),(int((cx+190)*S),94*S)],fill=(215,227,240),width=S)
    fn(draw,cx,395,0.94)
    draw.line([(int((cx-200)*S),580*S),(int((cx+200)*S),580*S)],fill=(232,238,246),width=S)

draw.text((55*S,690*S),'APPROVAL GATE: open blue gesture strokes · unequal wing arcs · shared center notch · no fill or realistic anatomy',fill=GRAY,font=font)
board.resize((W,H),Image.Resampling.LANCZOS).save(OUT/'three_pose_approval_sheet.png')

# Export each pose as a transparent asset for future rigging only after approval.
for name,fn in [('01_upstroke',upstroke),('02_glide',glide),('03_downstroke',downstroke)]:
    image=Image.new('RGBA',(760*S,520*S),(0,0,0,0))
    fn(ImageDraw.Draw(image),380,265,1.0)
    image.resize((760,520),Image.Resampling.LANCZOS).save(OUT/f'{name}.png')
print(f'Wrote refined pose assets to {OUT}')
