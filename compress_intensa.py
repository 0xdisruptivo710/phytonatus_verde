#!/usr/bin/env python
"""Comprime as 16 fotos INTENSA para web: max 1920px largura, JPEG q82.
Substitui in-place. Originais ja estao em assets/images/_originals/.
"""
import os
from pathlib import Path
from PIL import Image, ImageOps

PHOTOS = [
    "home-pl-teaser-bg.jpg",
    "infra-producao.jpg",
    "brand-phytonatus.jpg",
    "brand-card-mel.jpg",
    "brand-block-mel.jpg",
    "cta-catalogo-marcas.jpg",
    "brand-card-gourmet.jpg",
    "brand-block-gourmet.jpg",
    "brand-card-nuts.jpg",
    "brand-block-nuts.jpg",
    "portfolio-completo.jpg",
    "home-ingredientes-puros.jpg",
    "hero-private-label.jpg",
    "infra-pd.jpg",
    "infra-qualidade.jpg",
    "hero-institucional.jpg",
]

MAX_WIDTH = 1920
QUALITY = 82

base = Path("assets/images")
total_before = 0
total_after = 0

print(f"{'arquivo':<32} {'antes':>10}  {'depois':>10}  reducao")
print("-" * 70)
for name in PHOTOS:
    path = base / name
    if not path.exists():
        print(f"{name:<32} (skipped, not found)")
        continue
    size_before = path.stat().st_size
    total_before += size_before

    im = Image.open(path)
    # Aplica orientacao do EXIF se houver
    im = ImageOps.exif_transpose(im)
    # Converte para RGB (alguns JPEGs podem chegar como modo P/CMYK)
    if im.mode != "RGB":
        im = im.convert("RGB")
    # Resize se mais largo que MAX_WIDTH (mantendo aspect ratio)
    if im.width > MAX_WIDTH:
        ratio = MAX_WIDTH / im.width
        new_h = int(im.height * ratio)
        im = im.resize((MAX_WIDTH, new_h), Image.LANCZOS)
    im.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)

    size_after = path.stat().st_size
    total_after += size_after
    reducao = 100 * (1 - size_after / size_before)
    print(f"{name:<32} {size_before/1024/1024:>8.1f}M  {size_after/1024:>8.0f}K  -{reducao:.1f}%")

print("-" * 70)
print(f"{'TOTAL':<32} {total_before/1024/1024:>8.1f}M  {total_after/1024/1024:>8.1f}M  -{100*(1-total_after/total_before):.1f}%")
