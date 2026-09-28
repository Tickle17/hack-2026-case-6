import type { GameState, LessonMoment } from '../model/types';
import { lessonForDay } from '../config/lessons';
import { reminderFlag } from './day-flags';

/**
 * Напоминание урока дня — в тот момент, где правило пригождается
 * (ТЗ 2.5.8). Раз в день и только после самого урока.
 */
export function lessonReminder(
  state: GameState,
  moment: LessonMoment,
): string | null {
  const lesson = lessonForDay(state.day);
  if (!lesson || lesson.appliesToday.moment !== moment) return null;
  if (!state.lessonsDone.includes(lesson.id)) return null;
  if (state.flags[reminderFlag(state.day)]) return null;
  return `Урок дня: ${lesson.appliesToday.reminder}`;
}
