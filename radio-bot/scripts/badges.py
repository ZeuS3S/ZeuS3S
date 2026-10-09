# Génère les badges « EN DIRECT » / « LIVE »… en tuiles carrées 128 px (un émoji Discord s'affiche dans un carré).
# Usage : python3 scripts/badges.py   (nécessite Pillow et la police Inter Bold)
import math, os
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
BADGES = {
    'live_fr': ('EN DIRECT', (237, 66, 69)),
    'live_en': ('LIVE', (237, 66, 69)),
    'pause_fr': ('EN PAUSE', (88, 101, 242)),
    'pause_en': ('PAUSED', (88, 101, 242)),
}
T, H, PAD, DOT = 128, 64, 22, 14
font = ImageFont.truetype(FONT, 40)
out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'badges')

for name, (text, color) in BADGES.items():
    text_w = font.getbbox(text)[2]
    width = PAD + DOT + 14 + text_w + PAD
    tiles = math.ceil(width / T)
    img = Image.new('RGBA', (tiles * T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0 = (tiles * T - width) // 2
    y0 = (T - H) // 2
    d.rounded_rectangle([x0, y0, x0 + width, y0 + H], radius=12, fill=color)
    d.ellipse([x0 + PAD, T // 2 - DOT // 2, x0 + PAD + DOT, T // 2 + DOT // 2], fill='white')
    d.text((x0 + PAD + DOT + 14, T // 2), text, font=font, fill='white', anchor='lm')
    for i in range(tiles):
        img.crop((i * T, 0, (i + 1) * T, T)).save(os.path.join(out, f'{name}_{i + 1}.png'))
    print(name, tiles, 'tuiles')
