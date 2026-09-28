import type { GoalSpec } from '../config/goals';
import { goalEta } from '../config/goals';

/**
 * Копилка и финансовая цель.
 *
 * ТЗ 2.5.7 требует, чтобы срок достижения считался понятно и от средней
 * суммы регулярного пополнения. Поэтому здесь нет ни прогнозов, ни
 * сглаживания: ребёнок может проверить расчёт в уме.
 */

/**
 * Средняя сумма одного пополнения.
 *
 * Считаем по пополнениям, а не по дням: в день, когда ребёнок ничего
 * не отложил, он не «отложил ноль» — он просто не откладывал, и делить
 * на такие дни значило бы занижать его обычный вклад.
 *
 * Округление ВНИЗ: срок, обещанный оптимистичнее правды, — это обман,
 * пусть и арифметический.
 */
export function averageContribution(history: number[]): number {
  const real = history.filter(v => v > 0);
  if (real.length === 0) {
    return 0;
  }
  return Math.floor(real.reduce((sum, v) => sum + v, 0) / real.length);
}

export type GoalProgress = {
  saved: number;
  left: number;
  /** Доля выполнения от 0 до 1 — для полосы. */
  ratio: number;
  /** Через сколько дней цель будет достигнута; null — пока неизвестно. */
  etaDays: number | null;
  reached: boolean;
};

export function goalProgress({
  goal,
  savings,
  history,
}: {
  goal: GoalSpec;
  savings: number;
  history: number[];
}): GoalProgress {
  const saved = Math.max(0, savings);
  const left = Math.max(0, goal.price - saved);
  const perDay = averageContribution(history);

  return {
    saved,
    left,
    ratio: goal.price > 0 ? Math.min(1, saved / goal.price) : 1,
    etaDays: goalEta({ price: goal.price, saved, perDay }),
    reached: left === 0,
  };
}
