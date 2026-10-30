#!/usr/bin/env python3
"""Regenerates the whole PWA icon set from `dev/branding/logo-source.png`.

Requirements: Pillow (`pip install pillow`)

Usage: python3 dev/branding/make_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
SOURCE = ROOT / "dev" / "branding" / "logo-source.png"

# (file name, size, rounded corners)
TARGETS = [
    ("icon-192x192.png", 192, True),
    ("icon-384x384.png", 384, True),
    ("icon-512x512.png", 512, True),
    ("icon-dev-192x192.png", 192, True),
    ("icon-dev-384x384.png", 384, True),
    ("icon-dev-512x512.png", 512, True),
    ("icon-square-192x192.png", 192, False),
    ("icon-square-384x384.png", 384, False),
    ("icon-square-512x512.png", 512, False),
    ("icon-square-dev-192x192.png", 192, False),
    ("icon-square-dev-384x384.png", 384, False),
    ("icon-square-dev-512x512.png", 512, False),
    ("apple-touch-icon.png", 180, False),
    ("apple-touch-icon-dev.png", 180, False),
    ("favicon-16x16.png", 16, False),
    ("favicon-32x32.png", 32, False),
    ("mstile-150x150.png", 270, False),
]


def rounded(image: Image.Image, radius_ratio: float = 0.22) -> Image.Image:
    size = image.size[0]
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * radius_ratio), fill=255,
    )
    mask = mask.resize((size, size), Image.LANCZOS)
    result = image.copy()
    result.putalpha(mask)
    return result


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    for file_name, size, use_rounding in TARGETS:
        icon = source.resize((size, size), Image.LANCZOS)
        if use_rounding:
            icon = rounded(icon)
        icon.save(PUBLIC / file_name, optimize=True)
        print(f"✓ public/{file_name}")

    ico_source = source.resize((256, 256), Image.LANCZOS)
    ico_source.save(
        PUBLIC / "favicon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("✓ public/favicon.ico")


if __name__ == "__main__":
    main()
