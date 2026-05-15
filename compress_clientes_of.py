#!/usr/bin/env python
"""Comprime os 4 logos OF e sobrescreve os nomes existentes em clientes_internacionais/."""
from pathlib import Path
from PIL import Image

base = Path("assets/images/clientes_internacionais")
MAX_WIDTH = 500

MAPPING = {
    "aster_of.png":            "aster.png",
    "Fazenda_sedrez_of.png":   "fazenda-sedrez.png",
    "la_pierre_of.png":        "la-pierre.png",
    "nuestra_cocina_of.png":   "nuestra-cocina.png",
}

print(f"{'source':<26} {'dest':<22} {'antes':>10} {'depois':>10}")
print("-" * 72)
for src_name, dst_name in MAPPING.items():
    src = base / src_name
    dst = base / dst_name
    size_before = src.stat().st_size

    im = Image.open(src)
    if im.mode not in ("RGBA", "LA"):
        im = im.convert("RGBA")
    if im.width > MAX_WIDTH:
        ratio = MAX_WIDTH / im.width
        new_h = int(im.height * ratio)
        im = im.resize((MAX_WIDTH, new_h), Image.LANCZOS)
    im.save(dst, "PNG", optimize=True)
    # Remove source _of file
    src.unlink()

    size_after = dst.stat().st_size
    print(f"{src_name:<26} {dst_name:<22} {size_before/1024:>8.0f}K {size_after/1024:>8.0f}K")
