#!/usr/bin/env python3
"""
Подготовка ассетов прогулки: слои параллакса, препятствия, финиш.

Про бесшовность. Слой прокручивается по кругу, поэтому его левый край
должен совпадать с правым. Генератор это гарантирует не всегда: если
разница краёв велика, слой склеивается сам с собой в зеркале — тогда
шва нет по построению (правый край зеркальной копии равен левому краю
оригинала).

Запуск:  python3 tools/assets/prepare_walk.py
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Нужен Pillow: pip3 install Pillow')

SRC_DIR = 'assets'
OUT_DIR = 'assets/walk'

LAYER_HEIGHT = 760
OBSTACLE_HEIGHT = 150
SHOP_HEIGHT = 700

ALPHA_CUTOFF = 128
COL_ALPHA = 20
MIN_ITEM_WIDTH = 30
# Куски ближе этого расстояния — один предмет: у лужи брызги отлетают
# от основной части на пару пикселей. Настоящие зазоры между предметами
# на листе — 45–60 px, поэтому порог должен быть заметно меньше.
MERGE_GAP = 20

# Насколько края могут различаться, чтобы считать слой бесшовным.
SEAM_TOLERANCE = 40

LAYERS = [
    ('src-walk-far.webp', 'far.webp'),
    ('src-walk-mid.webp', 'mid.webp'),
    ('src-walk-near.webp', 'near.webp'),
]

OBSTACLES_SHEET = 'src-walk-obstacles.png'
OBSTACLE_NAMES = ['puddle.webp', 'box.webp', 'bush.webp', 'bench.webp']

SHOP_SRC = 'src-walk-shop.webp'


def harden_alpha(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 255 if v >= ALPHA_CUTOFF else 0)
    return Image.merge('RGBA', (r, g, b, a))


def seam_diff(im):
    px = im.load()
    w, h = im.size
    total = 0
    n = 0
    for y in range(0, h, 2):
        left, right = px[0, y], px[w - 1, y]
        total += sum(abs(left[i] - right[i]) for i in range(4))
        n += 1
    return total / max(1, n)


def make_seamless(im):
    """Склейка с зеркальной копией: правый край копии равен левому краю оригинала."""
    w, h = im.size
    out = Image.new('RGBA', (w * 2, h), (0, 0, 0, 0))
    out.paste(im, (0, 0))
    out.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    return out


def scale_to_height(im, height):
    ratio = height / im.height
    return im.resize((max(1, round(im.width * ratio)), height), Image.LANCZOS)


def spans(im):
    w, h = im.size
    a = im.split()[3].load()
    out, start = [], None
    for x in range(w):
        filled = any(a[x, y] > COL_ALPHA for y in range(0, h, 3))
        if filled and start is None:
            start = x
        elif not filled and start is not None:
            if x - start >= MIN_ITEM_WIDTH:
                out.append((start, x))
            start = None
    if start is not None:
        out.append((start, w))

    merged = []
    for span in out:
        if merged and span[0] - merged[-1][1] < MERGE_GAP:
            merged[-1] = (merged[-1][0], span[1])
        else:
            merged.append(span)
    return merged


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    for src, out_name in LAYERS:
        path = os.path.join(SRC_DIR, src)
        if not os.path.exists(path):
            print(f'нет исходника: {src}')
            continue
        im = Image.open(path).convert('RGBA')
        diff = seam_diff(im)
        if diff > SEAM_TOLERANCE:
            im = make_seamless(im)
            note = f'шов {diff:.0f} -> склеен зеркально'
        else:
            note = f'шов {diff:.0f} -> стыкуется как есть'
        im = scale_to_height(im, LAYER_HEIGHT)
        if im.mode == 'RGBA' and im.split()[3].getextrema()[0] < 255:
            im = harden_alpha(im)
        im.save(os.path.join(OUT_DIR, out_name), optimize=True)
        print(f'{out_name}: {im.width}x{im.height} ({note})')

    sheet_path = os.path.join(SRC_DIR, OBSTACLES_SHEET)
    if os.path.exists(sheet_path):
        sheet = harden_alpha(Image.open(sheet_path).convert('RGBA'))
        found = spans(sheet)
        if len(found) != len(OBSTACLE_NAMES):
            print(f'препятствий найдено {len(found)}, ожидалось {len(OBSTACLE_NAMES)}')
        else:
            for (s, e), name in zip(found, OBSTACLE_NAMES):
                item = sheet.crop((s, 0, e, sheet.height))
                box = item.getbbox()
                if box:
                    item = item.crop(box)
                item = harden_alpha(scale_to_height(item, OBSTACLE_HEIGHT))
                item.save(os.path.join(OUT_DIR, name), optimize=True)
                print(f'{name}: {item.width}x{item.height}')

    shop_path = os.path.join(SRC_DIR, SHOP_SRC)
    if os.path.exists(shop_path):
        shop = harden_alpha(Image.open(shop_path).convert('RGBA'))
        box = shop.getbbox()
        if box:
            shop = shop.crop(box)
        shop = harden_alpha(scale_to_height(shop, SHOP_HEIGHT))
        shop.save(os.path.join(OUT_DIR, 'shop.webp'), optimize=True)
        print(f'shop.webp: {shop.width}x{shop.height}')


if __name__ == '__main__':
    main()
