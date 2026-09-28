import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import {
  dayChallenges,
  PLAN_KEPT_REWARD,
  SAVINGS_KEPT_REWARD,
} from './challenges';

/**
 * Дополнительные задания дня.
 *
 * Их показывают УТРОМ, до того как ребёнок начал тратить: задание,
 * о котором узнаёшь вечером, ничего не меняет в поведении.
 */

function day(plan: { must: number; want: number }, income = 12) {
  const r = createRun(INTRO, REGISTRIES);
  r.apply([
    { do: 'grantCoins', amount: income, reason: 'тест' },
    {
      do: 'planBudget',
      must: plan.must,
      want: plan.want,
      save: income - plan.must - plan.want,
    },
  ]);
  return r;
}

describe('какие задания есть у дня', () => {
  it('их ровно два и у каждого своя награда', () => {
    const list = dayChallenges(day({ must: 6, want: 3 }).state());
    expect(list.map(c => c.id).sort()).toEqual(['plan', 'savings']);
    expect(list.find(c => c.id === 'plan')!.reward).toBe(PLAN_KEPT_REWARD);
    expect(list.find(c => c.id === 'savings')!.reward).toBe(
      SAVINGS_KEPT_REWARD,
    );
  });

  it('за потраченное как задумано дают 2, за нетронутую копилку — 1', () => {
    expect(PLAN_KEPT_REWARD).toBe(2);
    expect(SAVINGS_KEPT_REWARD).toBe(1);
  });

  it('у каждого есть понятное ребёнку название', () => {
    dayChallenges(day({ must: 6, want: 3 }).state()).forEach(c => {
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.title).not.toMatch(/должен|обязан|нельзя/i);
    });
  });
});

const stockNeeds = (r: ReturnType<typeof day>) =>
  REGISTRIES.items
    .filter(item => item.category === 'must')
    .forEach(item =>
      r.apply(
        [1, 2, 3].map(() => ({ do: 'giveItem' as const, itemId: item.id })),
      ),
    );

describe('задание «потратить как задумал»', () => {
  const planOf = (r: ReturnType<typeof day>) =>
    dayChallenges(r.state()).find(c => c.id === 'plan')!;

  it('утром ещё не выполнено: тратить только предстоит', () => {
    expect(planOf(day({ must: 6, want: 3 })).done).toBe(false);
  });

  it('потратил ровно по плану — выполнено', () => {
    const r = day({ must: 6, want: 3 });
    stockNeeds(r);
    r.apply([
      { do: 'spendFrom', category: 'must', amount: 6, reason: 'корм' },
      { do: 'spendFrom', category: 'want', amount: 3, reason: 'бантик' },
    ]);
    expect(planOf(r).done).toBe(true);
  });

  it('цифры совпали, но нужное не куплено — не выполнено', () => {
    const r = day({ must: 6, want: 3 });
    r.apply([
      { do: 'spendFrom', category: 'must', amount: 6, reason: 'корм' },
      { do: 'spendFrom', category: 'want', amount: 3, reason: 'бантик' },
    ]);
    expect(planOf(r).done).toBe(false);
  });

  it('потратил меньше — не выполнено, но это не упрёк', () => {
    const r = day({ must: 6, want: 3 });
    r.apply([{ do: 'spendFrom', category: 'must', amount: 6, reason: 'корм' }]);
    expect(planOf(r).done).toBe(false);
  });

  it('без плана задания нет', () => {
    const r = createRun(INTRO, REGISTRIES);
    expect(dayChallenges(r.state()).find(c => c.id === 'plan')!.done).toBe(
      false,
    );
  });
});

describe('задание «не брать из копилки»', () => {
  const savingsOf = (r: ReturnType<typeof day>) =>
    dayChallenges(r.state()).find(c => c.id === 'savings')!;

  it('не трогал копилку — выполнено', () => {
    expect(savingsOf(day({ must: 6, want: 3 })).done).toBe(true);
  });

  it('взял из копилки сегодня — не выполнено', () => {
    const r = day({ must: 6, want: 3 });
    r.apply([{ do: 'withdrawSavings', amount: 1, reason: 'на бантик' }]);
    expect(savingsOf(r).done).toBe(false);
  });

  it('брал вчера — сегодня задание снова доступно', () => {
    const r = day({ must: 6, want: 3 });
    r.apply([
      { do: 'withdrawSavings', amount: 1, reason: 'на бантик' },
      { do: 'advanceDay' },
    ]);
    expect(savingsOf(r).done).toBe(true);
  });

  it('попытка снять с пустой копилки задание не ломает', () => {
    const r = day({ must: 6, want: 3 });
    r.apply([{ do: 'withdrawSavings', amount: 5, reason: 'пусто' }]);
    expect(savingsOf(r).done).toBe(false);
  });
});
