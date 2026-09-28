SRC_DIR = 'sources'
#!/usr/bin/env python3
"""
Подготовка иконок целей накопления и направлений бюджета.

Исходники приходят 1254×1254 с большими полями. Обрезаем по содержимому
и уменьшаем: на экране они занимают 60–120 px, тащить мегабайты незачем.

Запуск:  python3 tools/assets/prepare_budget.py
"""

import os
from PIL import Image

JOBS = {
    # Вещи, на которые копят. Одна картинка на два места: карточку в
    # копилке и саму вещь на полу в комнате. Рисуются в перспективе
    # комнаты — там требования строже, а карточке ракурс безразличен.
    'src-room-house.png': ('assets/things/house.webp', 320),
    'src-room-bed.png': ('assets/things/bed.webp', 320),
    'src-room-ball.png': ('assets/things/ball.webp', 200),
    # монета: используется от 26 px в шапке до 44 px на карточках
    'src-coin.png': ('assets/budget/coin.png', 128),
    'src-coin-stack.png': ('assets/budget/coin-stack.webp', 160),
    # значки направлений — мельче, стоят в строке
    'src-jar-must.png': ('assets/budget/must.webp', 160),
    'src-jar-want.png': ('assets/budget/want.webp', 160),
    'src-jar-save.png': ('assets/budget/save.webp', 160),
}


def main():
    for src, (dst, size) in JOBS.items():
        path = os.path.join(SRC_DIR, src)
        if not os.path.exists(path):
            print(f'нет исходника: {src}')
            continue

        im = Image.open(path).convert('RGBA')

        # Полупрозрачные пиксели по краю дают грязную кайму при масштабе.
        alpha = im.split()[3].point(lambda a: 255 if a > 40 else 0)
        im.putalpha(alpha)

        box = im.getbbox()
        if box:
            im = im.crop(box)

        # Вписываем в квадрат, сохраняя пропорции: иначе мяч станет овалом.
        w, h = im.size
        scale = size / max(w, h)
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

        os.makedirs(os.path.dirname(dst), exist_ok=True)
        im.save(dst)
        print(f'{os.path.basename(dst)}: {im.size[0]}x{im.size[1]}, {os.path.getsize(dst) // 1024} КБ')


if __name__ == '__main__':
    main()
