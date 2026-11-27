"""Calibration images for the v0.9 browser checks (written next to this script)."""
import os
from PIL import Image, ImageDraw

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, ".out", "img")
os.makedirs(out, exist_ok=True)


def calibration(name, w, h, colour):
    """Asymmetric: a different coloured block in each corner and an arrow pointing right."""
    im = Image.new("RGB", (w, h), colour)
    d = ImageDraw.Draw(im)
    s = max(8, min(w, h) // 6)
    d.rectangle([0, 0, s, s], fill=(220, 30, 30))          # top-left red
    d.rectangle([w - s, 0, w, s], fill=(30, 160, 60))      # top-right green
    d.rectangle([0, h - s, s, h], fill=(30, 60, 220))      # bottom-left blue
    d.rectangle([w - s * 2, h - s, w, h], fill=(240, 200, 20))  # bottom-right yellow, wider
    d.polygon([(w * 0.3, h * 0.45), (w * 0.65, h * 0.45), (w * 0.65, h * 0.35), (w * 0.8, h * 0.5), (w * 0.65, h * 0.65), (w * 0.65, h * 0.55), (w * 0.3, h * 0.55)], fill=(20, 20, 20))
    im.save(os.path.join(out, name), dpi=(300, 300))


calibration("card-front.png", 1011, 638, (235, 240, 250))
calibration("card-back.png", 1011, 638, (250, 235, 235))
calibration("portrait.jpg", 1200, 1800, (200, 220, 200))
for i, (w, h) in enumerate([(600, 400), (300, 900), (800, 800), (500, 200), (700, 350), (250, 250), (900, 300), (400, 600), (350, 500), (650, 450), (200, 700)]):
    calibration(f"mix-{i:02d}.png", w, h, (230, 230, 210 + i * 3))

# Transparent sticker: a star-ish blob with a hole, on transparency.
st = Image.new("RGBA", (800, 800), (0, 0, 0, 0))
d = ImageDraw.Draw(st)
d.ellipse([120, 120, 680, 680], fill=(236, 47, 143, 255))
d.ellipse([330, 330, 470, 470], fill=(0, 0, 0, 0))
d.rectangle([360, 40, 440, 160], fill=(7, 125, 137, 255))
st.save(os.path.join(out, "sticker.png"))

# v0.10: a JPEG sticker on plain white (a badge with a white hole, and a star apart from it).
jw = Image.new("RGB", (900, 700), (255, 255, 255))
d = ImageDraw.Draw(jw)
d.rounded_rectangle([120, 140, 640, 520], radius=120, fill=(30, 110, 200))
d.ellipse([300, 250, 460, 410], fill=(255, 255, 255))
d.rectangle([170, 440, 590, 470], fill=(250, 200, 30))
d.polygon([(720, 120), (760, 220), (860, 230), (780, 290), (810, 390), (720, 330), (630, 390), (660, 290), (580, 230), (680, 220)], fill=(230, 50, 90))
jw.save(os.path.join(out, "badge-white.jpg"), quality=88)

# v0.10: lanyard artwork (a 4:1 wordmark on transparency).
lw = Image.new("RGBA", (1600, 400), (0, 0, 0, 0))
d = ImageDraw.Draw(lw)
d.rounded_rectangle([10, 60, 1590, 340], radius=60, fill=(20, 40, 120, 255))
for i, x in enumerate(range(80, 1500, 280)):
    d.ellipse([x, 120, x + 160, 280], fill=(255, 210, 40, 255) if i % 2 else (240, 80, 120, 255))
lw.save(os.path.join(out, "lanyard-art.png"))

# v0.10: artwork with wide empty transparent margins (for Trim empty edges).
mg = Image.new("RGBA", (1200, 1200), (0, 0, 0, 0))
d = ImageDraw.Draw(mg)
d.rectangle([450, 500, 750, 700], fill=(7, 125, 137, 255))
mg.save(os.path.join(out, "margins.png"))
print("ok", len(os.listdir(out)))
