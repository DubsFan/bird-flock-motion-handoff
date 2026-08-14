from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path('/home/ubuntu/birds_exact_pixels/monochromatic_full_silhouette_pose_sheet')
OUT.mkdir(parents=True, exist_ok=True)
S=4
W,H=1672,800
INK=(4,58,120,255)
GRAY=(86,103,122,255)


def bezier(a,b,c,d,n=52):
    out=[]
    for i in range(n+1):
        t=i/n; u=1-t
        out.append((int(u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0]),
                    int(u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1])))
    return out


def pt(values,cx,cy,scale):
    return tuple((int((cx+x*scale)*S),int((cy+y*scale)*S)) for x,y in values)


def curve(draw,values,cx,cy,scale,color,width):
    q=pt(values,cx,cy,scale)
    draw.line(bezier(q[0],q[1],q[2],q[3]),fill=color,width=max(1,int(width*S)),joint='curve')


def notch(draw,cx,cy,scale):
    draw.line(pt([(-20,-4),(0,8),(22,-15)],cx,cy,scale),fill=INK,width=int(5*S),joint='curve')


def full_glide(draw,cx,cy,s):
    # Outer leading wings: wide, unequal, source-like arcs.
    curve(draw,[(-310,-28),(-220,-110),(-88,-23),(0,0)],cx,cy,s,INK,6.7)
    curve(draw,[(0,0),(58,-14),(144,-98),(248,-118)],cx,cy,s,INK,5.8)
    # Lower trailing contours close the visual wing mass without a fill.
    curve(draw,[(-290,-12),(-202,-34),(-100,48),(-8,15)],cx,cy,s,INK,4.6)
    curve(draw,[(10,13),(78,54),(145,21),(190,-34)],cx,cy,s,INK,3.9)
    # Incomplete construction echoes preserve the original sketch grammar.
    curve(draw,[(-245,2),(-159,-17),(-77,22),(-21,15)],cx,cy,s,INK,1.8)
    curve(draw,[(43,-2),(95,-20),(138,-43),(176,-51)],cx,cy,s,INK,1.3)
    notch(draw,cx,cy,s)


def full_upstroke(draw,cx,cy,s):
    curve(draw,[(-300,2),(-222,-120),(-75,-31),(0,0)],cx,cy,s,INK,6.7)
    curve(draw,[(0,0),(45,-44),(83,-194),(185,-270)],cx,cy,s,INK,5.8)
    curve(draw,[(-278,-14),(-180,-74),(-83,38),(-8,14)],cx,cy,s,INK,4.6)
    curve(draw,[(10,14),(76,51),(138,-35),(165,-123)],cx,cy,s,INK,3.9)
    curve(draw,[(-218,-8),(-132,-44),(-58,14),(-18,13)],cx,cy,s,INK,1.7)
    curve(draw,[(33,-10),(69,-70),(98,-135),(129,-182)],cx,cy,s,INK,1.4)
    notch(draw,cx,cy,s)


def full_downstroke(draw,cx,cy,s):
    curve(draw,[(-304,32),(-214,-38),(-84,64),(0,0)],cx,cy,s,INK,6.7)
    curve(draw,[(0,0),(53,46),(146,-18),(246,-76)],cx,cy,s,INK,5.8)
    curve(draw,[(-282,18),(-185,32),(-74,83),(-7,18)],cx,cy,s,INK,4.6)
    curve(draw,[(9,17),(93,70),(172,12),(211,-38)],cx,cy,s,INK,3.9)
    curve(draw,[(-223,27),(-131,36),(-52,42),(-17,20)],cx,cy,s,INK,1.8)
    curve(draw,[(39,15),(89,40),(138,7),(176,-26)],cx,cy,s,INK,1.3)
    notch(draw,cx,cy,s)

# Large transparent pose assets.
for key,func in [('01_full_upstroke',full_upstroke),('02_full_glide',full_glide),('03_full_downstroke',full_downstroke)]:
    image=Image.new('RGBA',(800*S,560*S),(0,0,0,0))
    func(ImageDraw.Draw(image),400,290,1.05)
    image.resize((800,560),Image.Resampling.LANCZOS).save(OUT/f'{key}.png')

# Native-scale side-by-side board.
board=Image.new('RGB',(W*S,H*S),'white')
draw=ImageDraw.Draw(board)
font=ImageFont.load_default()
for label,func,cx in [('UPSTROKE',full_upstroke,285),('GLIDE',full_glide,836),('DOWNSTROKE',full_downstroke,1387)]:
    draw.text((int((cx-205)*S),54*S),label,fill=GRAY,font=font)
    draw.line([(int((cx-205)*S),90*S),(int((cx+205)*S),90*S)],fill=(214,227,241),width=S)
    func(draw,cx,400,0.89)
    draw.line([(int((cx-205)*S),626*S),(int((cx+205)*S),626*S)],fill=(232,238,246),width=S)
draw.text((52*S,730*S),'FULL-SILHOUETTE APPROVAL GATE · 2 outer leading arcs + 2 lower trailing contours + center notch + incomplete echo lines',fill=GRAY,font=font)
board.resize((W,H),Image.Resampling.LANCZOS).save(OUT/'monochromatic_full_silhouette_three_pose_approval_sheet.png')
print(f'Wrote full silhouette pose assets to {OUT}')
