import type { GameState } from '../model/types';
import { TASKS } from '../config/registries';
import { mustCost, shoppingList } from './shopping';

/**
 * Итог дня: что планировал и что вышло (UC-4).
 *
 * ТЗ 2.5.5 требует сравнить план с фактом, 2.5.9 — объяснить связь
 * простыми словами и предложить следующий шаг.
 *
 * Здесь нет оценки «хорошо/плохо». Потратить меньше задуманного —
 * не ошибка, и формулировки это отражают: мы сообщаем, что произошло,
 * и подсказываем, что с этим можно сделать.
 */

export type DayLine = {
  id: 'must' | 'want' | 'save';
  planned: number;
  actual: number;
  /** Совпало с планом. У «Нужного» ещё и куплено всё нужное. */
  matched: boolean;
  /** Что куплено по направлению сегодня; у копилки пусто. */
  items: string[];
};

export type DaySummary = {
  lines: DayLine[];
  /** Сколько осталось от дня после копилки — это можно отложить ещё. */
  leftover: number;
  /**
   * План совпал с фактом. Единственный источник правды и для подписи
   * на экране, и для премии: иначе экран и кошелёк однажды разойдутся.
   */
  matched: boolean;
  message: string;
  /** Подсказка о следующем шаге; null — когда подсказывать нечего. */
  nextStep: string | null;
  /** Чего из нужного нет на завтра и чем это обернётся; null — всё есть. */
  missedNeeds: string | null;
};

/**
 * Некупленное нужное — единственная настоящая ошибка дня. Объясняем
 * последствие и путь исправить, но не корим: прогресс не пропадает.
 */
function describeMissedNeeds(state: GameState): string | null {
  const items = shoppingList(state).map(entry => entry.item);
  if (items.length === 0) {
    return null;
  }

  const pet = state.petName || 'питомца';
  const names = items.map(item => item.title.toLowerCase()).join(', ');
  const actions = items
    .map(item =>
      TASKS.find(task => task.requiresItem === item.id)?.title.toLowerCase(),
    )
    .filter(Boolean);
  const listed =
    actions.length > 1
      ? `${actions.slice(0, -1).join(', ')} и ${actions[actions.length - 1]}`
      : actions[0];
  const consequence = listed
    ? ` Без этого завтра нечем будет ${listed} ${pet}.`
    : '';

  return `Обязательное не куплено: ${names}.${consequence}`;
}

function recoveryStep(state: GameState): string {
  return `Завтра положи в «Обязательное» не меньше ${mustCost(
    state,
  )} и начни с магазина.`;
}

export function daySummary(state: GameState): DaySummary | null {
  const plan = state.plan;
  if (!plan) {
    return null;
  }

  const missedNeeds = describeMissedNeeds(state);
  // Сравниваем с утренним планом: деньги из копилки на нужное его
  // не переписывают — задуманное было другим, и это видно в итоге.
  const baseline = state.planBaseline ?? plan;
  const today = state.ledger.filter(entry => entry.day === state.day);
  const bought = (category: 'must' | 'want'): string[] =>
    today
      .filter(entry => entry.kind === 'expense' && entry.category === category)
      .map(entry => entry.reason)
      .reverse();
  const saved = today
    .filter(entry => entry.kind === 'savings')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const lines: DayLine[] = [
    {
      id: 'must',
      planned: baseline.must,
      actual: state.spent.must,
      matched: baseline.must === state.spent.must && !missedNeeds,
      items: bought('must'),
    },
    {
      id: 'want',
      planned: baseline.want,
      actual: state.spent.want,
      matched: baseline.want === state.spent.want,
      items: bought('want'),
    },
    {
      id: 'save',
      planned: baseline.save,
      actual: saved,
      // Отложить больше плана — не промах.
      matched: saved >= baseline.save,
      items: [],
    },
  ];

  const leftover = state.leftoverToday ?? 0;
  const matched = lines.every(line => line.matched);
  const base = { lines, leftover, matched, missedNeeds };

  if (missedNeeds) {
    return {
      ...base,
      message:
        leftover > 0
          ? `${leftover} ${coins(
              leftover,
            )} осталось в кошельке, а нужное не куплено.`
          : 'Монеты потратил, а нужное не куплено.',
      nextStep: recoveryStep(state),
    };
  }

  const overMust = state.spent.must - baseline.must;
  if (overMust > 0) {
    return {
      ...base,
      message: `На обязательное ушло на ${overMust} больше, чем планировал.`,
      nextStep: `Завтра планируй на обязательное не меньше ${state.spent.must}.`,
    };
  }

  const overWant = state.spent.want - baseline.want;
  if (overWant > 0) {
    return {
      ...base,
      message: `На развлечения ушло на ${overWant} больше, чем планировал.`,
      nextStep: 'Завтра реши заранее, сколько на них потратить.',
    };
  }

  if (saved < baseline.save) {
    return {
      ...base,
      message: `В копилку ушло ${saved} из ${baseline.save}: остальное потрачено.`,
      nextStep: 'Завтра оставь монеты на копилку до магазина.',
    };
  }

  if (leftover > 0) {
    return {
      ...base,
      message: `Потратил меньше, чем планировал. ${leftover} ${coins(
        leftover,
      )} осталось в кошельке.`,
      // Не «надо было», а «можно»: решение остаётся за ребёнком.
      nextStep: 'Их можно отложить в копилку прямо сейчас.',
    };
  }

  return {
    ...base,
    message: 'Всё, как планировал. План сошёлся.',
    nextStep: null,
  };
}

/** Правильная форма слова «монета» — иначе текст режет глаз ребёнку. */
function coins(n: number): string {
  const last = n % 10;
  const tens = n % 100;
  if (tens >= 11 && tens <= 14) {
    return 'монет';
  }
  if (last === 1) {
    return 'монета';
  }
  if (last >= 2 && last <= 4) {
    return 'монеты';
  }
  return 'монет';
}
