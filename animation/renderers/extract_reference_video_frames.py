from pathlib import Path
import subprocess
from PIL import Image, ImageDraw

out = Path('/home/ubuntu/birds_exact_pixels/reference_video_frames')
out.mkdir(parents=True, exist_ok=True)
videos = {
    'remove_navy': ('/home/ubuntu/upload/remove_all_the_navy_dark_blue.mp4', [0.0, 0.16]),
    'ten_second_animation': ('/home/ubuntu/upload/animate_the_first_image_in_the.mp4', [0.0, 1.5, 3.0, 4.5, 6.0, 7.5, 9.5]),
    'line_art_only': ('/home/ubuntu/upload/animate_this_exact_set_of_line_line-art-only.mp4', [0.0, 0.16]),
}

for name, (video, times) in videos.items():
    paths = []
    for index, timestamp in enumerate(times):
        frame_path = out / f'{name}_{index:02d}_{str(timestamp).replace(".", "_")}.png'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(timestamp), '-i', video, '-frames:v', '1', str(frame_path)], check=True)
        paths.append((timestamp, frame_path))
    thumbs = []
    for timestamp, path in paths:
        image = Image.open(path).convert('RGB')
        image.thumbnail((640, 360))
        tile = Image.new('RGB', (640, 400), 'white')
        tile.paste(image, ((640-image.width)//2, 0))
        ImageDraw.Draw(tile).text((16, 370), f'{name} · {timestamp:.2f}s', fill='black')
        thumbs.append(tile)
    cols = 3
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols*640, rows*400), '#E5E7EB')
    for i, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((i%cols)*640, (i//cols)*400))
    sheet.save(out / f'{name}_contact_sheet.png')
print(f'Wrote reference frame sheets to {out}')
