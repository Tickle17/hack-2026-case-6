import type { GameState } from '../model/types';
import { ACHIEVEMENTS, type AchievementRule } from '../config/achievements';
import { LESSONS } from '../config/lessons';

/** Лучший день по заботе: нужное куплено, план сошёлся, отложено. */
const FULL_CARE = 3;

function meets(rule: AchievementRule, state: GameState): boolean {
  switch (rule.kind) {
    case 'goalsAchieved':
      return state.goalsAchieved.length >= rule.atLeast;
    case 'careStreak': {
      const last = state.careHistory.slice(-rule.days);
      return (
        last.length === rule.days && last.every(score => score === FULL_CARE)
      );
    }
    case 'deposits':
      return state.savingsHistory.length >= rule.atLeast;
    case 'daysWithoutWithdraw':
      return (
        state.savingsHistory.length > 0 &&
        state.day - state.lastWithdrawDay >= rule.atLeast
      );
    case 'allLessons':
      return LESSONS.every(lesson => state.lessonsDone.includes(lesson.id));
  }
}

/** Значки, условия которых выполнены сейчас, но которые ещё не выданы. */
export function newAchievements(state: GameState): string[] {
  return ACHIEVEMENTS.filter(
    achievement =>
      !state.achievements.includes(achievement.id) &&
      meets(achievement.rule, state),
  ).map(achievement => achievement.id);
}
