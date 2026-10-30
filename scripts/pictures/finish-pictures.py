"""Turn raw 3D renders into product pictures (ADR 0011), step 2 of 2.

Input:  scripts/pictures/.renders/<id>.png (transparent, 2x; from render-products.mjs)
Output: public/products/<id>.webp, 720 x 720, transparent, the product centred
        with even padding, Lanczos-resampled, the outer edge faded so a clipped
        shadow dissolves; and <id>-detail.webp, a 320 x 320 close-up of the
        print, for products that already have one (small print areas).

    python scripts/pictures/finish-pictures.py [id ...]   (no ids: every render)

Needs Pillow (pip install pillow).
"""
import os
import sys

from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, ".renders")
DST = os.path.join(HERE, "..", "..", "public", "products")
SIZE = 720
PAD = 0.14  # of the square, each side
DETAIL = 320


def edge_fade(size, band=0.12):
    m = Image.new("L", (size, size), 0)
    px = m.load()
    edge = size * band
    for y in range(size):
        for x in range(size):
            d = min(x, y, size - 1 - x, size - 1 - y)
            px[x, y] = 255 if d >= edge else int(255 * (d / edge) ** 1.5)
    return m


def picture(im, fade):
    # Centre on the product itself (opaque pixels); the soft shadow (at most
    # ~35 % alpha) may trail off the edge rather than push the product aside.
    solid = im.getchannel("A").point(lambda a: 255 if a > 140 else 0).getbbox()
    if not solid:
        return None
    x0, y0, x1, y1 = solid
    side = max(x1 - x0, y1 - y0) / (1 - 2 * PAD)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box = (round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2))
    canvas = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
    canvas.paste(im, (-box[0], -box[1]))
    out = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    out.putalpha(ImageChops.multiply(out.getchannel("A"), fade))
    return out


def detail(im):
    """A square around the coloured print on the blank, on white."""
    w, h = im.size
    px = im.load()
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = px[x, y]
            if a > 200 and max(r, g, b) - min(r, g, b) > 45:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    side = max(x1 - x0, y1 - y0) * 1.9 + 40
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    crop = im.crop((int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2))).resize((DETAIL, DETAIL), Image.LANCZOS)
    bg = Image.new("RGBA", crop.size, (255, 255, 255, 255))
    bg.alpha_composite(crop)
    return bg.convert("RGB")


def main(ids):
    fade = edge_fade(SIZE)
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".png") and (not ids or f[:-4] in ids))
    for f in files:
        pid = f[:-4]
        im = Image.open(os.path.join(SRC, f)).convert("RGBA")
        out = picture(im, fade)
        if out is None:
            print("EMPTY", pid)
            continue
        out.save(os.path.join(DST, pid + ".webp"), "WEBP", quality=86, method=6)
        if os.path.exists(os.path.join(DST, pid + "-detail.webp")):
            d = detail(im)
            if d is None:
                print("NO PRINT FOUND for detail", pid)
            else:
                d.save(os.path.join(DST, pid + "-detail.webp"), "WEBP", quality=88, method=6)
        print("written", pid)
    sizes = [os.path.getsize(os.path.join(DST, x)) for x in os.listdir(DST) if x.endswith(".webp")]
    print(f"{len(files)} pictures; public/products total {sum(sizes) // 1024} KB, largest {max(sizes) // 1024} KB")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
