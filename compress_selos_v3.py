#!/usr/bin/env python
"""Processa os novos selos golden uploaded pela Ana.
Mapeia selo_X_of.png para os nomes finais e resize para 800px max.
Preserva transparencia (RGBA).
"""
from pathlib import Path
from PIL import Image, ImageOps
import shutil

SRC = Path("assets/images/Certificações")
DST = Path("assets/images/selos_oficiais")
BACKUP = Path("assets/images/_originals/selos_oficiais_v3")
BACKUP.mkdir(parents=True, exist_ok=True)

MAPPING = {
    "selo_1_of.png": "appcc.png",
    "selo_2_of.png": "bpf.png",
    "Selo_3_of.png": "fda.png",
    "selo_4_of.png": "sif.png",
}

MAX_W = 800


def resize(im, max_w=MAX_W):
    if im.width <= max_w:
        return im
    ratio = max_w / im.width
    return im.resize((max_w, int(im.height * ratio)), Image.LANCZOS)


# backup dos selos atuais
for f in DST.glob("*.png"):
    shutil.copy2(f, BACKUP / f.name)

print(f"{'src':<22} -> {'dst':<10} {'size':>8}")
print("-" * 48)
for src_name, dst_name in MAPPING.items():
    src = SRC / src_name
    if not src.exists():
        print(f"{src_name}: NOT FOUND")
        continue
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im = resize(im)
    dst = DST / dst_name
    im.save(dst, "PNG", optimize=True)
    size_kb = dst.stat().st_size / 1024
    print(f"{src_name:<22} -> {dst_name:<10} {size_kb:>6.0f}K")
