from pathlib import Path
import subprocess
import numpy as np
from PIL import Image

root = Path('/home/ubuntu/birds_exact_pixels')
master = root / 'birds-fast-flight-transparent-prores4444.mov'
frames = {'start_empty': 0, 'pre_entry_empty': 17, 'entry': 36, 'mid_flight': 96, 'exit': 156, 'end_empty': 191}
images = []
report = []
for name, index in frames.items():
    path = root / f'fast-flight-{name}.png'
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-i', str(master),
        '-vf', f"select='eq(n\\,{index})',format=rgba", '-vsync', '0', '-frames:v', '1', str(path)
    ], check=True)
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)[:, :, 3]
    visible = int((a > 0).sum())
    report.append(f'{name}_frame={index} visible_alpha_pixels={visible}')
    images.append(im)

# Dark composited review sheet for visual motion confirmation; no source pixels are altered in deliverables.
thumbs = []
for im in images:
    bg = Image.new('RGBA', im.size, '#1F2937')
    bg.alpha_composite(im)
    thumbs.append(bg.convert('RGB').resize((836, 470)))
sheet = Image.new('RGB', (836 * 3, 470 * 2), '#1F2937')
for n, thumb in enumerate(thumbs):
    sheet.paste(thumb, ((n % 3) * 836, (n // 3) * 470))
sheet.save(root / 'fast-flight-motion-contact-sheet.png')

report_path = root / 'fast_flight_verification.txt'
report_path.write_text('\n'.join(report) + '\n')
print('\n'.join(report))
if 'start_empty_frame=0 visible_alpha_pixels=0' not in report[0]:
    raise SystemExit('Start frame is not transparent')
if 'end_empty_frame=191 visible_alpha_pixels=0' not in report[-1]:
    raise SystemExit('End frame is not transparent')
