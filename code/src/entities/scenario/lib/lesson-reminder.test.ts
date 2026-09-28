import { LESSONS } from '../config/lessons';
import { createInitialState } from './state';
import { reminderFlag } from './day-flags';
import { lessonReminder } from './lesson-reminder';

const lesson = LESSONS[0];
const onLessonDay = {
  ...createInitialState('start'),
  day: lesson.day,
  lessonsDone: [lesson.id],
};
const otherMoment = (['plan', 'shop', 'summary'] as const).find(
  moment => moment !== lesson.appliesToday.moment,
)!;

describe('напоминание урока дня', () => {
  it('появляется в момент, где правило пригождается', () => {
    expect(lessonReminder(onLessonDay, lesson.appliesToday.moment)).toContain(
      lesson.appliesToday.reminder,
    );
  });

  it('молчит в другие моменты дня', () => {
    expect(lessonReminder(onLessonDay, otherMoment)).toBeNull();
  });

  it('не напоминает то, чего ещё не проходили', () => {
    expect(
      lessonReminder(
        { ...onLessonDay, lessonsDone: [] },
        lesson.appliesToday.moment,
      ),
    ).toBeNull();
  });

  it('показывается один раз за день', () => {
    const shown = {
      ...onLessonDay,
      flags: { [reminderFlag(lesson.day)]: true },
    };

    expect(lessonReminder(shown, lesson.appliesToday.moment)).toBeNull();
  });

  it('в дни без урока молчит', () => {
    expect(lessonReminder({ ...onLessonDay, day: 1 }, 'plan')).toBeNull();
  });
});

describe('содержание напоминаний', () => {
  it('у каждого урока короткое напоминание — его читают на ходу', () => {
    LESSONS.forEach(item => {
      expect(item.appliesToday.reminder.length).toBeLessThanOrEqual(80);
    });
  });
});
