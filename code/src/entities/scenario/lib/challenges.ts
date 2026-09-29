import type { GameState } from '../model/types';
import { shoppingList } from './shopping';

/**
 * Дополнительные задания дня.
 *
 * Показываются УТРОМ, на экране плана, вместе с наградой. Задание,
 * о котором узнаёшь вечером, ничего не меняет в поведении: чтобы
 * ребёнок решил не трогать копилку, он должен знать об этом до того,
 * как захочет её тронуть.
 *
 * Награды маленькие и предсказуемые. Это не лотерея и не джекпот —
 * ровно то, что запрещено правилами проекта: за накопление платят понятную
 * и объяснимую сумму.
 *
 * Невыполненное задание не порицается: вечером оно просто без отметки.
 */

/** За то, что потрачено ровно столько, сколько задумано. */
export const PLAN_KEPT_REWARD = 2;
/** За то, что копилку сегодня не трогали. */
export const SAVINGS_KEPT_REWARD = 1;

export type ChallengeId = 'plan' | 'savings';

export type Challenge = {
  id: ChallengeId;
  title: string;
  /** Зачем это — детской фразой. */
  why: string;
  reward: number;
  done: boolean;
};

/** Потрачено ровно по плану — по обоим направлениям сразу. */
export function planKept(state: GameState): boolean {
  // С утренним планом: добор и деньги из копилки — это уже отступление от задуманного.
  const plan = state.planBaseline ?? state.plan;
  if (!plan) {
    return false;
  }
  // Нужное не куплено — план не сошёлся, даже если цифры совпали.
  return (
    state.spent.must === plan.must &&
    state.spent.want === plan.want &&
    shoppingList(state).length === 0
  );
}

/** Копилку сегодня не трогали. */
export function savingsKept(state: GameState): boolean {
  return state.lastWithdrawDay !== state.day;
}

export function dayChallenges(state: GameState): Challenge[] {
  return [
    {
      id: 'plan',
      title: 'Потратить ровно как задумал',
      why: 'на обязательное и развлечения — сколько запланировал',
      reward: PLAN_KEPT_REWARD,
      done: planKept(state),
    },
    {
      id: 'savings',
      title: 'Не брать из копилки',
      why: 'отложенное дождётся цели',
      reward: SAVINGS_KEPT_REWARD,
      done: savingsKept(state),
    },
  ];
}
