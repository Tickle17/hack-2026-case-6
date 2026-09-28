#!/usr/bin/env python3
"""
Генерация статических начертаний шрифта из вариативного.

Зачем. Nunito поставляется вариативным (ось веса 200–1000, умолчание 200 —
очень тонкое). Android не умеет менять ось по `fontWeight`: он ищет
отдельный файл нужного веса, не находит и молча откатывается на системный
Roboto. Ровно на этом сгорел Handjet.

Поэтому вырезаем из вариативного шрифта два фиксированных начертания
и подключаем их как РАЗНЫЕ семейства. Тогда `fontWeight` вообще не нужен,
и подмены произойти не может.

Запуск:  python3 tools/assets/prepare_fonts.py
Требует: fontTools (dev-зависимость, в приложение не попадает).
"""

import os
import sys

try:
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
except ImportError:
    sys.exit('Нужен fontTools: pip3 install fonttools')

# Исходный вариативный шрифт лежит ВНЕ assets: в сборку попадают
# только два готовых начертания, а 400 КБ исходника пользователю не нужны.
SRC = 'sources/fonts/Nunito-variable.ttf' 
OUT_DIR = 'assets/fonts'
ANDROID_DIR = 'android/app/src/main/assets/fonts'

# Имя файла -> вес по оси wght.
# 500 вместо 400: у Nunito обычный вес выглядит тонковато на цветном фоне,
# а текст читает семилетний ребёнок.
INSTANCES = {
    'NunitoGame-Regular.ttf': 500,
    'NunitoGame-Bold.ttf': 800,
}


def main():
    if not os.path.exists(SRC):
        sys.exit(f'нет исходника: {SRC}')

    for name, weight in INSTANCES.items():
        font = TTFont(SRC)
        static = instancer.instantiateVariableFont(font, {'wght': weight})

        # Имя семейства должно отличаться, иначе Android спутает начертания.
        family = name.replace('.ttf', '')
        for record in static['name'].names:
            if record.nameID in (1, 3, 4, 6):
                record.string = family

        out = os.path.join(OUT_DIR, name)
        static.save(out)
        print(f'{name}: вес {weight}, {os.path.getsize(out) // 1024} КБ')

        if os.path.isdir(ANDROID_DIR):
            static.save(os.path.join(ANDROID_DIR, name))

    print(f'\nсемейства: {", ".join(n.replace(".ttf", "") for n in INSTANCES)}')


if __name__ == '__main__':
    main()
