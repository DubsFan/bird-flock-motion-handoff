from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path('/home/ubuntu/birds_exact_pixels')
src=ROOT/'authentic_extracted_pose_study'
out=ROOT/'orientation_locked_flock_assets'
out.mkdir(parents=True,exist_ok=True)
assets=[
    ('A_leftward', src/'A_source_rightside_monochrome.png', False),
    ('B_leftward', src/'B_source_twolines_monochrome.png', False),
    ('C_leftward', src/'C_source_linesone_monochrome.png', False),
    ('D_leftward_mirrored', src/'D_source_leftside_monochrome.png', True),
]
rendered=[]
for name,path,flip in assets:
    image=Image.open(path).convert('RGBA')
    if flip:
        image=image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    image.save(out/f'{name}.png')
    rendered.append((name,image,flip))

board=Image.new('RGB',(1672,520),'white'); draw=ImageDraw.Draw(board); font=ImageFont.load_default()
for i,(name,image,flip) in enumerate(rendered):
    x=40+i*405
    draw.text((x,40),name.replace('_',' ').upper(),fill=(70,88,110),font=font)
    draw.text((x,62),'MIRRORED FROM SOURCE' if flip else 'SOURCE ORIENTATION',fill=(105,121,140),font=font)
    draw.line([(x,95),(x+350,95)],fill=(216,228,241),width=1)
    view=image.copy(); view.thumbnail((360,270))
    board.paste(view,(x+(350-view.width)//2,165),view)
    draw.line([(x,430),(x+350,430)],fill=(232,238,246),width=1)
draw.text((40,480),'All flock assets now share the leftward-facing C contour orientation. D is the only mirrored source component.',fill=(82,102,125),font=font)
board.save(out/'leftward_orientation_review.png')
print('Wrote orientation-locked flock assets')
