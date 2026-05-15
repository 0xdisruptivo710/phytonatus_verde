#!/usr/bin/env python
"""Copia os 4 selos oficiais para selos_oficiais/ com nomes limpos
e compressao web (max 400px, PNG optimize)."""
from pathlib import Path
from PIL import Image

src_dir = Path("assets/images/Certificações")
dst_dir = Path("assets/images/selos_oficiais")
dst_dir.mkdir(exist_ok=True)

MAPPING = {
    "selo_1_of.png": "appcc.png",   # APPCC
    "selo_2_of.png": "bpf.png",     # BPF Boas Praticas de Fabricacao
    "Selo_3_of.png": "fda.png",     # FDA Registered
    "selo_4_of.png": "sif.png",     # SIF Servico Inspecao Federal
}

MAX_WIDTH = 400

print(f"{'source':<22} {'dest':<14} {'antes':>10} {'depois':>10}")
print("-" * 60)
for src_name, dst_name in MAPPING.items():
    src = src_dir / src_name
    dst = dst_dir / dst_name
    size_before = src.stat().st_size

    im = Image.open(src)
    if im.mode not in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
    if im.width > MAX_WIDTH:
        ratio = MAX_WIDTH / im.width
        new_h = int(im.height * ratio)
        im = im.resize((MAX_WIDTH, new_h), Image.LANCZOS)
    # Quantize for smaller PNG if has alpha; usar optimize sempre
    im.save(dst, "PNG", optimize=True)

    size_after = dst.stat().st_size
    print(f"{src_name:<22} {dst_name:<14} {size_before/1024:>8.0f}K {size_after/1024:>8.0f}K")
