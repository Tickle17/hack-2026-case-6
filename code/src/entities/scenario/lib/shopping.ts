import type {
  Effect,
  GameState,
  ItemSpec,
  SpendCategory,
} from '../model/types';
import { ITEMS, TASKS } from '../config/registries';

/**
 * Можно ли купить товар.
 *
 * Решает кошелёк, а не план: план — намерение, и перерасход против него
 * ребёнок увидит вечером в итоге дня, а не запретом в магазине.
 * Копилка в кошелёк не входит — её можно тронуть только отдельным
 * решением (см. `mustCover`).
 */
export type Affordability =
  | { kind: 'ok' }
  /** Не хватает в кошельке; `short` — сколько недостаёт. */
  | { kind: 'short'; short: number };

/** Сколько по плану ещё можно потратить на направление (для подсказок). */
export function limitLeft(state: GameState, category: SpendCategory): number {
  const limit = state.plan?.[category] ?? 0;
  return Math.max(0, limit - state.spent[category]);
}

export function affordability(state: GameState, item: ItemSpec): Affordability {
  if (state.balance >= item.price) {
    return { kind: 'ok' };
  }
  return { kind: 'short', short: item.price - state.balance };
}

/**
 * Обязательное, на которое не хватает в кошельке, можно купить,
 * взяв недостающее из копилки. Вариант один и берёт ровно недостающее;
 * если в копилке меньше — вариантов нет.
 */
export type CoverOption = { fromSavings: number };

export function mustCover(
  state: GameState,
  item: ItemSpec,
): { short: number; options: CoverOption[] } | null {
  if (item.category !== 'must' || state.balance >= item.price) {
    return null;
  }
  const short = item.price - state.balance;
  return {
    short,
    options: state.savings >= short ? [{ fromSavings: short }] : [],
  };
}

/** Взять недостающее из копилки и сразу купить товар — одним списком эффектов. */
export function coverAndBuyEffects(
  _state: GameState,
  item: ItemSpec,
  option: CoverOption,
): Effect[] {
  return [
    {
      do: 'withdrawSavings',
      amount: option.fromSavings,
      reason: 'взял из копилки на нужное',
    },
    {
      do: 'spendFrom',
      category: item.category,
      amount: item.price,
      reason: item.title,
    },
    { do: 'giveItem', itemId: item.id },
    ...purchaseEffects(item),
  ];
}

/**
 * Список покупок: что и сколько надо взять.
 *
 * Считаем не «чего нет дома», а **чего не хватит**: сегодняшние
 * несделанные дела плюс завтрашний день. Поэтому в первый день,
 * когда родители выдали корм, шампунь и поводок, в магазине нужны
 * ровно корм и шампунь — свои уйдут сегодня, — а поводок не нужен:
 * он не тратится за день.
 *
 * Без этого магазин предлагал бы либо лишнее (поводок, который уже
 * есть), либо ничего (корм, который лежит дома, но кончится вечером).
 */
export type ShoppingEntry = { item: ItemSpec; count: number };

/** Сколько раз предмет ещё понадобится: остаток сегодня плюс завтра. */
function needed(state: GameState, item: ItemSpec): number {
  const task = TASKS.find(t => t.requiresItem === item.id);
  if (!task) {
    return 0;
  }
  if (!task.consumesItem) {
    // Долгая вещь: нужна одна штука, и она служит дальше.
    return 1;
  }
  const leftToday = Math.max(0, task.perDay - (state.tasksToday[task.id] ?? 0));
  return leftToday + task.perDay;
}

export function shoppingList(state: GameState): ShoppingEntry[] {
  return ITEMS.filter(i => i.category === 'must')
    .map(item => ({
      item,
      count: Math.max(0, needed(state, item) - (state.inventory[item.id] ?? 0)),
    }))
    .filter(e => e.count > 0);
}

/** Во что обойдётся сегодняшний список покупок. */
export function mustCost(state: GameState): number {
  return shoppingList(state).reduce(
    (sum, e) => sum + e.item.price * e.count,
    0,
  );
}

/** Сколько ещё положить в «Нужное», чтобы хватило на всё обязательное. */
export function mustShortfall(planned: number, cost: number): number {
  return Math.max(0, cost - planned);
}

/**
 * Обязательное, которого ещё не хватит на сегодня и завтра. Считается
 * так же, как сумма в плане: иначе план просил бы 12, а магазин
 * отпускал домой после 6.
 */
export function missingNeeds(state: GameState): ItemSpec[] {
  return shoppingList(state).map(e => e.item);
}

/**
 * Что сейчас происходит в магазине.
 *
 * Правило одно: **из магазина всегда есть выход**. Пока хоть что-то
 * из обязательного по карману — берём нужное; когда не по карману
 * ничего, отпускаем домой, а последствие наступит вечером и будет
 * объяснено.
 *
 * Раньше выход зависел от баланса, а не от плана. Если монеты ушли
 * в копилку, доложить из неё в покупку нельзя — и ребёнок оказывался
 * заперт: купить не на что, а кнопки «домой» нет.
 */
export function shopPhase(state: GameState): 'needs' | 'treats' | 'done' {
  const missing = missingNeeds(state);
  if (missing.length === 0) {
    return 'treats';
  }
  const canBuy = missing.some(i => affordability(state, i).kind !== 'short');
  return canBuy ? 'needs' : 'done';
}

/**
 * Что меняется в питомце прямо в момент покупки.
 *
 * Расходник — ничего: шампунь в пакете не моет, корм в мешке не кормит.
 * Показатель меняется, когда предметом воспользовались (см. `restores`
 * у дела). Иначе сам поход в магазин «отмывал» питомца, и грязь
 * после прогулки исчезала до того, как ребёнок дошёл до ванны.
 *
 * Лакомство — наоборот: его дарят, и радость наступает сразу.
 */
export function purchaseEffects(item: ItemSpec): Effect[] {
  if (item.kind !== 'treat' || !item.effect) {
    return [];
  }
  return [{ do: 'changeStat', ...item.effect }];
}

/** Лакомство уже куплено сегодня: радость — по одной в день, а не горстью. */
export function treatBoughtToday(state: GameState, item: ItemSpec): boolean {
  return (
    item.kind === 'treat' &&
    state.ledger.some(
      entry =>
        entry.day === state.day &&
        entry.kind === 'expense' &&
        entry.reason === item.title,
    )
  );
}
