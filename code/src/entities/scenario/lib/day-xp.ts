import type { DayXpInput } from '@/entities/pet/lib/level';
import type { GameState } from '../model/types';
import { planKept } from './challenges';

/**
 * Что за день принесло питомцу опыт — из самого состояния игры.
 *
 * Одна функция на итог дня и на начисление: экран показывает ровно то,
 * что уйдёт в уровень, и разойтись им негде.
 *
 * «Все ли дела сделаны» приходит снаружи: список дел дня знает движок
 * сценария, а не состояние.
 */
export function dayXpInput(
  state: GameState,
  allTasksDone: boolean,
): DayXpInput {
  const treats = state.ledger
    .filter(
      e => e.day === state.day && e.kind === 'expense' && e.category === 'want',
    )
    // В истории новое сверху, а ребёнок помнит покупки по порядку.
    .reverse()
    .map(e => e.reason);

  return {
    allTasksDone,
    planKept: planKept(state),
    saved: savedToday(state) > 0,
    treats,
  };
}

/** Сколько сегодня реально ушло в копилку: вечерний взнос и отложенное сверх плана. */
export function savedToday(state: GameState): number {
  return state.ledger
    .filter(e => e.day === state.day && e.kind === 'savings')
    .reduce((sum, e) => sum + e.amount, 0);
}
