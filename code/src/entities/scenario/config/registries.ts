import type { ItemSpec, Registries, TaskSpec } from '../model/types';

/**
 * Реестры игры. Все числа — из docs/game-design.md.
 * Добавить дело/товар = добавить строку здесь, код не трогается.
 */

export const TASKS: TaskSpec[] = [
  // Гладят трижды в день — по 8 за раз, вместе перекрывают дневную убыль настроения.
  // prettier-ignore
  {
    id: 'pet',
    title: 'Погладить',
    perDay: 3,
    gameId: 'stroke',
    unlockedFromStart: true,
    restores: { stat: 'mood', amount: 8 },
  },
  {
    id: 'feed',
    title: 'Покормить',
    perDay: 1,
    requiresItem: 'food',
    consumesItem: true,
    gameId: 'feed',
    unlockedFromStart: true,
    restores: { stat: 'satiety', amount: 32 },
  },
  {
    id: 'bath',
    title: 'Искупать',
    perDay: 1,
    requiresItem: 'shampoo',
    consumesItem: true,
    gameId: 'bath',
    unlockedFromStart: true,
    // Покрывает и дневную убыль чистоты (25), и грязь с прогулки (22):
    // ребёнок, сделавший все дела, к вечеру имеет питомца чище,
    // чем утром. Питомец не наказывает за заботу (правила проекта).
    restores: { stat: 'cleanliness', amount: 50 },
  },
  {
    id: 'walk',
    title: 'Выгулять',
    perDay: 1,
    requiresItem: 'leash',
    // Поводок — долгая вещь: он нужен каждой прогулке, но не тратится.
    // Поэтому в магазине его не предлагают, пока он цел; кончается он
    // только по сценарию («поводок порвался»).
    consumesItem: false,
    gameId: 'runner',
    unlockedFromStart: true,
    restores: { stat: 'mood', amount: 12 },
    // На улице питомец пачкается — отсюда и порядок «сначала гулять,
    // потом мыть». Меньше, чем возвращает купание (27): день заботы
    // должен оставлять питомца чище, а не грязнее.
    soils: { stat: 'cleanliness', amount: 22 },
  },
];

export const ITEMS: ItemSpec[] = [
  // Расходники — «нужное». Полный набор 9 при дневном доходе 10.
  // prettier-ignore
  {
    id: 'shampoo',
    title: 'Шампунь',
    price: 3,
    kind: 'consumable',
    category: 'must',
    catalogId: 'main',
    effectHint: 'искупать: чистота +50',
    effect: { stat: 'cleanliness', amount: 20 },
  },
  // prettier-ignore
  {
    id: 'food',
    title: 'Корм',
    price: 3,
    kind: 'consumable',
    category: 'must',
    catalogId: 'main',
    effectHint: 'покормить: сытость +32',
    effect: { stat: 'satiety', amount: 20 },
  },
  // prettier-ignore
  {
    id: 'leash',
    title: 'Поводок',
    price: 3,
    kind: 'consumable',
    category: 'must',
    catalogId: 'main',
    effectHint: 'выгулять: радость +12',
    effect: { stat: 'mood', amount: 10 },
  },
  // Приятное — стоит не меньше дневного дохода. Это правило, не совпадение.
  // prettier-ignore
  {
    id: 'toy',
    title: 'Игрушка',
    price: 10,
    kind: 'treat',
    category: 'want',
    catalogId: 'main',
    effectHint: 'радость +30',
    effect: { stat: 'mood', amount: 30 },
  },
  // Мелкие радости по карману в тот же день: после обязательных 9
  // остаётся 1, и на бантик хватает. Большие — только через копилку.
  // prettier-ignore
  {
    id: 'bow',
    title: 'Бантик',
    price: 1,
    kind: 'treat',
    category: 'want',
    catalogId: 'main',
    effectHint: 'радость +5',
    effect: { stat: 'mood', amount: 5 },
  },
  // prettier-ignore
  {
    id: 'treat',
    title: 'Вкусняшка',
    price: 2,
    kind: 'treat',
    category: 'want',
    catalogId: 'main',
    effectHint: 'сытость +10',
    effect: { stat: 'satiety', amount: 10 },
  },
  // prettier-ignore
  {
    id: 'ball',
    title: 'Мячик',
    price: 4,
    kind: 'treat',
    category: 'want',
    catalogId: 'main',
    effectHint: 'радость +15',
    effect: { stat: 'mood', amount: 15 },
  },
  // prettier-ignore
  {
    id: 'hat',
    title: 'Шапочка',
    price: 6,
    kind: 'treat',
    category: 'want',
    catalogId: 'clothes',
    effectHint: 'радость +20',
    effect: { stat: 'mood', amount: 20 },
  },
];

export const MINIGAMES = ['stroke', 'feed', 'bath', 'runner'];

export const SPECIES = ['cat', 'dog', 'pig', 'monkey'];

export const CATALOGS = ['main', 'clothes'];

export const REGISTRIES: Registries = {
  tasks: TASKS,
  items: ITEMS,
  minigames: MINIGAMES,
  species: SPECIES,
  catalogs: CATALOGS,
};

/** Полный набор расходников — то, без чего день не сделать. */
export const CONSUMABLE_IDS = ITEMS.filter(i => i.kind === 'consumable').map(
  i => i.id,
);

export const CONSUMABLES_TOTAL = ITEMS.filter(
  i => i.kind === 'consumable',
).reduce((sum, i) => sum + i.price, 0);
