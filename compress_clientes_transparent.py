#!/usr/bin/env python
"""Reprocessa logos clientes internacionais com fundo TRANSPARENTE.
- aster/fazenda-sedrez: ja sao RGBA com transparencia, apenas resize
- la-pierre: fundo branco -> chroma key (alpha por luminancia)
- nuestra-cocina: branco-sobre-preto, inverte e depois chroma key
"""
from pathlib import Path
from PIL import Image, ImageOps

SRC = Path("assets/images/_originals/clientes_internacionais")
DST = Path("assets/images/clientes_internacionais")
DST.mkdir(parents=True, exist_ok=True)

MAX_W = 480  # tamanho de exibicao final


def resize(im, max_w=MAX_W):
    if im.width <= max_w:
        return im
    ratio = max_w / im.width
    return im.resize((max_w, int(im.height * ratio)), Image.LANCZOS)


def quantize_keep_alpha(im_rgba, colors=160):
    """Quantize RGBA preservando alpha. Reduz file size mantendo transparencia."""
    if im_rgba.mode != "RGBA":
        return im_rgba
    a = im_rgba.getchannel("A")
    rgb = im_rgba.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    r, g, b = rgb.split()
    return Image.merge("RGBA", (r, g, b, a))


def chroma_key_light(im_rgb, thr_full=240, thr_zero=180):
    """Pixels brilhantes (white-ish) viram transparentes.
    thr_full: brilho >= => alpha 0
    thr_zero: brilho <= => alpha 255
    Linear no meio.
    """
    im_rgb = im_rgb.convert("RGB")
    out = im_rgb.convert("RGBA")
    pixels = list(out.getdata())
    new = []
    for r, g, b, _ in pixels:
        lum = (r + g + b) / 3
        if lum >= thr_full:
            a = 0
        elif lum <= thr_zero:
            a = 255
        else:
            a = int(255 * (thr_full - lum) / (thr_full - thr_zero))
        new.append((r, g, b, a))
    out.putdata(new)
    return out


def chroma_key_dark(im_rgb, thr_full=80, thr_zero=140):
    """Pixels escuros (black-ish) viram transparentes.
    Usado para logos brancos sobre fundo preto.
    """
    im_rgb = im_rgb.convert("RGB")
    out = im_rgb.convert("RGBA")
    pixels = list(out.getdata())
    new = []
    for r, g, b, _ in pixels:
        lum = (r + g + b) / 3
        if lum <= thr_full:
            a = 0
        elif lum >= thr_zero:
            a = 255
        else:
            a = int(255 * (lum - thr_full) / (thr_zero - thr_full))
        new.append((r, g, b, a))
    out.putdata(new)
    return out


print(f"{'file':<24} {'before':>10} {'after':>10}")
print("-" * 50)

# 1) aster.png — ja transparente
for name in ("aster.png", "fazenda-sedrez.png"):
    src = SRC / name
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im = resize(im)
    dst = DST / name
    before = src.stat().st_size
    im.save(dst, "PNG", optimize=True)
    after = dst.stat().st_size
    print(f"{name:<24} {before/1024:>8.0f}K {after/1024:>8.0f}K")

# 2) la-pierre.png — fundo branco -> chroma key luminance high
name = "la-pierre.png"
src = SRC / name
im = Image.open(src).convert("RGB")
im = chroma_key_light(im, thr_full=235, thr_zero=200)
im = resize(im)
im = quantize_keep_alpha(im, colors=96)
dst = DST / name
before = src.stat().st_size
im.save(dst, "PNG", optimize=True)
after = dst.stat().st_size
print(f"{name:<24} {before/1024:>8.0f}K {after/1024:>8.0f}K")

# 3) nuestra-cocina.png — fundo preto, logo branco
# Mantemos brilho (white = mantem como branco) mas alpha sai do PRETO
name = "nuestra-cocina.png"
src = SRC / name
im = Image.open(src).convert("RGB")
# fundo escuro -> transparente; texto branco permanece branco
im = chroma_key_dark(im, thr_full=70, thr_zero=130)
# Logo continua branco sobre transparente — para visivel em bege,
# inverter a cor (manter alpha)
r, g, b, a = im.split()
rgb = Image.merge("RGB", (r, g, b))
rgb_inv = ImageOps.invert(rgb)
r2, g2, b2 = rgb_inv.split()
im = Image.merge("RGBA", (r2, g2, b2, a))
im = resize(im)
im = quantize_keep_alpha(im, colors=96)
dst = DST / name
before = src.stat().st_size
im.save(dst, "PNG", optimize=True)
after = dst.stat().st_size
print(f"{name:<24} {before/1024:>8.0f}K {after/1024:>8.0f}K")
