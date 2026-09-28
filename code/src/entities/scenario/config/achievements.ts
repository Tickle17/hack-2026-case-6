/**
 * Значки за серии решений. Условия — данными, как задания: новый значок
 * добавляется строкой, без правки логики.
 */

export type AchievementRule =
  | { kind: 'goalsAchieved'; atLeast: number }
  | { kind: 'careStreak'; days: number }
  | { kind: 'deposits'; atLeast: number }
  | { kind: 'daysWithoutWithdraw'; atLeast: number }
  | { kind: 'allLessons' };

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  /** Как получить — показывается и до, и после получения. */
  how: string;
  rule: AchievementRule;
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'care-streak-3',
    icon: '🗓️',
    title: 'Три дня по плану',
    how: 'Три дня подряд: купил нужное, потратил как задумал и отложил в копилку.',
    rule: { kind: 'careStreak', days: 3 },
  },
  {
    id: 'deposits-5',
    icon: '🐷',
    title: 'Копилка растёт',
    how: 'Пять раз положил монеты в копилку.',
    rule: { kind: 'deposits', atLeast: 5 },
  },
  {
    id: 'no-withdraw-7',
    icon: '🔒',
    title: 'Неделя терпения',
    how: 'Семь дней копил и ни разу не брал из копилки.',
    rule: { kind: 'daysWithoutWithdraw', atLeast: 7 },
  },
  {
    id: 'first-goal',
    icon: '🏆',
    title: 'Первая цель',
    how: 'Накопил на цель и забрал её.',
    rule: { kind: 'goalsAchieved', atLeast: 1 },
  },
  {
    id: 'all-lessons',
    icon: '🎓',
    title: 'Все темы',
    how: 'Прошёл все уроки про деньги.',
    rule: { kind: 'allLessons' },
  },
];
