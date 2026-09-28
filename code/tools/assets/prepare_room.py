#!/usr/bin/env python3
"""
Подготовка фона комнаты.

Проблема масштабирования: исходник 853×1844, экран 1280×2856. Прямое
увеличение в 1.5 раза даёт неровный пиксель — часть точек растягивается
вдвое, часть нет, и картинка «рябит».

Решение: увеличить целым множителем «ближайшим соседом» (пиксель остаётся
квадратным), затем уменьшить до размера экрана усреднением. Так растр
остаётся ровным, а итоговый файл не требует масштабирования в рантайме.

Запуск:  python3 tools/assets/prepare_room.py
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Нужен Pillow: pip3 install Pillow')

# Фоны сцен: исходник -> результат.
ROOMS = {
    'sources/src-room-home.png': 'assets/rooms/home.webp',
    'sources/src-room-school.png': 'assets/rooms/school.webp',
    'sources/src-room-shop.png': 'assets/rooms/shop.webp',
}

# Под плотный экран телефона.
TARGET_WIDTH = 1280

# Целый множитель перед уменьшением: чем больше, тем ровнее растр.
UPSCALE = 4


def main():
    for src, out_path in ROOMS.items():
        if not os.path.exists(src):
            print(f'нет исходника: {src}')
            continue
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        im = Image.open(src).convert('RGB')
        w, h = im.size

        big = im.resize((w * UPSCALE, h * UPSCALE), Image.NEAREST)
        target_h = round(TARGET_WIDTH * h / w)
        out = big.resize((TARGET_WIDTH, target_h), Image.BOX)

        out.save(out_path, optimize=True)
        print(f'{out_path}: {TARGET_WIDTH}x{target_h}, соотн {TARGET_WIDTH / target_h:.3f}')


if __name__ == '__main__':
    main()
