#!/usr/bin/env python
"""Round 2: re-curadoria - substitui 4 fotos por melhores escolhas.
Reusa pipeline do compress_intensa.py (max 1920px, JPEG q82, optimize, progressive)."""
from pathlib import Path
from PIL import Image, ImageOps

SRC_BANK = Path("/c/Users/Usuario/Downloads/EDITADOS-20260515T031424Z-3-001/EDITADOS")
# Versao Windows path
import os
if not SRC_BANK.exists():
    SRC_BANK = Path(os.path.expandvars("%USERPROFILE%")) / "Downloads" / "EDITADOS-20260515T031424Z-3-001" / "EDITADOS"

DST = Path("assets/images")
BACKUP = Path("assets/images/_originals")

# Slot do site -> INTENSA source -> arquivo final no projeto
SUBSTITUTIONS = [
    ("Hero Institucional",       "INTENSA-89.jpg",  "hero-institucional.jpg"),
    ("Ingredientes Puros",       "INTENSA-114.jpg", "home-ingredientes-puros.jpg"),
    ("PL Teaser",                "INTENSA-118.jpg", "home-pl-teaser-bg.jpg"),
    ("CTA Catalogo Marcas",      "INTENSA-88.jpg",  "cta-catalogo-marcas.jpg"),
]

MAX_WIDTH = 1920
QUALITY = 82

print(f"{'slot':<26} {'source':<18} {'dest':<32} {'antes':>10} {'depois':>10}")
print("-" * 100)
for slot_name, src_name, dst_name in SUBSTITUTIONS:
    src = SRC_BANK / src_name
    dst = DST / dst_name
    if not src.exists():
        print(f"{slot_name:<26} {src_name:<18} (source not found)")
        continue
    size_before = src.stat().st_size

    # Backup do original raw se ainda nao backed up
    backup_path = BACKUP / dst_name
    if not backup_path.exists():
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy2(src, backup_path)

    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGB":
        im = im.convert("RGB")
    if im.width > MAX_WIDTH:
        ratio = MAX_WIDTH / im.width
        new_h = int(im.height * ratio)
        im = im.resize((MAX_WIDTH, new_h), Image.LANCZOS)
    im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)

    size_after = dst.stat().st_size
    reducao = 100 * (1 - size_after / size_before)
    print(f"{slot_name:<26} {src_name:<18} {dst_name:<32} {size_before/1024/1024:>8.1f}M {size_after/1024:>8.0f}K (-{reducao:.1f}%)")
