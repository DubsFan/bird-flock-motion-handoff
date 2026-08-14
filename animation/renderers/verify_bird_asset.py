from pathlib import Path
import hashlib
import numpy as np
from PIL import Image

original = np.asarray(Image.open('/home/ubuntu/upload/BGbnlRIGHTSIDE.png').convert('RGB'))
asset = np.asarray(Image.open('/home/ubuntu/birds_exact_pixels/birds_only_original_pixels_v2.png').convert('RGBA'))
visible = asset[:, :, 3] > 0
mismatches = int(np.any(asset[:, :, :3][visible] != original[visible], axis=1).sum())
report = {
    'visible_original_pixels': int(visible.sum()),
    'rgb_mismatches_against_original': mismatches,
    'dimensions': f'{asset.shape[1]}x{asset.shape[0]}',
}
text = '\n'.join(f'{k}={v}' for k, v in report.items()) + '\n'
Path('/home/ubuntu/birds_exact_pixels/bird_asset_verification.txt').write_text(text)
print(text, end='')
if mismatches:
    raise SystemExit('Bird-only asset does not preserve original RGB pixels.')
