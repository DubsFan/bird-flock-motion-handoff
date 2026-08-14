from pathlib import Path
import numpy as np
from PIL import Image

src = Path('/home/ubuntu/birds_exact_pixels/bird_only_component_candidate.png')
out = Path('/home/ubuntu/birds_exact_pixels/bird_only_mask_diagnostic.png')
a = np.asarray(Image.open(src).convert('RGBA'))
mask = a[:,:,3] > 0
preview = np.full((a.shape[0], a.shape[1], 3), 255, dtype=np.uint8)
preview[mask] = (0, 34, 110)
Image.fromarray(preview, 'RGB').save(out)
print(out)
