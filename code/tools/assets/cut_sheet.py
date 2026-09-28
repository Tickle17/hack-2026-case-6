#!/usr/bin/env python3
"""
Разрезает сводный лист от генератора на отдельные спрайт-листы.

Зачем. Генератор отдаёт всё одной картинкой: четыре вида животных,
по три позы на каждого, плюс предметы — и всё это на непрозрачном
фоне-градиенте. Конвейеру нужны отдельные листы с прозрачным фоном,
по одному на «вид + поза».

Два действия, каждое со своей хитростью.

1. ФОН. Заливка от краёв, но сравнивается не с начальной точкой, а с
   СОСЕДНИМ пикселем. Фон — плавный градиент от почти чёрного по углам
   до светло-коричневого в середине: сравнение с одним опорным цветом
   либо оставит половину фона, либо съест животных. Пошаговое сравнение
   идёт по градиенту и останавливается на резкой границе спрайта.

   Допуск подобран вручную: при 28 заливка протекала сквозь тёмные
   черепицы на крыше домика и через тень на морде обезьянки.

2. РЕЗКА. Ряды и столбцы ищутся по самой картинке, а не по числам из
   головы: генератор в следующий раз расставит спрайты иначе. Кадры
   внутри позы стоят плотно, между позами зазор шире — по этому
   разрыву позы и разделяются.

Запуск:  python3 tools/assets/cut_sheet.py sources/<файл>.png
"""

import os
import sys
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit('Нужен Pillow: pip3 install Pillow')

OUT_DIR = 'sources'

#: Порог заливки фона: сумма разницы по трём каналам с соседом.
BG_TOLERANCE = 14

#: Разрыв, по которому отделяются ПОЗЫ друг от друга.
#: Внутри позы кадры стоят вплотную (разрывы до 10 px, местами
#: хвост одного кадра заходит на соседний), между позами — от 21 px.
GROUP_GAP = 15

#: Прозрачный зазор между кадрами в готовом листе. Нарезчик
#: prepare_pets.py режет лист по прозрачным столбцам, а в исходнике
#: их нет — кадры склеились бы в один.
GUTTER = 8

#: Разрыв между рядами. Маленький намеренно: между обезьянками и
#: предметами внизу всего 7 пустых строк, и при большем пороге два
#: ряда склеивались в один.
ROW_GAP = 5

#: Во сколько раз увеличить. Генератор рисует мельче существующих
#: листов, и без увеличения новые позы оказались бы вчетверо мельче
#: ходящего питомца.
#:
#: Тройка, а не четвёрка. Сначала подгонял по ОБЩЕЙ высоте кадра — и
#: промахнулся: в позе игры у зверя задран хвост, высота набирается им,
#: а тело выходит на треть крупнее, чем на старых листах. Животное
#: заметно «раздувалось», стоило ему лечь. Тройка сводит тело и голову
#: с остальными позами; проверялось сравнением силуэтов бок о бок.
#:
#: Целое число намеренно: при дробном увеличении без сглаживания
#: пиксели получаются разного размера, и рисунок «рябит».
PET_UPSCALE = 3
THING_UPSCALE = 2

#: Что где лежит. Порядок рядов сверху вниз, поз — слева направо.
LAYOUT = [
    (['cat-sleep', 'cat-ball', 'cat-house'], 4),
    (['dog-sleep', 'dog-ball', 'dog-house'], 4),
    (['pig-sleep', 'pig-ball', 'pig-house'], 4),
    (['monkey-sleep', 'monkey-ball', 'monkey-house'], 4),
    (['room-house', 'room-bed', 'room-ball'], 1),
]


def drop_background(im, tolerance=BG_TOLERANCE):
    """Убирает фон заливкой от краёв. Возвращает RGBA."""
    rgb = im.convert('RGB')
    w, h = rgb.size
    data = rgb.tobytes()

    bg = bytearray(w * h)
    queue = deque()

    def seed(i):
        if not bg[i]:
            bg[i] = 1
            queue.append(i)

    for x in range(w):
        seed(x)
        seed((h - 1) * w + x)
    for y in range(h):
        seed(y * w)
        seed(y * w + w - 1)

    while queue:
        i = queue.popleft()
        b = i * 3
        r0, g0, b0 = data[b], data[b + 1], data[b + 2]
        x, y = i % w, i // w
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            j = ny * w + nx
            if bg[j]:
                continue
            c = j * 3
            near = (
                abs(data[c] - r0) + abs(data[c + 1] - g0) + abs(data[c + 2] - b0)
            )
            if near <= tolerance:
                bg[j] = 1
                queue.append(j)

    out = rgb.convert('RGBA')
    out.putalpha(Image.frombytes('L', (w, h), bytes(0 if v else 255 for v in bg)))
    return out


def opaque_rows(alpha, w, h):
    """Полосы строк, в которых что-то есть."""
    px = alpha.load()
    filled = [any(px[x, y] for x in range(0, w, 2)) for y in range(h)]
    return spans_of(filled, gap=ROW_GAP)


def spans_of(flags, gap):
    """Непрерывные участки True, склеенные через разрывы до `gap`."""
    spans, start = [], None
    for i, on in enumerate(flags):
        if on and start is None:
            start = i
        elif not on and start is not None:
            spans.append((start, i))
            start = None
    if start is not None:
        spans.append((start, len(flags)))

    merged = []
    for s in spans:
        if merged and s[0] - merged[-1][1] <= gap:
            merged[-1] = (merged[-1][0], s[1])
        else:
            merged.append(s)
    return merged


def pose_spans(alpha, band, w):
    """Позы в полосе: группы кадров, разделённые широким зазором."""
    px = alpha.load()
    top, bottom = band
    filled = [any(px[x, y] for y in range(top, bottom, 2)) for x in range(w)]
    return spans_of(filled, gap=GROUP_GAP)


def frame_cuts(alpha, band, left, right, count):
    """Границы кадров внутри позы.

    Кадры нарисованы вплотную, местами внахлёст: хвост одного заходит
    на соседний. Поэтому режем не по пустому месту (его нет), а по
    столбцу с НАИМЕНЬШИМ количеством закрашенных пикселей рядом с
    ожидаемой границей — там потеряется меньше всего рисунка.
    """
    px = alpha.load()
    top, bottom = band
    ink = [
        sum(1 for y in range(top, bottom) if px[x, y]) for x in range(left, right)
    ]
    step = (right - left) / count

    cuts = [left]
    for k in range(1, count):
        centre = left + round(k * step)
        window = max(2, int(step * 0.18))
        lo = max(left + 1, centre - window)
        hi = min(right - 1, centre + window)
        cuts.append(min(range(lo, hi), key=lambda x: ink[x - left]))
    cuts.append(right)
    return list(zip(cuts, cuts[1:]))


def main():
    if len(sys.argv) < 2:
        sys.exit('Укажите файл: python3 tools/assets/cut_sheet.py sources/lист.png')
    src = sys.argv[1]

    im = drop_background(Image.open(src))
    w, h = im.size
    alpha = im.split()[3]

    bands = opaque_rows(alpha, w, h)
    if len(bands) != len(LAYOUT):
        sys.exit(
            f'ожидалось рядов: {len(LAYOUT)}, найдено {len(bands)}. '
            'Проверьте картинку или LAYOUT.'
        )

    os.makedirs(OUT_DIR, exist_ok=True)
    for band, (names, per_group) in zip(bands, LAYOUT):
        spans = pose_spans(alpha, band, w)
        if len(spans) != len(names):
            sys.exit(
                f'ряд {names[0]}: ожидалось поз {len(names)}, '
                f'найдено {len(spans)}. Разрывы: '
                f'{[spans[i + 1][0] - spans[i][1] for i in range(len(spans) - 1)]}'
            )

        scale = THING_UPSCALE if per_group == 1 else PET_UPSCALE
        for name, (left, right) in zip(names, spans):
            cells = frame_cuts(alpha, band, left, right, per_group)
            height = band[1] - band[0]

            # Собираем лист заново, разводя кадры прозрачным зазором.
            width = sum(b - a for a, b in cells) + GUTTER * (len(cells) - 1)
            sheet = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            at = 0
            for a, b in cells:
                sheet.paste(im.crop((a, band[0], b, band[1])), (at, 0))
                at += (b - a) + GUTTER

            box = sheet.getbbox()
            if box:
                # Обрезаем только сверху и снизу: по горизонтали поля
                # держат зазоры между кадрами.
                sheet = sheet.crop((0, box[1], sheet.width, box[3]))
            sheet = sheet.resize(
                (sheet.width * scale, sheet.height * scale), Image.NEAREST
            )
            out = os.path.join(OUT_DIR, f'src-{name}.png')
            sheet.save(out)
            print(f'{out}: {sheet.width}×{sheet.height}, кадров {len(cells)}')


if __name__ == '__main__':
    main()
