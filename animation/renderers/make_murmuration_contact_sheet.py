from pathlib import Path
from PIL import Image, ImageDraw
import sys

name = sys.argv[1]
root = Path('/home/ubuntu/birds_exact_pixels') / f'{name}_playback_frames'

def timestamp(path):
    value = path.stem.removeprefix('frame-').removesuffix('s').replace('_', '.')
    return float(value)

frames = sorted(root.glob('frame-*.png'), key=timestamp)
thumb_size = (836, 470)
sheet = Image.new('RGB', (thumb_size[0] * 2, thumb_size[1] * 5), '#1F2937')
for index, frame in enumerate(frames):
    image = Image.open(frame).convert('RGB').resize(thumb_size)
    sheet.paste(image, ((index % 2) * thumb_size[0], (index // 2) * thumb_size[1]))
sheet.save(root / 'playback-contact-sheet.png')
print(f'Created contact sheet from {len(frames)} browser screenshots')
