import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { GOALS } from '../config/goals';
import type { ScenarioRun } from './interpreter';

/**
 * Получение накопленной цели.
 *
 * Без этого шага копилка бессмысленна: ребёнок копит, полоса
 * заполняется — и ничего не происходит. Цель должна превращаться
 * в вещь, которую он получил, иначе накопление остаётся абстракцией.
 */

const GOAL = GOALS[0];

function saved(amount: number): ScenarioRun {
  const r = createRun(INTRO, REGISTRIES);
  r.apply([
    { do: 'grantCoins', amount, reason: 'тест' },
    { do: 'planBudget', must: 0, want: 0, save: amount },
    // В копилку доля уходит вечером.
    { do: 'depositSavings' },
    { do: 'setGoal', goalId: GOAL.id },
  ]);
  return r;
}

describe('получение цели', () => {
  it('пока не накоплено — забрать нельзя', () => {
    const r = saved(GOAL.price - 1);
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);

    expect(r.state().goalsAchieved).toEqual([]);
    expect(r.state().savings).toBe(GOAL.price - 1);
  });

  it('накоплено — цель получена, копилка уменьшается на цену', () => {
    const r = saved(GOAL.price);
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);

    expect(r.state().goalsAchieved).toContain(GOAL.id);
    expect(r.state().savings).toBe(0);
  });

  it('лишнее сверх цены остаётся в копилке', () => {
    const r = saved(GOAL.price + 7);
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);

    expect(r.state().savings).toBe(7);
  });

  it('полученная вещь попадает к питомцу и радует его', () => {
    const r = saved(GOAL.price);
    const before = r.state().stats.mood;
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);

    expect(r.state().stats.mood).toBeGreaterThan(before);
  });

  it('получение видно в истории монет', () => {
    const r = saved(GOAL.price);
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);

    const entry = r.state().ledger.find(e => e.reason.includes(GOAL.title));
    expect(entry).toBeTruthy();
  });

  it('дважды одну цель не получить', () => {
    const r = saved(GOAL.price * 2);
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);
    const after = r.state().savings;
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);

    expect(r.state().savings).toBe(after);
    expect(r.state().goalsAchieved.filter(g => g === GOAL.id).length).toBe(1);
  });

  it('после получения цель освобождается — можно выбрать новую', () => {
    const r = saved(GOAL.price);
    r.apply([{ do: 'claimGoal', goalId: GOAL.id }]);

    expect(r.state().goalId).toBeNull();
  });
});
