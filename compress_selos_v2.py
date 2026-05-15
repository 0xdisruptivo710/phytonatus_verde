#!/usr/bin/env python
"""Processa os novos selos de certificacoes (ChatGPT-generated PNGs).
- Normaliza fundo para branco puro (corners pale-green viram brancos)
- Resize para 800px max width (display web)
- Salva como PNG otimizado em selos_oficiais/
"""
from pathlib import Path
from PIL import Image, ImageOps
import shutil

SRC = Path("assets/images/Certificações")
DST = Path("assets/images/selos_oficiais")
BACKUP = Path("assets/images/_originals/selos_oficiais_v2")
BACKUP.mkdir(parents=True, exist_ok=True)

# Mapeia os PNGs gerados -> nomes finais
MAPPING = {
    "ChatGPT Image 15 de mai. de 2026, 14_32_43.png": "fda.png",
    "ChatGPT Image 15 de mai. de 2026, 14_32_47.png": "appcc.png",
    "ChatGPT Image 15 de mai. de 2026, 14_36_49.png": "sif.png",
    "ChatGPT Image 15 de mai. de 2026, 14_38_00.png": "bpf.png",
}

MAX_W = 800
WHITE_THRESHOLD = 220  # pixels com RGB todos >= 220 viram branco puro


def normalize_to_white_bg(im):
    """Substitui pixels claros (pale green do ChatGPT) por branco puro."""
    im = im.convert("RGB")
    pixels = list(im.getdata())
    new = []
    for r, g, b in pixels:
        if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
            new.append((255, 255, 255))
        else:
            new.append((r, g, b))
    im.putdata(new)
    return im


def resize(im, max_w=MAX_W):
    if im.width <= max_w:
        return im
    ratio = max_w / im.width
    return im.resize((max_w, int(im.height * ratio)), Image.LANCZOS)


# Backup dos antigos selos_oficiais (caso precise reverter)
for f in DST.glob("*.png"):
    shutil.copy2(f, BACKUP / f.name)

print(f"{'src':<60} {'->':<3} {'dst':<10} {'size':>8}")
print("-" * 90)
for src_name, dst_name in MAPPING.items():
    src = SRC / src_name
    if not src.exists():
        print(f"{src_name}: NOT FOUND")
        continue
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    im = normalize_to_white_bg(im)
    im = resize(im)
    dst = DST / dst_name
    im.save(dst, "PNG", optimize=True)
    size_kb = dst.stat().st_size / 1024
    print(f"{src_name[:58]:<60} -> {dst_name:<10} {size_kb:>6.0f}K")
