#!/usr/bin/env python3
"""
Нарезка спрайт-листов питомцев на кадры + генерация конфига анимаций.

Главное здесь — ВЫРАВНИВАНИЕ. Если обрезать каждый кадр по своему контенту,
питомец дёргается при смене кадра: поза в каждом кадре разная, и «центр
картинки» гуляет. Поэтому:

  1. Кадры внутри листа режутся по прозрачным колонкам.
  2. Вертикальный диапазон обрезки — ОДИН на весь лист.
  3. Масштаб общий на вид животного, чтобы сидящий пёс не оказался вдруг
     выше идущего.

Скрипт также пишет src/entities/pet/config/animations.generated.ts:
пути в require() должны быть литералами, поэтому конфиг генерируется,
а не собирается в рантайме.

Запуск:  python3 tools/assets/prepare_pets.py
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
OUT_DIR = 'assets/pets'
GENERATED = 'src/entities/pet/config/animations.generated.ts'

# Высота кадра ЭТАЛОННОЙ позы после масштабирования. Позы выше эталона
# (хвост трубой) получают heightRatio больше единицы — так и надо.
TARGET_HEIGHT = 220
SCALE_REFERENCE = 'idle'

# Анимации, у которых в кадре нарисовано лишнее рядом с животным
# (клубы запаха, муха, лужица). Оставляем только само животное.
SOLO_SHEETS = {'dirty'}

# Программного притенения «под грязь» здесь НЕТ намеренно.
#
# Оно было, пока грязь на исходных листах рисовалась крапинами: при
# игровом размере (питомец около 60 dp) их не было видно, и грязный
# питомец выглядел чистым. На нынешних листах грязь нарисована крупно —
# пятна на теле, голове и лапах, — и дополнительный фильтр только
# забивал бы оттенки, которые художник уже выбрал.

ALPHA_CUTOFF = 128
COL_ALPHA = 20
MIN_FRAME_WIDTH = 30

# Позы, которые рисуются для взрослого вида (после третьего уровня).
# Все, включая грязь и купание: их питомец проходит каждый день, и
# без взрослых листов подросший зверь в них снова становился бы
# малышом. Набор может собираться постепенно — недостающая поза
# берётся из обычного (animationSetKey), а без покоя, ходьбы и грязи
# взрослый вид не включается вовсе (appearance.ts).
ADULT_POSES = [
    'idle', 'walk', 'dirty', 'bath', 'happy', 'eat', 'sleep', 'ball', 'house',
]

# вид -> {анимация: файл-исходник}
SHEETS = {
    'cat': {
        # Позы у накопленных вещей. Листов может ещё не быть — скрипт
        # такие просто пропускает, а игра подставляет ближайшую позу.
        'sleep': 'src-cat-sleep.png',
        'ball': 'src-cat-ball.png',
        'house': 'src-cat-house.png',
        'eat': 'src-cat-eat.png',
        'happy': 'src-cat-happy.png',
        'walk': 'src-cat-walk.png',
        'idle': 'src-cat-idle.png',
        'dirty': 'src-cat-dirty.png',
        'bath': 'src-cat-bath.png',
    },
    'dog': {
        # Позы у накопленных вещей. Листов может ещё не быть — скрипт
        # такие просто пропускает, а игра подставляет ближайшую позу.
        'sleep': 'src-dog-sleep.png',
        'ball': 'src-dog-ball.png',
        'house': 'src-dog-house.png',
        'happy': 'src-dog-happy.png',
        'play': 'src-dog-play.png',
        'eat': 'src-dog-eat.png',
        'walk': 'src-dog-walk.png',
        'idle': 'src-dog-idle.png',
        'dirty': 'src-dog-dirty.png',
        'bath': 'src-dog-bath.png',
    },
    'pig': {
        # Позы у накопленных вещей. Листов может ещё не быть — скрипт
        # такие просто пропускает, а игра подставляет ближайшую позу.
        'sleep': 'src-pig-sleep.png',
        'ball': 'src-pig-ball.png',
        'house': 'src-pig-house.png',
        'idle': 'src-pig-idle.png',
        'dirty': 'src-pig-dirty.png',
        'bath': 'src-pig-bath.png',
        'walk': 'src-pig-walk.png',
        'play': 'src-pig-play.png',
        'happy': 'src-pig-happy.png',
        'eat': 'src-pig-eat.png',
    },
    'monkey': {
        # Позы у накопленных вещей. Листов может ещё не быть — скрипт
        # такие просто пропускает, а игра подставляет ближайшую позу.
        'sleep': 'src-monkey-sleep.png',
        'ball': 'src-monkey-ball.png',
        'house': 'src-monkey-house.png',
        'play': 'src-monkey-play.png',
        'happy': 'src-monkey-happy.png',
        'walk': 'src-monkey-walk.png',
        'idle': 'src-monkey-idle.png',
        'dirty': 'src-monkey-dirty.png',
        'bath': 'src-monkey-bath.png',
        'eat': 'src-monkey-eat.png',
    },
}


# Взрослые наборы: «cat-adult» и т. д. Листов может ещё не быть —
# скрипт такие пропускает, игра показывает обычный вид.
for _species in list(SHEETS):
    SHEETS[f'{_species}-adult'] = {
        pose: f'src-{_species}-adult-{pose}.png' for pose in ADULT_POSES
    }


def harden_alpha(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 255 if v >= ALPHA_CUTOFF else 0)
    return Image.merge('RGBA', (r, g, b, a))


def frame_spans(im):
    w, h = im.size
    a = im.split()[3].load()
    spans, start = [], None
    for x in range(w):
        filled = any(a[x, y] > COL_ALPHA for y in range(0, h, 3))
        if filled and start is None:
            start = x
        elif not filled and start is not None:
            if x - start >= MIN_FRAME_WIDTH:
                spans.append((start, x))
            start = None
    if start is not None:
        spans.append((start, w))
    return spans


def keep_largest(im):
    """Оставляет в кадре только самое крупное пятно, не двигая его.

    Нужно для «грязных» листов: над животным нарисованы клубы запаха
    и муха, а под лапами — лужица. Всё это отдельные пятна, и если их
    не убрать, общая высота кадра вырастает, а масштаб вида считается
    по самой высокой позе — питомец стал бы заметно мельче, стоило ему
    испачкаться.
    """
    solo = largest_component(im)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    # largest_component обрезает по bbox; возвращаем пятно на место,
    # иначе поедет общий вертикальный диапазон листа.
    box = im.getbbox()
    if box is None:
        return out
    # Ищем, куда вставить: по столбцу и строке первого непрозрачного
    # пикселя самого крупного пятна в исходном кадре.
    mask = largest_component_mask(im)
    if not mask:
        return out
    left = min(x for x, _ in mask)
    top = min(y for _, y in mask)
    out.paste(solo, (left, top))
    return out


def largest_component_mask(im):
    """Координаты пикселей самого крупного связного пятна."""
    from collections import deque

    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    best = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy][sx] or px[sx, sy][3] == 0:
                continue
            queue = deque([(sx, sy)])
            seen[sy][sx] = True
            cells = []
            while queue:
                x, y = queue.popleft()
                cells.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] > 0:
                        seen[ny][nx] = True
                        queue.append((nx, ny))
            if len(cells) > len(best):
                best = cells
    return best


def slice_sheet(path, solo=False):
    """Кадры листа, обрезанные по общему вертикальному диапазону."""
    sheet = harden_alpha(Image.open(path).convert('RGBA'))
    frames = [sheet.crop((s, 0, e, sheet.height)) for s, e in frame_spans(sheet)]
    if solo:
        frames = [keep_largest(f) for f in frames]
    boxes = [f.getbbox() for f in frames if f.getbbox()]
    top = min(b[1] for b in boxes)
    bottom = max(b[3] for b in boxes)
    out = []
    for f in frames:
        fb = f.getbbox()
        out.append(f.crop((fb[0], top, fb[2], bottom)))
    return out


# Где в кадре еды лежит миска. У кота и обезьянки она касается животного,
# и связностью её не отделить — область задана вручную по кадру 0.
BOWL_RECTS = {
    'cat': (160, 140, 224, 190),
    'dog': (173, 141, 263, 194),
    'pig': (158, 127, 242, 187),
    'monkey': (170, 140, 237, 202),
}


def largest_component(im):
    """Оставляет только самую крупную связную область.

    В вырезку миски попадает край лапы животного. Отдельным пятном она
    отсекается сама, без ручной подгонки границ.
    """
    from collections import deque

    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    best = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy][sx] or px[sx, sy][3] == 0:
                continue
            queue = deque([(sx, sy)])
            seen[sy][sx] = True
            cells = []
            while queue:
                x, y = queue.popleft()
                cells.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny][3] > 0:
                        seen[ny][nx] = True
                        queue.append((nx, ny))
            if len(cells) > len(best):
                best = cells

    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    op = out.load()
    for x, y in best:
        op[x, y] = px[x, y]
    box = out.getbbox()
    return out.crop(box) if box else out


def extract_bowl(species, ratio):
    """Вырезает миску из кадра еды — ту самую, что видна в анимации."""
    rect = BOWL_RECTS.get(species)
    if not rect:
        return None
    src = Image.open(os.path.join(OUT_DIR, f'{species}-eat-0.png')).convert('RGBA')
    bowl = largest_component(src.crop(rect))
    name = f'{species}-bowl.png'
    bowl.save(os.path.join(OUT_DIR, name), optimize=True)
    return {'file': name, 'width': bowl.width, 'height': bowl.height}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    data = {}
    bowls = {}

    for species, sheets in SHEETS.items():
        prepared = {}
        for anim, src in sheets.items():
            path = os.path.join(SRC_DIR, src)
            if not os.path.exists(path):
                print(f'нет исходника: {src} ({species}/{anim})')
                continue
            prepared[anim] = slice_sheet(path, solo=anim in SOLO_SHEETS)
        if not prepared:
            continue

        # Масштаб общий на вид: относительные размеры поз сохраняются.
        #
        # Меряем по ПОКОЮ, а не по самой высокой позе. Раньше мерили по
        # самой высокой — и любая новая поза с задранным хвостом делала
        # питомца мельче во всех остальных сценах: масштаб вида в игре
        # привязан к эталону, и эталон уезжал. Поза покоя есть у всех
        # видов и не меняется, поэтому мера стабильная.
        base = prepared.get(SCALE_REFERENCE) or next(iter(prepared.values()))
        ratio = TARGET_HEIGHT / max(f.height for f in base)

        data[species] = {}
        for anim, frames in prepared.items():
            saved = []
            for i, f in enumerate(frames):
                w = max(1, round(f.width * ratio))
                h = max(1, round(f.height * ratio))
                out = harden_alpha(f.resize((w, h), Image.LANCZOS))
                name = f'{species}-{anim}-{i}.png'
                out.save(os.path.join(OUT_DIR, name), optimize=True)
                saved.append(name)
            fw = round(frames[0].width * ratio)
            fh = round(frames[0].height * ratio)
            data[species][anim] = {
                'files': saved,
                'width': fw,
                'height': fh,
                # Доля от самой высокой позы вида: сидящий пёс ниже идущего,
                # и на экране это должно быть видно.
                'heightRatio': round(fh / TARGET_HEIGHT, 4),
            }
            print(f'{species}/{anim}: {len(saved)} кадров {fw}x{fh}')

        bowl = extract_bowl(species, ratio)
        if bowl:
            bowls[species] = bowl
            print(f"{species}/bowl: {bowl['width']}x{bowl['height']}")

    write_generated(with_color_variants(data), bowls)


# Окрасы из prepare_colors.py. Ключ реестра — «вид--окрас»,
# чтобы require() остался литералом.
COLOR_SUFFIXES = ['black', 'brown']


def with_color_variants(data):
    """Добавляет в реестр перекрашенные наборы кадров.

    Файлы уже созданы prepare_colors.py; здесь мы только прописываем
    на них ссылки, потому что пути в require() обязаны быть литералами.
    """
    extended = dict(data)
    for species, anims in data.items():
        for suffix in COLOR_SUFFIXES:
            key = f'{species}--{suffix}'
            extended[key] = {
                name: {
                    **spec,
                    'files': [f.replace('.png', f'--{suffix}.png') for f in spec['files']],
                }
                for name, spec in anims.items()
            }
    return extended


def write_generated(data, bowls):
    lines = [
        '// СГЕНЕРИРОВАНО tools/assets/prepare_pets.py — не редактировать руками.',
        '// Пути в require() обязаны быть литералами, поэтому конфиг генерируется.',
        "import type {ImageSourcePropType} from 'react-native';",
        '',
        'export type GeneratedAnimation = {',
        '  frames: ImageSourcePropType[];',
        '  width: number;',
        '  height: number;',
        '  /** Доля от самой высокой позы вида. */',
        '  heightRatio: number;',
        '};',
        '',
        'export const GENERATED_ANIMATIONS: Record<',
        '  string,',
        '  Record<string, GeneratedAnimation>',
        '> = {',
    ]
    for species, anims in data.items():
        # Ключ «вид--окрас» содержит дефисы, поэтому всегда в кавычках.
        lines.append(f"  '{species}': {{")
        for anim, spec in anims.items():
            lines.append(f'    {anim}: {{')
            lines.append('      frames: [')
            for f in spec['files']:
                lines.append(f"        require('../../../../assets/pets/{f}'),")
            lines.append('      ],')
            lines.append(f"      width: {spec['width']},")
            lines.append(f"      height: {spec['height']},")
            lines.append(f"      heightRatio: {spec['heightRatio']},")
            lines.append('    },')
        lines.append('  },')
    lines.append('};')
    lines.append('')
    lines.append('/** Миска, вырезанная из кадра еды: та же, что в анимации. */')
    lines.append('export const GENERATED_BOWLS: Record<')
    lines.append('  string,')
    lines.append('  {source: ImageSourcePropType; width: number; height: number}')
    lines.append('> = {')
    for species, b in bowls.items():
        # Ключ «вид--окрас» содержит дефисы, поэтому всегда в кавычках.
        lines.append(f"  '{species}': {{")
        lines.append(f"    source: require('../../../../assets/pets/{b['file']}'),")
        lines.append(f"    width: {b['width']},")
        lines.append(f"    height: {b['height']},")
        lines.append('  },')
    lines.append('};')
    lines.append('')

    os.makedirs(os.path.dirname(GENERATED), exist_ok=True)
    with open(GENERATED, 'w') as fh:
        fh.write('\n'.join(lines))
    print(f'записан {GENERATED}')


if __name__ == '__main__':
    main()
