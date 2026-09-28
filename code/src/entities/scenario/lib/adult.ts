import type { GameState } from '../model/types';
import { LESSONS } from '../config/lessons';
import { levelFor, levelTitle } from '@/entities/pet/lib/level';
import { COMPETENCIES, competencyById } from '@/entities/competency';

/**
 * Раздел для взрослого (UC-7).
 *
 * ТЗ 2.5.12 требует отделить его простым барьером и показать внутри
 * цели приложения, пройденные темы и общий прогресс — **без негативных
 * оценок ребёнка**. Последнее здесь не пожелание, а проверяемое правило:
 * тест падает, если в тексте появится осуждающее слово.
 *
 * Взрослый видит, ЧЕМУ учится ребёнок, а не насколько он «хорош».
 * Отчёт об успеваемости превратил бы игру в источник давления.
 */

export type GateProblem = { a: number; b: number; answer: number };

/**
 * Арифметический барьер. Двузначное на однозначное: в устный счёт
 * ребёнка 7–11 лет это не укладывается, а взрослому — секунда.
 * Числа случайные, иначе пример быстро заучивается.
 */
export function makeGateProblem(): GateProblem {
  const a = 12 + Math.floor(Math.random() * 8); // 12..19
  const b = 6 + Math.floor(Math.random() * 4); // 6..9
  return { a, b, answer: a * b };
}

export function checkGate(problem: GateProblem, given: number): boolean {
  return Number.isFinite(given) && given === problem.answer;
}

export type AdultSummary = {
  goals: string[];
  topics: string[];
  progress: {
    days: number;
    savings: number;
    stage: string;
    goalChosen: boolean;
  };
  note: string;
};

/**
 * Образовательные цели берутся ИЗ рамки компетенций, а не пишутся
 * заново: раздел 4 ТЗ требует, чтобы результаты были выбраны из неё.
 * Взрослый видит ровно те формулировки, на которые ссылается контент.
 */
const APP_GOALS = COMPETENCIES.map(c => c.outcome);

export function adultSummary(state: GameState): AdultSummary {
  // Тема + область рамки: взрослому важно видеть, к какому разделу
  // финансовой грамотности относится пройденное.
  const topics = state.lessonsDone
    .map(id => {
      const lesson = LESSONS.find(l => l.id === id);
      if (!lesson) {
        return undefined;
      }
      const comp = competencyById(lesson.competencyId);
      return comp ? `${lesson.title} · ${comp.topic}` : lesson.title;
    })
    .filter((t): t is string => Boolean(t));

  const level = levelFor(state.xp);

  // Тон одинаковый при любом прогрессе: мы сообщаем взрослому, где
  // ребёнок находится, и подсказываем, чем помочь, — но не оцениваем.
  const note = topics.length
    ? 'Поговорите дома о том, что ребёнок уже разобрал в игре — это закрепляет навык.'
    : 'Ребёнок только начинает. Пройдите первые дни вместе — так понятнее.';

  return {
    goals: APP_GOALS,
    topics,
    progress: {
      days: state.day,
      savings: state.savings,
      stage: `${levelTitle(level)}, уровень ${level}`,
      goalChosen: state.goalId !== null,
    },
    note,
  };
}

/**
 * Бонус от взрослого за помощь дома (ТЗ 2.5.12): монеты приходят
 * с понятной причиной и видны в «Истории монет». Раз в игровой день —
 * иначе бонус заменил бы заработок заботой о питомце.
 */
export const PARENT_BONUS = {
  amount: 5,
  reason: 'От взрослого: помощь дома',
} as const;

export function parentBonusGivenToday(state: GameState): boolean {
  return state.ledger.some(
    entry =>
      entry.day === state.day &&
      entry.kind === 'income' &&
      entry.reason === PARENT_BONUS.reason,
  );
}
