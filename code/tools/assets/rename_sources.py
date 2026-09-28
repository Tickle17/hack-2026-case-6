#!/usr/bin/env python3
"""
Переименование исходников из UUID в понятные имена.

Генератор отдаёт файлы вида `318ef503-4532-...png` — по такому имени
невозможно понять, что внутри, и через месяц никто не разберётся, какой
файл к какому персонажу относится.

Скрипт идемпотентный: если файл уже переименован, он пропускается.
После переименования обновляет ссылки в скриптах подготовки.

Запуск:  python3 tools/assets/rename_sources.py
"""

import os
import re
import sys

# Исходники генератора лежат ВНЕ assets: всё, что в assets,
# попадает в сборку, а 54 МБ входных файлов пользователю не нужны.
SRC_DIR = 'sources'

# UUID -> осмысленное имя
RENAMES = {
    # мама
    '318ef503-4532-4bf2-a40c-ce91d8046589': 'src-mother-point',
    '7e76ae8c-e7a2-4320-9fe4-0d7fa44ae54f': 'src-mother-kiss',
    'a9d03007-64ec-42dd-8ca0-ae69a7cb3029': 'src-mother-wave',
    'c5ec56fb-06f3-4725-901c-624874b9aae1': 'src-mother-wink',
    # папа
    '01df325d-eb9e-446e-aa23-d6444c9c6945': 'src-father-wave',
    '8fce42c6-3964-4e8d-a36f-a80acac1e6af': 'src-father-gift',
    'd8fd95ce-4b8c-427d-b5bd-949d5b3ac7a7': 'src-father-point',
    # ребёнок
    'e59f38b9-75db-4662-964b-409902dbb3fb': 'src-hero-think',
    '8cd494af-8701-4655-823b-0b4f81e3aa96': 'src-hero-wave',
    '57ba1555-0655-4185-8de4-b634d9ea4d17': 'src-hero-talk',
    '703775ec-8ed3-4027-94f5-535e9910485b': 'src-hero-love',
    'fb123e3b-e1ab-4c7d-a5ce-5a0596730d93': 'src-hero-cheer',
    # учительница
    'fb5aaf3e-3242-47b6-8d57-5db6f8425a3b': 'src-teacher-wave',
    '0aa7a099-cce6-45c1-88d0-01881638ec41': 'src-teacher-point',
    '52a830bd-4879-4634-9a2d-0984d205fed8': 'src-teacher-book',
    'c6a82c89-1fe3-46fb-8433-999b8eaae5d3': 'src-teacher-praise',
    # питомцы: кот
    '1b6cc3e7-f9ea-4800-a625-c3e2384b9905': 'src-cat-eat',
    '9912913a-387e-4bad-bd4b-92d46ef470b8': 'src-cat-happy',
    'ee602b6d-9ac6-46c1-8be1-7c82eb70be3b': 'src-cat-walk',
    'ee6bc490-3f00-4049-8bac-e1dbaae18fbc': 'src-cat-idle',
    # питомцы: пёс
    '3f5ec884-5537-499c-b597-752ccfeae580': 'src-dog-happy',
    '473693a5-22eb-465c-960b-607729b263a7': 'src-dog-play',
    '68673f21-599e-4465-8381-238f07040a35': 'src-dog-eat',
    '92037156-d6cd-40e4-ae37-2d7a00db38b7': 'src-dog-walk',
    'd046b298-7e6e-4400-82a5-1a9cc3a4c8dc': 'src-dog-idle',
    # питомцы: хрюшка
    '4c3f0e20-030b-46fa-8ef8-453eae519581': 'src-pig-idle',
    '6624ccd7-89f6-40ce-9a51-57223f92604b': 'src-pig-walk',
    '721907ce-4099-46b4-b851-e4d891fe4c24': 'src-pig-play',
    'c69116f0-c932-4354-bbac-c4c268554236': 'src-pig-happy',
    'd2e57992-e29c-4659-958a-51d00a2a05b6': 'src-pig-eat',
    # питомцы: обезьянка
    '1b47a894-d77d-41ff-b2e0-6d54edfe87d8': 'src-monkey-play',
    '38b3998a-9201-4534-9e73-2c35e9d994e6': 'src-monkey-happy',
    '4cd54935-971b-41db-a53f-8878156bb722': 'src-monkey-walk',
    'd5227230-93b7-480c-bd29-2c392c633387': 'src-monkey-idle',
    'd8c35785-6811-4a26-a8b1-4f8170f78e99': 'src-monkey-eat',
    # сцены
    '120b0746-e8c8-4890-99d3-7da03e540cd7': 'src-room-home',
    'b8ca2dda-19d2-4e64-9b38-342930c52a32': 'src-room-school',
    'a4c53a43-8666-4564-b0dc-2f5f9afa2e5a': 'src-room-shop',
    # продавец
    '438a58ca-a9c9-4d6d-9428-32ebae379ff7': 'src-seller-give',
    'b68fcf8a-a75b-454e-9f63-2637a9c91ecd': 'src-seller-point',
    '2eaa4a9e-f0ea-4eaf-b62f-aa21d0a412b9': 'src-seller-wave',
    '8aa3468f-6384-48d0-b417-ba3067783de4': 'src-seller-idle',
    # цели накопления
    'c6edc7bd-af08-4c02-b18f-f3058791788e': 'src-goal-house',
    '5dae0dea-a826-4e48-98f8-94d537208660': 'src-goal-ball',
    'ef68c49e-bc18-4271-b279-9d81d8e222b0': 'src-goal-bed',
    # стадии купания: грязный → мокрый → в пене → смытый → сухой → причёсанный
    'c01afe41-5b97-4076-a954-9c36782609fe': 'src-cat-bath',
    '1f32d392-ca32-4ccc-ae58-e3088ad5373d': 'src-dog-bath',
    '1aa37d7e-f2d0-4334-b2bc-f80eeb33d15d': 'src-pig-bath',
    '9ac5829b-8706-47ed-966d-f963bb5430ce': 'src-monkey-bath',
    # иконки интерфейса: указатель, погладить, ванна, поводок, запах
    '310540cc-ee08-4dd9-8d59-efe59069dba2': 'src-ui-icons',
    # монета игровой валюты
    '63849e6d-37c9-4230-81ef-46a70aefde7d': 'src-coin',
    '900c4b48-0d31-48aa-b234-756b12c618a7': 'src-coin-stack',
    # значки направлений бюджета
    'fbf69884-6079-4f44-9baf-f5d618bb8d92': 'src-jar-must',
    'f3b634d6-21df-4d1a-ae58-8d6e3026fa48': 'src-jar-want',
    'a7516150-c0e6-4c86-bec2-539eb2edc090': 'src-jar-save',
    '22581567-8fab-4774-b61e-09739ca91310': 'src-tub-back',
    '12a7f616-bbfc-4d56-ade4-46a21d1a319f': 'src-tub-front',
    '2cd1d8b9-4cce-4d8b-9742-5061163ab633': 'src-bath-items',
    # прогулка
    '378943a1-11d2-4418-a0d2-ca89508b3188': 'src-walk-far',
    '0074ec9f-120c-4e03-ac8d-614a4c750b31': 'src-walk-mid',
    'e0e5c8e1-5698-4627-affa-74e91517a02f': 'src-walk-near',
    '6c15df90-087e-4b8e-9c93-a10144251155': 'src-walk-obstacles',
    '0cf004d9-943d-4dc0-a154-09a04545dc5b': 'src-walk-shop',
}

# Где обновить ссылки после переименования.
SCRIPTS = [
    'tools/assets/prepare_actors.py',
    'tools/assets/prepare_pets.py',
    'tools/assets/prepare_room.py',
    'tools/assets/prepare_scenes.py',
    'tools/assets/prepare_items.py',
    'tools/assets/prepare_walk.py',
]


def main():
    renamed = 0
    skipped = 0
    missing = []

    for uuid, name in RENAMES.items():
        old = os.path.join(SRC_DIR, f'{uuid}.png')
        new = os.path.join(SRC_DIR, f'{name}.png')
        if os.path.exists(new):
            skipped += 1
            continue
        if not os.path.exists(old):
            missing.append(uuid)
            continue
        os.rename(old, new)
        print(f'{uuid[:8]}… -> {name}.png')
        renamed += 1

    # Обновляем ссылки в скриптах подготовки.
    for script in SCRIPTS:
        if not os.path.exists(script):
            continue
        text = open(script).read()
        before = text
        for uuid, name in RENAMES.items():
            text = text.replace(f'{uuid}.png', f'{name}.png')
        if text != before:
            open(script, 'w').write(text)
            print(f'обновлены ссылки: {script}')

    print(f'\nпереименовано: {renamed}, уже было: {skipped}')
    if missing:
        print(f'не найдено: {len(missing)} — возможно, уже переименованы')

    # Что осталось с UUID-именем — вероятно, новые файлы.
    leftovers = [
        f
        for f in sorted(os.listdir(SRC_DIR))
        if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-', f)
    ]
    if leftovers:
        print('\nбез понятного имени (добавьте в RENAMES):')
        for f in leftovers:
            print(f'  {f}')


if __name__ == '__main__':
    main()
