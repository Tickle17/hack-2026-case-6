#!/usr/bin/env python3
"""
Сжатие готовых ресурсов перед сборкой.

Исходники приходят из генератора как PNG со сглаживанием — в фоне
комнаты 355 тысяч цветов и 3,5 МБ. Пользователь скачивает это при
установке.

Почему WebP, а не палитра. Квантование до 256 цветов даёт полосы
на градиентах: стена магазина становится пятнистой. WebP q90 при
том же весе сохраняет градиент без видимой разницы — проверено
сравнением в натуральную величину.

Android понимает WebP нативно, React Native грузит его как обычную
картинку. Прозрачность сохраняется.

Запуск:  python3 tools/assets/optimize_images.py
Идемпотентно: PNG заменяется на WebP, повторный запуск ничего не делает.
"""

import os
import re

from PIL import Image

TARGETS = [
    'assets/rooms',
    'assets/walk',
    'assets/characters',
    'assets/pets',
    'assets/things',
    'assets/budget',
    'assets/items',
]

QUALITY = 90
MIN_BYTES = 30 * 1024

# Где правятся ссылки после смены расширения.
CODE_DIRS = ['src', 'tools/assets']


def repoint_old(text):
    """Чинит ссылки на PNG, который стал WebP в один из ПРОШЛЫХ запусков.

    Генераторы пишут пути с расширением .png — они ведь и создают PNG.
    Если картинки пережаты давно, а конфиг перегенерировали сегодня, в
    нём снова появляются .png, которых на диске уже нет, и приложение
    падает на загрузке. Правка ссылок «только что пережатых» файлов
    такие случаи не ловит: в этот запуск они не пережимались.

    Поэтому: любая ссылка на assets/…png, рядом с которой лежит .webp,
    переписывается на .webp. Обратное не делаем — PNG, который на диске
    есть, трогать незачем.
    """

    def fix(m):
        path = m.group(0)
        webp = path[:-4] + '.webp'
        return webp if not os.path.exists(path) and os.path.exists(webp) else path

    return re.sub(r'assets/[\w./-]+\.png', fix, text)


def main():
    renamed = {}
    before_total = after_total = 0

    for folder in TARGETS:
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.endswith('.png'):
                continue
            path = os.path.join(folder, name)
            size = os.path.getsize(path)
            if size < MIN_BYTES:
                continue

            out = path[:-4] + '.webp'
            Image.open(path).convert('RGBA').save(out, 'WEBP', quality=QUALITY, method=6)
            after = os.path.getsize(out)

            # Если выигрыша нет — оставляем PNG.
            if after >= size:
                os.remove(out)
                continue

            os.remove(path)
            renamed[name] = os.path.basename(out)
            before_total += size
            after_total += after

    # Ссылки в коде и генераторах должны указывать на новое расширение.
    touched = 0
    for root in CODE_DIRS:
        for dirpath, _, files in os.walk(root):
            for f in files:
                if not f.endswith(('.ts', '.tsx', '.py')):
                    continue
                p = os.path.join(dirpath, f)
                text = open(p, encoding='utf-8').read()
                original = text
                for old, new in renamed.items():
                    # Только целое имя файла: подстрочная замена ломала
                    # пути к исходникам — «house.png» совпадало внутри
                    # «src-goal-house.png» и переписывало его в .webp.
                    text = re.sub(rf'(?<![\w-]){re.escape(old)}\b', new, text)
                text = repoint_old(text)
                if text != original:
                    open(p, 'w', encoding='utf-8').write(text)
                    touched += 1

    mb = 1024 * 1024
    print(f'сжато: {len(renamed)} файлов, ссылок правлено в {touched} файлах')
    print(f'было {before_total / mb:.1f} МБ → стало {after_total / mb:.1f} МБ')


if __name__ == '__main__':
    main()
