from pathlib import Path
from PIL import Image, ImageDraw
import sys

name = sys.argv[1]
root = Path('/home/ubuntu/birds_exact_pixels') / f'{name}_flap_proof'
frames = sorted(root.glob('frame-*.png'))
thumb = (836, 470)
sheet = Image.new('RGB', (thumb[0] * 2, thumb[1] * 3), 'white')
for i, p in enumerate(frames):
    im = Image.open(p).convert('RGB').resize(thumb)
    sheet.paste(im, ((i % 2) * thumb[0], (i // 2) * thumb[1]))
sheet.save(root / 'flap-proof-contact-sheet.png')
