#!/usr/bin/env python3
"""
Подготовка спрайтов персонажей из исходных PNG.

Что делает:
  1. Обрезает прозрачные поля — иначе персонаж «плавает» в пустоте
     и его нельзя точно поставить на пол.
  2. Убирает полупрозрачный ореол по краю: пиксели с альфой ниже порога
     становятся полностью прозрачными, выше — полностью непрозрачными.
     Без этого на цветном фоне комнаты вокруг персонажа виден светлый нимб.
  3. Ужимает до целевой высоты под экран телефона, чтобы не держать
     в памяти по 6 МБ на позу.

Запуск:  python3 tools/assets/prepare_actors.py
Требует: Pillow (dev-зависимость, в приложение не попадает).
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
OUT_DIR = 'assets/characters'

# Целевая высота: экран ~900 dp, персонаж занимает ~45%, плотность 3.
TARGET_HEIGHT = 1250

# Порог альфы. Ниже — прозрачно, выше — непрозрачно.
ALPHA_CUTOFF = 128

# Исходники → осмысленные имена. Позы мамы.
SOURCES = {
    # мама
    'src-mother-point.webp': 'mother-point.webp',
    'src-mother-kiss.webp': 'mother-kiss.webp',
    'src-mother-wave.webp': 'mother-wave.webp',
    'src-mother-wink.webp': 'mother-wink.webp',
    # папа
    'src-father-wave.webp': 'father-wave.webp',
    'src-father-gift.webp': 'father-gift.webp',
    'src-father-point.webp': 'father-point.webp',
    # учительница
    'src-teacher-wave.webp': 'teacher-wave.webp',
    'src-teacher-point.webp': 'teacher-point.webp',
    'src-teacher-book.webp': 'teacher-book.webp',
    'src-teacher-praise.webp': 'teacher-praise.webp',
    # продавец
    'src-seller-give.webp': 'seller-give.webp',
    'src-seller-point.webp': 'seller-point.webp',
    'src-seller-wave.webp': 'seller-wave.webp',
    'src-seller-idle.webp': 'seller-idle.webp',
    # ребёнок (герой)
    'src-hero-think.webp': 'hero-think.webp',
    'src-hero-wave.webp': 'hero-wave.webp',
    'src-hero-talk.webp': 'hero-talk.webp',
    'src-hero-love.webp': 'hero-love.webp',
    'src-hero-cheer.webp': 'hero-cheer.webp',
}


def harden_alpha(im: Image.Image) -> Image.Image:
    """Убирает полупрозрачный ореол по краям."""
    r, g, b, a = im.split()
    a = a.point(lambda v: 255 if v >= ALPHA_CUTOFF else 0)
    return Image.merge('RGBA', (r, g, b, a))


def process(src_path: str, out_path: str) -> None:
    im = Image.open(src_path).convert('RGBA')
    im = harden_alpha(im)

    box = im.getbbox()
    if box:
        im = im.crop(box)

    if im.height > TARGET_HEIGHT:
        ratio = TARGET_HEIGHT / im.height
        # LANCZOS: у исходника сглаженные края, «ближайший сосед» дал бы рвань
        im = im.resize((max(1, round(im.width * ratio)), TARGET_HEIGHT), Image.LANCZOS)
        im = harden_alpha(im)

    im.save(out_path, optimize=True)
    print(f'{os.path.basename(out_path)}: {im.width}x{im.height}')


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    missing = []
    for src, out in SOURCES.items():
        src_path = os.path.join(SRC_DIR, src)
        if not os.path.exists(src_path):
            missing.append(src)
            continue
        process(src_path, os.path.join(OUT_DIR, out))
    if missing:
        print('Не найдены исходники:', ', '.join(missing))


if __name__ == '__main__':
    main()
