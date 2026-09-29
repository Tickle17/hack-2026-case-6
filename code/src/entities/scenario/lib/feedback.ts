import type { GameState, ItemSpec } from '../model/types';
import { goalById } from '../config/goals';

/**
 * Короткий ответ на финансовое действие (ТЗ 2.5.9, цель 4 из 2.2).
 *
 * Показывается сразу после действия: сколько ушло или пришло и что
 * это изменило. Итог дня объясняет день целиком, а это — один шаг.
 */

const STAT_WORD: Record<NonNullable<ItemSpec['effect']>['stat'], string> = {
  satiety: 'сытость',
  mood: 'радость',
  cleanliness: 'чистота',
};

/**
 * `paid` — сколько заплатили на самом деле (в день скидки меньше цены).
 * Тратят из кошелька, поэтому остаток — по кошельку.
 */
export function purchaseFeedback(
  item: ItemSpec,
  stateAfter: GameState,
  paid: number = item.price,
): string {
  const pet = stateAfter.petName || 'питомец';
  const parts = [`Купил «${item.title}»: −${paid}.`];

  if (item.kind === 'treat' && item.effect) {
    // Лакомство действует сразу.
    parts.push(
      `У ${pet}: ${STAT_WORD[item.effect.stat]} +${item.effect.amount}.`,
    );
  } else if (item.effectHint) {
    // Расходник — когда им воспользуются: подсказка называет дело.
    parts.push(`Пригодится: ${item.effectHint}.`);
  }

  parts.push(`В кошельке ${stateAfter.balance}.`);
  return parts.join(' ');
}

export function savingsFeedback({
  change,
  state,
}: {
  change: number;
  state: GameState;
}): string | null {
  if (change === 0) {
    return null;
  }

  const moved =
    change > 0 ? `+${change} в копилку.` : `−${-change} из копилки.`;
  const goal = state.goalId ? goalById(state.goalId) : undefined;

  if (!goal) {
    return moved;
  }

  const left = Math.max(0, goal.price - state.savings);

  return left === 0
    ? `${moved} На «${goal.title}» уже хватает!`
    : `${moved} До цели «${goal.title}» осталось ${left}.`;
}
