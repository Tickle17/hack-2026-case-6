import { ACHIEVEMENTS } from '../config/achievements';
import { LESSONS } from '../config/lessons';
import { applyEffect } from './effects';
import { createInitialState } from './state';
import { newAchievements } from './achievements';

const start = createInitialState('start');

describe('значки', () => {
  it('у каждого значка есть название и объяснение, как его получить', () => {
    ACHIEVEMENTS.forEach(achievement => {
      expect(achievement.title.trim()).not.toBe('');
      expect(achievement.how.trim()).not.toBe('');
    });
  });

  it('в начале игры значков нет', () => {
    expect(newAchievements(start)).toEqual([]);
  });

  it('три дня лучшей заботы подряд дают значок', () => {
    expect(newAchievements({ ...start, careHistory: [1, 3, 3, 3] })).toContain(
      'care-streak-3',
    );
    expect(
      newAchievements({ ...start, careHistory: [3, 3, 2, 3] }),
    ).not.toContain('care-streak-3');
  });

  it('пять пополнений копилки дают значок', () => {
    expect(
      newAchievements({ ...start, savingsHistory: [1, 2, 3, 4, 5] }),
    ).toContain('deposits-5');
  });

  it('неделя без изъятий считается только когда было что копить', () => {
    expect(newAchievements({ ...start, day: 8 })).not.toContain(
      'no-withdraw-7',
    );
    expect(
      newAchievements({ ...start, day: 8, savingsHistory: [3] }),
    ).toContain('no-withdraw-7');
    expect(
      newAchievements({
        ...start,
        day: 8,
        savingsHistory: [3],
        lastWithdrawDay: 5,
      }),
    ).not.toContain('no-withdraw-7');
  });

  it('первая полученная цель даёт значок', () => {
    expect(
      newAchievements({ ...start, goalsAchieved: ['goal.house'] }),
    ).toContain('first-goal');
  });

  it('все пройденные темы дают значок', () => {
    expect(
      newAchievements({
        ...start,
        lessonsDone: LESSONS.map(lesson => lesson.id),
      }),
    ).toContain('all-lessons');
  });

  it('полученный значок не выдаётся второй раз и не отнимается', () => {
    const earned = applyEffect(
      { ...start, careHistory: [3, 3, 3] },
      { do: 'unlockAchievements', ids: ['care-streak-3'] },
    );

    expect(newAchievements(earned)).not.toContain('care-streak-3');
    expect({ ...earned, careHistory: [3, 3, 3, 0] }.achievements).toContain(
      'care-streak-3',
    );
  });
});
