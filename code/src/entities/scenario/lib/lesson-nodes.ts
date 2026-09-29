import type { Lesson, Node, ScenarioId } from '../model/types';
import { LESSON_REWARD } from './state';

/**
 * Первый кадр школьного дня — дома, а не за партой.
 *
 * Раньше узел «спать» вёл прямо на реплику учительницы, и ребёнок
 * из кровати оказывался в классе без единого кадра между. Утренняя
 * мысль дома объясняет и то, что прошла ночь, и то, зачем он идёт
 * в школу.
 */
const MORNING_THOUGHT = 'Утро. Пора в школу — сегодня урок про деньги.';

/**
 * Разворачивает урок в узлы сценария: утро дома → правило → загадка →
 * объяснение.
 *
 * Урок хранится одной записью в пуле, а не тремя узлами вручную:
 * сценаристу не нужно помнить структуру, а страж проверяет пул целиком.
 */
export function lessonToNodes(
  lesson: Lesson,
  opts: { idPrefix: string; next: ScenarioId },
): Node[] {
  const morning = `${opts.idPrefix}.morning`;
  const rule = `${opts.idPrefix}.rule`;
  const task = `${opts.idPrefix}.task`;
  const riddle = `${opts.idPrefix}.riddle`;
  const explain = `${opts.idPrefix}.explain`;
  const unlock = `${opts.idPrefix}.unlock`;

  const nodes: Node[] = [
    {
      id: morning,
      type: 'thought',
      text: MORNING_THOUGHT,
      // Проснулся дома: сцену переключит уже следующий узел.
      scene: 'home',
      next: rule,
    },
    {
      id: rule,
      type: 'dialogue',
      speaker: 'teacher',
      text: lesson.rule,
      pose: 'book',
      // Урок идёт в классе; следующие узлы наследуют сцену.
      scene: 'school',
      next: task,
    },
    // Переход от правила к задаче. Без него ребёнок видит пример
    // на доске и не понимает, ждут ли от него ответа.
    {
      id: task,
      type: 'dialogue',
      speaker: 'teacher',
      text: lesson.taskPrompt,
      pose: 'point',
      next: riddle,
    },
    {
      id: riddle,
      type: 'riddle',
      competencyId: lesson.competencyId,
      prompt: lesson.riddle.prompt,
      options: lesson.riddle.options,
      onWrong: lesson.riddle.onWrong,
      onRight: lesson.riddle.onRight,
      ...(lesson.riddle.assemble ? { assemble: true as const } : {}),
      retry: 'forever',
      next: explain,
    },
    {
      id: explain,
      type: 'dialogue',
      speaker: 'teacher',
      // Монеты за урок называем вслух: ТЗ 2.5.4 — у начисления виден
      // источник и сумма, молча баланс не меняется.
      text: `${lesson.explanation} Держи ${LESSON_REWARD} монеты за урок!`,
      pose: 'point',
      next: unlock,
    },
    // Завершающий узел есть ВСЕГДА, даже когда урок ничего не открывает:
    // именно он отмечает тему пройденной. Раньше отметка висела на
    // необязательном узле разблокировки, и уроки без `unlocks`
    // не попадали в список пройденных тем у взрослого.
    {
      id: unlock,
      type: 'effect',
      effects: [
        ...(lesson.unlocks ?? []),
        // Задание начисляет валюту — Приложение А, шаг 6.
        // Эффект идемпотентен на уровне markLessonDone, но монеты
        // даём отдельно и только за первое прохождение темы.
        { do: 'rewardLesson', lessonId: lesson.id, amount: LESSON_REWARD },
        { do: 'markLessonDone', lessonId: lesson.id },
        { do: 'setFlag', flag: `lesson.${lesson.id}`, value: true },
      ],
      next: opts.next,
    },
  ];

  return nodes;
}

/**
 * Идентификатор стартового узла урока — по нему сценарий на него
 * ссылается. Это утренний кадр дома, а не первая реплика учительницы.
 */
export function lessonEntryId(idPrefix: string): ScenarioId {
  return `${idPrefix}.morning`;
}
