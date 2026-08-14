from pathlib import Path
from PIL import Image, ImageDraw

root=Path('/home/ubuntu/birds_exact_pixels/forward_wingbeat_playback_frames')
frames=[]
for name in ['frame-02_5s.png','frame-0004s.png','frame-05_5s.png','frame-0007s.png','frame-08_5s.png']:
    path=root/name
    image=Image.open(path).convert('RGB')
    # Hero path stays in lower-middle visual band over this time range.
    crop=image.crop((0,300,1672,820))
    crop=crop.resize((836,260),Image.Resampling.LANCZOS)
    frames.append((name,crop))
board=Image.new('RGB',(836,5*300),'white')
draw=ImageDraw.Draw(board)
for i,(name,image) in enumerate(frames):
    y=i*300
    board.paste(image,(0,y))
    draw.rectangle((0,y,836,y+299),outline=(220,230,240),width=1)
    draw.text((18,y+270),name.replace('frame-','').replace('.png',''),fill=(65,82,102))
board.save(root/'hero_forward_wingbeat_strip.png')
print('Wrote hero wing flex strip')
