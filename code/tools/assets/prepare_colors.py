#!/usr/bin/env python3
"""
Цветовые варианты питомцев.

ТЗ 2.6 требует не менее 9 визуально различимых комбинаций питомца.
Видов у нас четыре; рисовать пять новых зверей дорого, а перекрасить
существующие кадры — дёшево и даёт 4 × 3 = 12 комбинаций.

Перекрашиваются только «шерсть и кожа». Обводка, белки глаз и белые
лапы не трогаются: они почти не насыщены или очень тёмные, и по этим
двум признакам отличаются от окраса. Без такой защиты у кота синели
бы белки глаз.

Запуск:  python3 tools/assets/prepare_colors.py
"""

import colorsys
import glob
import os
import re

from PIL import Image

SRC_DIR = 'assets/pets'

# id -> (тон, множитель насыщенности, множитель светлоты)
# Тон задаётся абсолютным, а не сдвигом: так бурый выходит бурым
# у любого исходного окраса, а не «сдвинутым на столько-то».
VARIANTS = {
    'black': None,
    'brown': (0.07, 0.55, 0.72),
}

# Порог «это обводка или белок глаза, не трогаем».
MIN_SATURATION = 0.18
MIN_LIGHTNESS = 0.16


def recolor(im: Image.Image, hue: float, sat: float, light: float) -> Image.Image:
    out = im.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if ss < MIN_SATURATION or ll < MIN_LIGHTNESS:
                continue
            nr, ng, nb = colorsys.hls_to_rgb(
                hue % 1.0,
                max(0.0, min(1.0, ll * light)),
                max(0.0, min(1.0, ss * sat)),
            )
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return out


def recolor_black(im: Image.Image, species: str) -> Image.Image:
    """
    Чёрный окрас. Серый выглядел как ошибка цвета, чёрный — как настоящий
    зверь. Глаза, белые пятна и розовые уши с носом остаются как были:
    без них чёрный питомец читается угрюмым силуэтом. У свиньи розовое —
    это вся шкура, поэтому её перекрашиваем целиком.
    """
    out = im.copy()
    px = out.load()
    w, h = out.size
    whole = species == 'pig'
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if ss < MIN_SATURATION or ll < MIN_LIGHTNESS:
                continue
            if 0.18 < hh < 0.5:
                continue
            if not whole and (ll > 0.8 or ((hh > 0.88 or hh < 0.02) and ss > 0.35)):
                continue
            nr, ng, nb = colorsys.hls_to_rgb(0.62, min(1.0, ll * (0.42 if whole else 0.38)), ss * 0.2)
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return out


def main():
    # Берём только базовые кадры: уже перекрашенные пропускаем,
    # иначе при повторном запуске получится каскад.
    made = 0
    suffixes = tuple(f'--{v}.png' for v in VARIANTS)
    for path in sorted(glob.glob(os.path.join(SRC_DIR, '*.png'))):
        if path.endswith(suffixes):
            continue
        base = Image.open(path).convert('RGBA')
        stem = path[:-4]
        for vid, params in VARIANTS.items():
            out = f'{stem}--{vid}.png'
            species = os.path.basename(stem).split('-')[0]
            painted = recolor_black(base, species) if params is None else recolor(base, *params)
            painted.save(out)
            made += 1
    print(f'создано вариантов: {made}')
    print(f'комбинаций всего: 4 вида × {len(VARIANTS) + 1} окраса = {4 * (len(VARIANTS) + 1)}')


if __name__ == '__main__':
    main()
