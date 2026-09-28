import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import {
  makeGateProblem,
  checkGate,
  adultSummary,
  PARENT_BONUS,
  parentBonusGivenToday,
} from './adult';
import { applyEffect } from './effects';
import { createInitialState } from './state';
import { LESSONS } from '../config/lessons';

/**
 * Раздел для взрослого (UC-7).
 *
 * ТЗ 2.5.12: раздел отделён простым барьером; внутри видны цели
 * приложения, пройденные темы и общий прогресс — БЕЗ негативных
 * оценок ребёнка.
 */

describe('барьер', () => {
  it('пример требует умножения двузначного — за пределами 7–11 лет', () => {
    for (let i = 0; i < 50; i++) {
      const p = makeGateProblem();
      expect(p.a).toBeGreaterThanOrEqual(12);
      expect(p.b).toBeGreaterThanOrEqual(6);
      expect(p.answer).toBe(p.a * p.b);
    }
  });

  it('пример каждый раз разный — заучить не выйдет', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const p = makeGateProblem();
      seen.add(`${p.a}x${p.b}`);
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('верный ответ пропускает, неверный — нет', () => {
    const p = makeGateProblem();
    expect(checkGate(p, p.answer)).toBe(true);
    expect(checkGate(p, p.answer + 1)).toBe(false);
  });

  it('пустой или нечисловой ответ не пропускает', () => {
    const p = makeGateProblem();
    expect(checkGate(p, NaN)).toBe(false);
  });
});

describe('что видит взрослый', () => {
  function state(patch: Partial<Parameters<typeof adultSummary>[0]> = {}) {
    const r = createRun(INTRO, REGISTRIES);
    return { ...r.state(), ...patch };
  }

  it('показывает цели приложения', () => {
    const s = adultSummary(state());
    expect(s.goals.length).toBeGreaterThanOrEqual(3);
  });

  it('показывает пройденные темы, а не список ошибок', () => {
    const s = adultSummary(state({ lessonsDone: [LESSONS[0].id] }));

    expect(s.topics.length).toBe(1);
    expect(s.topics[0]).toBeTruthy();
  });

  it('показывает общий прогресс числами', () => {
    const s = adultSummary(
      state({ day: 4, savings: 12, careHistory: [2, 2, 2] }),
    );

    expect(s.progress.days).toBe(4);
    expect(s.progress.savings).toBe(12);
    expect(s.progress.stage).toBeTruthy();
  });

  it('НИ ОДНОЙ негативной оценки ребёнка — прямое требование ТЗ 2.5.12', () => {
    const s = adultSummary(state({ careHistory: [0, 0, 0, 0] }));
    const allText = [...s.goals, ...s.topics, s.progress.stage, s.note].join(
      ' ',
    );

    // Шаблон ловит ОЦЕНОЧНЫЕ слова. Корни берём достаточно длинными,
    // чтобы не цеплять безобидные: «лени» без «в» совпадает
    // с «направлениям», и тест падал на нейтральном тексте.
    expect(allText).not.toMatch(
      /\bплохо|ошибк|неправильн|не справ|отстаёт|отстает|слабо\b|провал|хуже|ленив|небрежн/i,
    );
  });

  it('даже при нулевой заботе тон остаётся нейтральным и полезным', () => {
    const s = adultSummary(state({ careHistory: [0, 0] }));
    expect(s.note.length).toBeGreaterThan(0);
  });
});

describe('бонус от взрослого', () => {
  const grant = {
    do: 'grantCoins' as const,
    amount: PARENT_BONUS.amount,
    reason: PARENT_BONUS.reason,
  };

  it('попадает в историю монет с понятной причиной', () => {
    const state = applyEffect(createInitialState('start'), grant);

    expect(state.ledger[0]).toMatchObject({
      kind: 'income',
      amount: 5,
      reason: PARENT_BONUS.reason,
    });
  });

  it('даётся раз в день: после начисления сегодня кнопка закрыта', () => {
    const before = createInitialState('start');

    expect(parentBonusGivenToday(before)).toBe(false);
    expect(parentBonusGivenToday(applyEffect(before, grant))).toBe(true);
  });

  it('на следующий день снова доступен', () => {
    const given = applyEffect(createInitialState('start'), grant);

    expect(parentBonusGivenToday({ ...given, day: given.day + 1 })).toBe(false);
  });
});
