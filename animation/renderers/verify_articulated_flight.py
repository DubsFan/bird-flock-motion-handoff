from pathlib import Path
import subprocess
import numpy as np
from PIL import Image

root = Path('/home/ubuntu/birds_exact_pixels')
master = root / 'birds-articulated-flight-transparent-prores4444.mov'
frames = {'start_empty': 0, 'pre_entry_empty': 17, 'mid_flight': 96, 'end_empty': 191}
lines=[]
for name, frame in frames.items():
    image_path = root / f'articulated-{name}.png'
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-i', str(master),
        '-vf', f"select='eq(n\\,{frame})',format=rgba", '-vsync', '0', '-frames:v', '1', str(image_path)
    ], check=True)
    alpha = np.asarray(Image.open(image_path).convert('RGBA'))[:,:,3]
    lines.append(f'{name}_frame={frame} visible_alpha_pixels={int((alpha > 0).sum())}')
(root / 'articulated_flight_verification.txt').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
if not lines[0].endswith('visible_alpha_pixels=0'):
    raise SystemExit('Start must be empty')
if not lines[-1].endswith('visible_alpha_pixels=0'):
    raise SystemExit('End must be empty')
