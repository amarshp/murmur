#!/usr/bin/env python
"""Draws the Murmur mark: a glowing ember on a dark tile, in the same plasma
colours as the dictation pill (PillEmber.tsx EMBER_COLORS).

Writes src/assets/icon.png (1024 px), src/assets/icon.ico (16 to 256 px) and
src/assets/logo.svg. Needs Pillow.

Usage: python scripts/make-murmur-icon.py
"""
import math
import pathlib

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "src" / "assets"
SIZE = 1024

# Same molten palette as the pill.
ROSE = (255, 61, 110)
ORANGE = (255, 138, 31)
GOLD = (255, 210, 63)
VIOLET = (179, 61, 255)
FIRE = (255, 90, 40)


def blob(center, radius, rgb, strength=1.0):
    """A soft radial light, as a black-based RGB layer to add onto the tile."""
    layer = Image.new("RGB", (SIZE, SIZE), (0, 0, 0))
    mask = Image.radial_gradient("L").resize((radius * 2, radius * 2))
    # radial_gradient reaches 181 (not 255) at the middle of each edge, so
    # rescale to zero there: otherwise the light is clipped to a square.
    mask = mask.point(
        lambda v: int(255 * strength * (max(0.0, 1.0 - v / 181.0) ** 1.6))
    )
    tint = Image.new("RGB", mask.size, rgb)
    layer.paste(tint, (center[0] - radius, center[1] - radius), mask)
    return layer


def tile_background():
    top, bottom = (31, 22, 17), (14, 10, 8)
    img = Image.new("RGB", (SIZE, SIZE))
    px = img.load()
    for y in range(SIZE):
        t = y / (SIZE - 1)
        row = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(SIZE):
            px[x, y] = row
    return img


def draw():
    img = tile_background()
    cx, cy = SIZE // 2, int(SIZE * 0.53)
    lights = [
        ((cx, cy + 40), 470, VIOLET, 0.30),
        ((cx - 120, cy + 70), 360, ROSE, 0.80),
        ((cx + 130, cy + 60), 340, FIRE, 0.85),
        ((cx, cy), 300, ORANGE, 0.95),
        ((cx + 10, cy - 70), 190, GOLD, 0.95),
        ((cx, cy - 40), 90, (255, 245, 210), 0.9),
    ]
    for center, radius, rgb, strength in lights:
        img = ImageChops.add(img, blob(center, int(radius * 1.3), rgb, min(1.0, strength * 1.1)))
    img = img.filter(ImageFilter.GaussianBlur(6))

    # Rounded-square tile with a transparent outside.
    radius = int(SIZE * 0.225)
    mask = Image.new("L", (SIZE * 2, SIZE * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, SIZE * 2 - 1, SIZE * 2 - 1), radius=radius * 2, fill=255
    )
    mask = mask.resize((SIZE, SIZE), Image.LANCZOS)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def write_svg():
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f1611"/>
      <stop offset="1" stop-color="#0e0a08"/>
    </linearGradient>
    <radialGradient id="violet"><stop offset="0" stop-color="rgb(179,61,255)" stop-opacity=".3"/><stop offset="1" stop-color="rgb(179,61,255)" stop-opacity="0"/></radialGradient>
    <radialGradient id="rose"><stop offset="0" stop-color="rgb(255,61,110)" stop-opacity=".8"/><stop offset="1" stop-color="rgb(255,61,110)" stop-opacity="0"/></radialGradient>
    <radialGradient id="fire"><stop offset="0" stop-color="rgb(255,90,40)" stop-opacity=".85"/><stop offset="1" stop-color="rgb(255,90,40)" stop-opacity="0"/></radialGradient>
    <radialGradient id="orange"><stop offset="0" stop-color="rgb(255,138,31)" stop-opacity=".95"/><stop offset="1" stop-color="rgb(255,138,31)" stop-opacity="0"/></radialGradient>
    <radialGradient id="gold"><stop offset="0" stop-color="rgb(255,210,63)" stop-opacity=".95"/><stop offset="1" stop-color="rgb(255,210,63)" stop-opacity="0"/></radialGradient>
    <radialGradient id="core"><stop offset="0" stop-color="rgb(255,245,210)" stop-opacity=".9"/><stop offset="1" stop-color="rgb(255,245,210)" stop-opacity="0"/></radialGradient>
    <clipPath id="clip"><rect width="1024" height="1024" rx="230"/></clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="1024" height="1024" fill="url(#tile)"/>
    <g style="mix-blend-mode:screen">
      <circle cx="512" cy="583" r="470" fill="url(#violet)"/>
      <circle cx="392" cy="613" r="360" fill="url(#rose)"/>
      <circle cx="642" cy="603" r="340" fill="url(#fire)"/>
      <circle cx="512" cy="543" r="300" fill="url(#orange)"/>
      <circle cx="522" cy="473" r="190" fill="url(#gold)"/>
      <circle cx="512" cy="503" r="90" fill="url(#core)"/>
    </g>
  </g>
</svg>
"""
    (ASSETS / "logo.svg").write_text(svg, encoding="utf8")


def main():
    icon = draw()
    icon.save(ASSETS / "icon.png")
    sizes = [(s, s) for s in (16, 24, 32, 48, 64, 128, 256)]
    icon.save(ASSETS / "icon.ico", sizes=sizes)
    write_svg()
    print("wrote icon.png, icon.ico, logo.svg")


if __name__ == "__main__":
    main()
