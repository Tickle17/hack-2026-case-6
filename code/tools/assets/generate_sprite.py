#!/usr/bin/env python3
"""
Генерирует спрайт-лист через OpenAI Images API по промпту и референсам.

Ключ читается из ~/.config/openai/key (или OPENAI_API_KEY) и в репозиторий
не попадает. Результат — PNG с прозрачным фоном, дальше обычный конвейер
(prepare_pets.py → prepare_colors.py → optimize_images.py).

Запуск:
  python3 tools/assets/generate_sprite.py \
      --out sources/src-cat-adult-house.png \
      --prompt-file prompt.txt \
      sources/src-cat-house.png sources/src-cat-adult-idle.png
"""

import argparse
import base64
import json
import os
import subprocess
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prepare_pets import slice_sheet  # noqa: E402

KEY_FILE = os.path.expanduser('~/.config/openai/key')


def read_key():
    key = os.environ.get('OPENAI_API_KEY')
    if key:
        return key.strip()
    with open(KEY_FILE) as f:
        return f.read().strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    parser.add_argument('--prompt-file', required=True)
    parser.add_argument('--quality', default='high')
    parser.add_argument('--model', default='chatgpt-image-latest')
    parser.add_argument(
        '--match', nargs=3, metavar=('CHILD_POSE', 'CHILD_IDLE', 'ADULT_IDLE'),
        help='подогнать масштаб: поза к покою как у малыша',
    )
    parser.add_argument('refs', nargs='+')
    args = parser.parse_args()

    with open(args.prompt_file) as f:
        prompt = f.read()

    cmd = [
        'curl', '-sS', 'https://api.openai.com/v1/images/edits',
        '-H', f'Authorization: Bearer {read_key()}',
        '-F', f'model={args.model}',
        '-F', 'size=1536x1024',
        '-F', 'background=transparent',
        '-F', 'output_format=png',
        '-F', f'quality={args.quality}',
        '--form-string', f'prompt={prompt}',
    ]
    for ref in args.refs:
        cmd += ['-F', f'image[]=@{ref};type=image/png']

    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    response = json.loads(raw)
    if 'error' in response:
        sys.exit(f"OpenAI: {response['error'].get('message')}")

    with open(args.out, 'wb') as f:
        f.write(base64.b64decode(response['data'][0]['b64_json']))
    if args.match:
        match_scale(args.out, *args.match)
    print(f'записан {args.out}')


def frame_height(path):
    return max(frame.height for frame in slice_sheet(path))


def match_scale(path, child_pose, child_idle, adult_idle):
    """
    API рисует зверей мельче, чем исходные листы, а игра меряет позу
    относительно покоя. Увеличиваем лист, чтобы поза относилась к покою
    так же, как у малыша.
    """
    ratio = frame_height(child_pose) / frame_height(child_idle)
    target = ratio * frame_height(adult_idle)
    factor = target / frame_height(path)
    sheet = Image.open(path)
    sheet = sheet.resize(
        (round(sheet.width * factor), round(sheet.height * factor)), Image.NEAREST
    )
    sheet.save(path)
    print(f'масштаб ×{factor:.2f}')


if __name__ == '__main__':
    main()
