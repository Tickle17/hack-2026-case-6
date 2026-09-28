import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { dayXpInput } from './day-xp';

/**
 * Что за день принесло питомцу опыт — собирается из самого состояния
 * игры, а не пересказывается экраном. Иначе итог дня и начисление
 * разойдутся: экран покажет одно, а в уровень уйдёт другое.
 */

function day() {
  const r = createRun(INTRO, REGISTRIES);
  r.apply([
    { do: 'grantCoins', amount: 12, reason: 'карманные' },
    { do: 'planBudget', must: 6, want: 3, save: 3 },
  ]);
  return r;
}

describe('опыт дня из состояния игры', () => {
  it('вещи для радости считаются по сегодняшним покупкам', () => {
    const r = day();
    r.apply([
      { do: 'spendFrom', category: 'want', amount: 1, reason: 'Бантик' },
      { do: 'spendFrom', category: 'want', amount: 2, reason: 'Вкусняшка' },
      { do: 'spendFrom', category: 'must', amount: 3, reason: 'Корм' },
    ]);

    expect(dayXpInput(r.state(), true).treats).toEqual(['Бантик', 'Вкусняшка']);
  });

  it('вчерашние покупки сегодня опыта не дают', () => {
    const r = day();
    r.apply([
      { do: 'spendFrom', category: 'want', amount: 1, reason: 'Бантик' },
      { do: 'advanceDay' },
    ]);

    expect(dayXpInput(r.state(), true).treats).toEqual([]);
  });

  it('план выполнен, только если траты совпали с задуманным', () => {
    const r = day();
    REGISTRIES.items
      .filter(item => item.category === 'must')
      .forEach(item =>
        r.apply(
          [1, 2, 3].map(() => ({ do: 'giveItem' as const, itemId: item.id })),
        ),
      );
    r.apply([{ do: 'spendFrom', category: 'must', amount: 6, reason: 'Корм' }]);
    expect(dayXpInput(r.state(), true).planKept).toBe(false);

    r.apply([
      { do: 'spendFrom', category: 'want', amount: 3, reason: 'Игрушка' },
    ]);
    expect(dayXpInput(r.state(), true).planKept).toBe(true);
  });

  it('копилка засчитывается, только когда вечером что-то реально отложено', () => {
    const r = day();
    expect(dayXpInput(r.state(), true).saved).toBe(false);
    r.apply([{ do: 'depositSavings' }]);
    expect(dayXpInput(r.state(), true).saved).toBe(true);
  });

  it('в плане копилка, но всё потрачено — опыта за копилку нет', () => {
    const r = day();
    r.apply([
      {
        do: 'spendFrom',
        category: 'want',
        amount: r.state().balance,
        reason: 'всё',
      },
    ]);
    r.apply([{ do: 'depositSavings' }]);
    expect(dayXpInput(r.state(), true).saved).toBe(false);
  });

  it('все ли дела сделаны — решает тот, кто знает список дел', () => {
    expect(dayXpInput(day().state(), false).allTasksDone).toBe(false);
    expect(dayXpInput(day().state(), true).allTasksDone).toBe(true);
  });
});
