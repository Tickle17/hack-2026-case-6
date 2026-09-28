#!/usr/bin/env python3
"""
Нарезка листа предметов на отдельные PNG.

Предметы режутся по прозрачным колонкам — так же, как кадры анимаций.
Каждый обрезается по своему содержимому: они не связаны друг с другом,
и общий bbox им не нужен.

Запуск:  python3 tools/assets/prepare_items.py
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Нужен Pillow: pip3 install Pillow')

# Исходники генератора лежат ВНЕ assets: всё, что в assets,
# попадает в сборку, а 54 МБ входных файлов пользователю не нужны.
SRC_DIR = 'sources'
OUT_DIR = 'assets/items'

TARGET_HEIGHT = 190
ALPHA_CUTOFF = 128
COL_ALPHA = 20
MIN_ITEM_WIDTH = 30
# Колонки ближе этого расстояния — части одной иконки, а не соседние.
#
# Предмет не обязан быть одним пятном: у значка запаха три отдельные
# волны и муха рядом, и по пустым колонкам это распадалось на шесть
# «предметов» вместо пяти.
#
# Порог включается ПОЛИСТОВО: на листе иконок соседи разведены зазором
# под сотню пикселей, а на листе банных предметов они стоят вплотную,
# и та же склейка слепила бы их в один.
MERGE_GAP = 40
MERGE_SHEETS = {'src-ui-icons.png'}

# Лист -> имена предметов слева направо. Порядок должен совпадать
# с порядком шагов в bath-steps.ts.
SHEETS = {
    # Иконки интерфейса. Эмодзи здесь не годились: ✋ на плитке
    # «погладить» и ✋ в подсказке — один и тот же рисунок с разным
    # смыслом, и это сбивало.
    'src-ui-icons.png': [
        'ui-point.webp',
        'task-pet.webp',
        'task-bath.webp',
        'task-walk.png',
        'ui-smell.png',
    ],
    'src-bath-items.png': [
        'bath-wet.png',
        'bath-soap.png',
        'bath-rinse.png',
        'bath-dry.webp',
        'bath-brush.png',
    ],
}


def merge_close(spans):
    """Склеивает колонки, разделённые зазором меньше MERGE_GAP."""
    merged = []
    for start, end in spans:
        if merged and start - merged[-1][1] < MERGE_GAP:
            merged[-1] = (merged[-1][0], end)
        else:
            merged.append((start, end))
    return merged


def harden_alpha(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 255 if v >= ALPHA_CUTOFF else 0)
    return Image.merge('RGBA', (r, g, b, a))


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
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, names in SHEETS.items():
        path = os.path.join(SRC_DIR, src)
        if not os.path.exists(path):
            print(f'нет исходника: {src}')
            continue
        sheet = harden_alpha(Image.open(path).convert('RGBA'))
        found = spans(sheet)
        if src in MERGE_SHEETS:
            found = merge_close(found)
        if len(found) != len(names):
            print(f'{src}: найдено {len(found)} предметов, ожидалось {len(names)} — проверьте зазоры')
            continue
        for (s, e), name in zip(found, names):
            item = sheet.crop((s, 0, e, sheet.height))
            box = item.getbbox()
            if box:
                item = item.crop(box)
            ratio = TARGET_HEIGHT / item.height
            item = harden_alpha(
                item.resize((max(1, round(item.width * ratio)), TARGET_HEIGHT), Image.LANCZOS)
            )
            item.save(os.path.join(OUT_DIR, name), optimize=True)
            print(f'{name}: {item.width}x{item.height}')


if __name__ == '__main__':
    main()
