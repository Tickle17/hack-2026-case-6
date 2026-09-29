import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { daySummary } from './day-summary';
import type { ScenarioRun } from './interpreter';

/**
 * Итог дня: план против факта (UC-4).
 *
 * ТЗ 2.5.5 требует сравнения плана с фактом после подтверждения,
 * 2.5.9 — объяснения причинно-следственной связи простыми словами
 * и предложения следующего шага.
 */

const MUST_ITEMS = REGISTRIES.items.filter(item => item.category === 'must');

/** Набор нужного на руках: старые проверки говорят о деньгах, а не о покупках. */
function stockNeeds(r: ScenarioRun) {
  MUST_ITEMS.forEach(item => {
    r.apply(
      [1, 2, 3].map(() => ({ do: 'giveItem' as const, itemId: item.id })),
    );
  });
}

function day(
  must: number,
  want: number,
  save: number,
  spendMust = 0,
  spendWant = 0,
  stocked = true,
) {
  const r: ScenarioRun = createRun(INTRO, REGISTRIES);
  if (stocked) {
    stockNeeds(r);
  }
  r.apply([{ do: 'grantCoins', amount: must + want + save, reason: 'тест' }]);
  r.apply([{ do: 'planBudget', must, want, save }]);
  if (spendMust > 0) {
    r.apply([
      {
        do: 'spendFrom',
        category: 'must',
        amount: spendMust,
        reason: 'нужное',
      },
    ]);
  }
  if (spendWant > 0) {
    r.apply([
      { do: 'spendFrom', category: 'want', amount: spendWant, reason: 'хочу' },
    ]);
  }
  // Итог строится вечером, после взноса в копилку.
  r.apply([{ do: 'depositSavings' }]);
  return r;
}

describe('строки сравнения', () => {
  it('по каждому направлению видно план и факт', () => {
    const s = daySummary(day(6, 4, 2, 6, 1).state())!;

    expect(s.lines).toEqual([
      { id: 'must', planned: 6, actual: 6, matched: true, items: ['нужное'] },
      { id: 'want', planned: 4, actual: 1, matched: false, items: ['хочу'] },
      { id: 'save', planned: 2, actual: 2, matched: true, items: [] },
    ]);
  });

  it('нужное не куплено — не хвалим, даже если цифры плана совпали', () => {
    const s = daySummary(day(0, 3, 0, 0, 3, false).state())!;

    expect(s.matched).toBe(false);
    expect(s.lines.find(l => l.id === 'must')!.matched).toBe(false);
    expect(s.message).not.toMatch(/сошёлся/);
    expect(s.missedNeeds).not.toBeNull();
  });

  it('копилка: отложено столько, сколько планировал, если хватило в кошельке', () => {
    const s = daySummary(day(6, 4, 2).state())!;
    const save = s.lines.find(l => l.id === 'save')!;

    expect(save).toMatchObject({ planned: 2, actual: 2, matched: true });
  });

  it('под строкой видно, что куплено', () => {
    const r = day(6, 4, 0);
    r.apply([
      { do: 'spendFrom', category: 'must', amount: 3, reason: 'Корм' },
      { do: 'spendFrom', category: 'must', amount: 3, reason: 'Шампунь' },
      { do: 'spendFrom', category: 'want', amount: 1, reason: 'Бантик' },
    ]);
    const s = daySummary(r.state())!;

    expect(s.lines.find(l => l.id === 'must')!.items).toEqual([
      'Корм',
      'Шампунь',
    ]);
    expect(s.lines.find(l => l.id === 'want')!.items).toEqual(['Бантик']);
  });

  it('без плана сравнивать нечего', () => {
    const r = createRun(INTRO, REGISTRIES);
    expect(daySummary(r.state())).toBeNull();
  });
});

describe('объяснение простыми словами', () => {
  it('всё потрачено как задумано — план сошёлся', () => {
    const s = daySummary(day(6, 4, 0, 6, 4).state())!;

    expect(s.leftover).toBe(0);
    expect(s.message).toContain('сошёлся');
  });

  it('потратил меньше — говорим сколько осталось, без упрёка', () => {
    const s = daySummary(day(6, 4, 0, 6, 1).state())!;

    expect(s.leftover).toBe(3);
    expect(s.message).toContain('3');
    // Ни одного осуждающего слова: ошибки здесь нет.
    expect(s.message).not.toMatch(/зря|напрасно|плохо|неправильно/i);
  });

  it('предлагает следующий шаг, а не просто сообщает факт', () => {
    const s = daySummary(day(6, 4, 0, 6, 0).state())!;

    expect(s.nextStep).toBeTruthy();
    expect(s.nextStep).toContain('копилк');
  });

  it('когда всё сошлось, следующего шага не навязываем', () => {
    const s = daySummary(day(6, 4, 0, 6, 4).state())!;
    expect(s.nextStep).toBeNull();
  });
});

describe('премия за сошедшийся план', () => {
  it('потратил ровно столько, сколько задумал — план сошёлся', () => {
    expect(daySummary(day(6, 3, 3, 6, 3).state())!.matched).toBe(true);
  });

  it('осталось неистраченное — план не сошёлся', () => {
    expect(daySummary(day(6, 3, 3, 4, 3).state())!.matched).toBe(false);
  });

  it('копилка по плану и траты по плану — премию не портит', () => {
    expect(daySummary(day(6, 0, 6, 6, 0).state())!.matched).toBe(true);
  });
});

describe('перерасход и недобор копилки', () => {
  it('на развлечения ушло больше плана — говорим на сколько и что сделать завтра', () => {
    // Планировал 2 на развлечения, потратил 5 — из доли копилки.
    const s = daySummary(day(6, 2, 4, 6, 5).state())!;
    const want = s.lines.find(l => l.id === 'want')!;

    expect(want).toMatchObject({ planned: 2, actual: 5, matched: false });
    expect(s.message).toContain('на 3 больше');
    expect(s.nextStep).toBeTruthy();
    expect(s.message).not.toMatch(/зря|напрасно|плохо|неправильно/i);
  });

  it('потратил долю копилки — в копилку ушло меньше плана, и это видно', () => {
    const s = daySummary(day(6, 2, 4, 6, 5).state())!;
    const save = s.lines.find(l => l.id === 'save')!;

    expect(save).toMatchObject({ planned: 4, actual: 1, matched: false });
    expect(s.matched).toBe(false);
  });

  it('отложил сверх плана — копилка засчитана', () => {
    const r = day(6, 4, 2, 6, 0);
    r.apply([{ do: 'saveExtra', amount: 4 }]);
    const save = daySummary(r.state())!.lines.find(l => l.id === 'save')!;

    expect(save).toMatchObject({ planned: 2, actual: 6, matched: true });
  });
});

// ТЗ 2.2 «безопасная ошибка», 2.5.9: неудачное решение объясняется, и есть путь исправить.
describe('нужное не куплено', () => {
  it('называет, чего не хватает, и чем это обернётся', () => {
    const s = daySummary(day(6, 4, 0, 0, 0, false).state())!;

    expect(s.missedNeeds).toMatch(/Корм/i);
    expect(s.missedNeeds).toMatch(/нечем/);
    // Перечисление по-русски: «искупать, покормить и выгулять», а не «и … и».
    expect(s.missedNeeds).not.toMatch(/ и \S+ и /);
  });

  it('предлагает, как исправить завтра: сколько положить в «Нужное»', () => {
    const s = daySummary(day(6, 4, 0, 0, 0, false).state())!;

    expect(s.nextStep).toMatch(/«Обязательное»/);
    expect(s.nextStep).toMatch(/\d/);
    // Советовать отложить в копилку, пока нечем кормить, — вредный совет.
    expect(s.nextStep).not.toContain('копилк');
  });

  it('не пугает и не стыдит', () => {
    const s = daySummary(day(6, 4, 0, 0, 0, false).state())!;

    expect(`${s.missedNeeds} ${s.nextStep}`).not.toMatch(
      /зря|напрасно|плохо|неправильно|должен|нельзя/i,
    );
  });

  it('молчит, когда нужное на руках', () => {
    expect(daySummary(day(6, 4, 0, 6, 4).state())!.missedNeeds).toBeNull();
  });
});

describe('итог сравнивает с утренним планом', () => {
  it('деньги из копилки на нужное не меняют задуманное', () => {
    const r = day(0, 3, 9, 0, 0, false);
    r.apply([{ do: 'withdrawSavings', amount: 6, reason: 'на нужное' }]);
    const s = daySummary(r.state())!;
    const must = s.lines.find(l => l.id === 'must')!;
    const save = s.lines.find(l => l.id === 'save')!;

    expect(must.planned).toBe(0);
    expect(save.planned).toBe(9);
  });
});

describe('остаток называется по-русски правильно', () => {
  it('одна монета — «осталась», «её»', () => {
    const s = daySummary(day(6, 4, 0, 6, 3).state())!;
    expect(s.message).toContain('1 монета осталась в кошельке');
    expect(s.nextStep).toContain('Её можно отложить');
  });

  it('три монеты — «остались», «их»', () => {
    const s = daySummary(day(6, 4, 0, 6, 1).state())!;
    expect(s.message).toContain('3 монеты остались в кошельке');
    expect(s.nextStep).toContain('Их можно отложить');
  });

  it('пять монет — «осталось», «их»', () => {
    const s = daySummary(day(9, 5, 0, 9, 0).state())!;
    expect(s.message).toContain('5 монет осталось в кошельке');
  });
});
