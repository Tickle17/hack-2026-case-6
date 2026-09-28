import type { GameState, ItemSpec, SpendCategory } from '../model/types';
import { goalById } from '../config/goals';
import { limitLeft } from './shopping';

/**
 * Короткий ответ на финансовое действие (ТЗ 2.5.9, цель 4 из 2.2).
 *
 * Показывается сразу после действия: сколько ушло или пришло и что
 * это изменило. Итог дня объясняет день целиком, а это — один шаг.
 */

const STAT_WORD: Record<NonNullable<ItemSpec['effect']>['stat'], string> = {
  satiety: 'сытость',
  mood: 'настроение',
  cleanliness: 'чистота',
};

const DIRECTION_WORD: Record<SpendCategory, string> = {
  must: 'Обязательное',
  want: 'Развлечения',
};

export function purchaseFeedback(
  item: ItemSpec,
  stateAfter: GameState,
): string {
  const pet = stateAfter.petName || 'питомец';
  const parts = [`Купил «${item.title}»: −${item.price}.`];

  if (item.effect) {
    const change = `${STAT_WORD[item.effect.stat]} +${item.effect.amount}`;
    // Лакомство действует сразу, расходник — когда им воспользуются.
    parts.push(
      item.kind === 'treat' ? `У ${pet}: ${change}.` : `Пригодится: ${change}.`,
    );
  }

  if (stateAfter.plan) {
    parts.push(
      `На «${DIRECTION_WORD[item.category]}» осталось ${limitLeft(
        stateAfter,
        item.category,
      )}.`,
    );
  }

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
