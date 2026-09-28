import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { GOALS, goalEta } from '../config/goals';
import type { ScenarioRun } from './interpreter';

/**
 * Бюджет: план, накопления, цель.
 *
 * Три механики, которые ТЗ (раздел 8.3) требует как самостоятельные,
 * но связанные. Тесты написаны от поведения ребёнка, а не от функций.
 */

function run(balance = 12): ScenarioRun {
  const r = createRun(INTRO, REGISTRIES);
  // Стартовый капитал задаём эффектом, а не подменой узла: так тест
  // работает с настоящей точкой входа сценария.
  if (balance > 0) {
    r.apply([{ do: 'grantCoins', amount: balance, reason: 'тест' }]);
  }
  return r;
}

describe('план бюджета', () => {
  it('новая игра начинается без накоплений, плана и цели', () => {
    const s = run(0).state();
    expect(s.savings).toBe(0);
    expect(s.plan).toBeNull();
    expect(s.goalId).toBeNull();
  });

  it('нельзя распланировать больше, чем есть', () => {
    const r = run(12);
    r.apply([{ do: 'planBudget', must: 8, want: 6, save: 4 }]);

    // 18 > 12: план не принимается целиком, состояние не ломается.
    expect(r.state().plan).toBeNull();
    expect(r.state().balance).toBe(12);
  });

  it('план — только намерение: монеты остаются в кошельке до вечера', () => {
    const r = run(12);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);

    expect(r.state().plan).toEqual({ must: 6, want: 4, save: 2 });
    expect(r.state().balance).toBe(12);
    expect(r.state().savings).toBe(0);
  });

  it('план можно переложить — последний побеждает, деньги не двигаются', () => {
    const r = run(12);
    r.apply([{ do: 'planBudget', must: 2, want: 8, save: 2 }]);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);

    expect(r.state().plan).toEqual({ must: 6, want: 4, save: 2 });
    expect(r.state().balance).toBe(12);
    expect(r.state().savings).toBe(0);
  });

  it('новый день сбрасывает план и факт', () => {
    const r = run(12);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);
    r.apply([{ do: 'spendFrom', category: 'must', amount: 3, reason: 'корм' }]);
    r.apply([{ do: 'advanceDay' }]);

    expect(r.state().plan).toBeNull();
    expect(r.state().spent).toEqual({ must: 0, want: 0 });
    // Кошелёк день не обнуляет.
    expect(r.state().balance).toBe(9);
  });
});

describe('траты: план не ограничивает, ограничивает кошелёк', () => {
  function planned(): ScenarioRun {
    const r = run(12);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);
    return r;
  }

  it('покупка записывается в своё направление', () => {
    const r = planned();
    r.apply([{ do: 'spendFrom', category: 'must', amount: 3, reason: 'корм' }]);

    expect(r.state().spent.must).toBe(3);
    expect(r.state().spent.want).toBe(0);
    expect(r.state().balance).toBe(9);
  });

  it('можно потратить больше, чем планировал, если хватает в кошельке', () => {
    const r = planned();
    r.apply([
      { do: 'spendFrom', category: 'want', amount: 7, reason: 'много' },
    ]);

    expect(r.state().spent.want).toBe(7);
    expect(r.state().balance).toBe(5);
  });

  it('больше, чем в кошельке, потратить нельзя', () => {
    const r = planned();
    r.apply([
      { do: 'spendFrom', category: 'want', amount: 13, reason: 'много' },
    ]);

    expect(r.state().spent.want).toBe(0);
    expect(r.state().balance).toBe(12);
  });

  it('баланс ни при каких тратах не уходит в минус', () => {
    const r = planned();
    for (let i = 0; i < 10; i++) {
      r.apply([
        { do: 'spendFrom', category: 'must', amount: 3, reason: 'ещё' },
      ]);
      expect(r.state().balance).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('вечером — в копилку', () => {
  function planned(): ScenarioRun {
    const r = run(12);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);
    return r;
  }

  it('запланированная доля уходит в копилку в конце дня', () => {
    const r = planned();
    r.apply([{ do: 'spendFrom', category: 'must', amount: 6, reason: 'корм' }]);
    r.apply([{ do: 'depositSavings' }]);

    expect(r.state().savings).toBe(2);
    expect(r.state().balance).toBe(4);
    expect(r.state().savingsHistory).toEqual([2]);
  });

  it('потратил больше — в копилку уходит только то, что осталось', () => {
    const r = planned();
    r.apply([{ do: 'spendFrom', category: 'want', amount: 11, reason: 'всё' }]);
    r.apply([{ do: 'depositSavings' }]);

    expect(r.state().savings).toBe(1);
    expect(r.state().balance).toBe(0);
  });

  it('второй раз за день не откладывает: перезапуск не удваивает копилку', () => {
    const r = planned();
    r.apply([{ do: 'depositSavings' }]);
    r.apply([{ do: 'depositSavings' }]);

    expect(r.state().savings).toBe(2);
  });

  it('помнит, сколько осталось от дня после копилки', () => {
    const r = planned();
    r.apply([{ do: 'spendFrom', category: 'must', amount: 6, reason: 'корм' }]);
    r.apply([{ do: 'depositSavings' }]);
    // Награда за дела приходит после — в остаток дня она не входит.
    r.apply([{ do: 'grantCoins', amount: 10, reason: 'Дела сделаны' }]);

    expect(r.state().leftoverToday).toBe(4);
  });

  it('остаток можно отложить дополнительно, но не больше остатка дня', () => {
    const r = planned();
    r.apply([{ do: 'spendFrom', category: 'must', amount: 6, reason: 'корм' }]);
    r.apply([{ do: 'depositSavings' }]);
    r.apply([{ do: 'grantCoins', amount: 10, reason: 'Дела сделаны' }]);
    r.apply([{ do: 'saveExtra', amount: 99 }]);

    expect(r.state().savings).toBe(6);
    expect(r.state().balance).toBe(10);
    expect(r.state().leftoverToday).toBe(0);
    // Одно пополнение за день: иначе средний вклад и срок до цели врут.
    expect(r.state().savingsHistory).toEqual([6]);
  });

  it('новый день забывает остаток', () => {
    const r = planned();
    r.apply([{ do: 'depositSavings' }]);
    r.apply([{ do: 'advanceDay' }]);

    expect(r.state().leftoverToday).toBeNull();
  });
});

describe('копилка и цель', () => {
  it('целей не меньше трёх, у каждой понятная цена', () => {
    expect(GOALS.length).toBeGreaterThanOrEqual(3);
    GOALS.forEach(g => {
      expect(g.price).toBeGreaterThan(0);
      expect(g.title.length).toBeGreaterThan(0);
    });
  });

  it('выбранная цель запоминается', () => {
    const r = run();
    r.apply([{ do: 'setGoal', goalId: GOALS[0].id }]);
    expect(r.state().goalId).toBe(GOALS[0].id);
  });

  it('снять из копилки можно, но не больше, чем там лежит', () => {
    const r = run(12);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);
    r.apply([{ do: 'withdrawSavings', amount: 5, reason: 'передумал' }]);

    // В копилке было 2 — уходит в минус нельзя.
    expect(r.state().savings).toBe(0);
    expect(r.state().balance).toBe(12);
  });

  it('срок до цели считается от средней суммы пополнения', () => {
    // Накоплено 12 из 30, кладём по 4 в день → осталось 18 → 5 дней.
    expect(goalEta({ price: 30, saved: 12, perDay: 4 })).toBe(5);
    // Цель достигнута — срока нет.
    expect(goalEta({ price: 30, saved: 30, perDay: 4 })).toBe(0);
    // Ещё ни разу не откладывали — срок посчитать нельзя, а не «бесконечность».
    expect(goalEta({ price: 30, saved: 0, perDay: 0 })).toBeNull();
  });
});
