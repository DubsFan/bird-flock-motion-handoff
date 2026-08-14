from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

out = Path('/home/ubuntu/birds_exact_pixels/extracted_bird_candidates')
out.mkdir(parents=True, exist_ok=True)

# Crops target clearly visible large reference birds identified from the user-supplied compositions.
candidates = [
    ('rightside_hero_center', '/home/ubuntu/upload/BGBIRDSANDLINESRIGHTSIDE.png', (820, 250, 1210, 520)),
    ('twolines_hero_topright', '/home/ubuntu/upload/BGBIRDSANDLINESTWO.png', (945, 55, 1280, 245)),
    ('linesone_hero_lowright', '/home/ubuntu/upload/BIRDSANDLINESONE.png', (1080, 395, 1485, 650)),
    ('leftside_hero_midleft', '/home/ubuntu/upload/BGBIRDSANDLINESLEFTSIDE.png', (120, 130, 620, 420)),
]

def make_alpha(crop):
    a = np.asarray(crop.convert('RGB')).astype(np.int16)
    r,g,b = a[:,:,0],a[:,:,1],a[:,:,2]
    # Preserve blue/navy ink; suppress near-white paper and very pale construction marks.
    ink_strength = 255 - np.minimum(np.minimum(r,g),b)
    blue_bias = b - r
    mask = (ink_strength > 48) & (blue_bias > 10)
    alpha = np.where(mask, 255, 0).astype(np.uint8)
    rgba = np.dstack((a.astype(np.uint8), alpha))
    return Image.fromarray(rgba, 'RGBA')

thumbs=[]
for name, path, box in candidates:
    crop = Image.open(path).convert('RGB').crop(box)
    isolated = make_alpha(crop)
    isolated.save(out / f'{name}.png')
    # White review tile shows exactly what will be locked as original source pixels.
    review = Image.new('RGB', (480, 360), 'white')
    scaled = isolated.copy()
    scaled.thumbnail((440, 290))
    review.paste(scaled, ((480-scaled.width)//2, 30), scaled)
    d = ImageDraw.Draw(review)
    d.text((18, 330), name, fill=(40,55,75))
    thumbs.append(review)

sheet=Image.new('RGB',(960,720),(232,238,245))
for i,tile in enumerate(thumbs):
    sheet.paste(tile,((i%2)*480,(i//2)*360))
sheet.save(out/'candidate_contact_sheet.png')
print(f'Wrote {len(candidates)} candidates to {out}')
