#!/usr/bin/env python3
"""
Подготовка сцен из двух слоёв (ванна: зад и перед).

ВАЖНО: слои НЕ обрезаются по содержимому. Обрезка каждого по своему bbox
сдвинула бы их друг относительно друга, и передний борт перестал бы
совпадать с задней стенкой. Холст сохраняется целиком, масштаб общий.

Запуск:  python3 tools/assets/prepare_scenes.py
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
OUT_DIR = 'assets/scenes'

# Ширина под экран телефона: сцена занимает почти всю ширину.
TARGET_WIDTH = 900
ALPHA_CUTOFF = 128

# Пары слоёв одной сцены. Масштаб внутри пары общий.
SCENES = {
    'tub': [
        ('src-tub-back.png', 'tub-back.png'),
        ('src-tub-front.png', 'tub-front.png'),
    ],
}


def harden_alpha(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 255 if v >= ALPHA_CUTOFF else 0)
    return Image.merge('RGBA', (r, g, b, a))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for scene, layers in SCENES.items():
        sizes = []
        for src, _ in layers:
            path = os.path.join(SRC_DIR, src)
            if not os.path.exists(path):
                print(f'нет исходника: {src}')
                return
            sizes.append(Image.open(path).size)

        if len(set(sizes)) > 1:
            print(f'{scene}: слои разного размера {sizes} — совмещения не будет')
            return

        w, h = sizes[0]
        ratio = TARGET_WIDTH / w
        out_h = round(h * ratio)

        for src, out_name in layers:
            im = harden_alpha(Image.open(os.path.join(SRC_DIR, src)).convert('RGBA'))
            im = harden_alpha(im.resize((TARGET_WIDTH, out_h), Image.LANCZOS))
            im.save(os.path.join(OUT_DIR, out_name), optimize=True)
            print(f'{out_name}: {TARGET_WIDTH}x{out_h}')

        print(f'{scene}: соотношение {TARGET_WIDTH / out_h:.3f}')


if __name__ == '__main__':
    main()
