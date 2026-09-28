import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { LEDGER_LIMIT } from './state';

/**
 * История начислений и трат (ТЗ 2.5.4, 2.5.6).
 *
 * «Для каждого начисления виден источник и сумма», покупка
 * «сохраняется в истории периода». Отдельного списка не было —
 * показывалась только текущая операция.
 */

function run() {
  const r = createRun(INTRO, REGISTRIES);
  return r;
}

describe('запись операций', () => {
  it('новая игра начинается с пустой историей', () => {
    expect(run().state().ledger).toEqual([]);
  });

  it('начисление попадает в историю с источником и суммой', () => {
    const r = run();
    r.apply([{ do: 'grantCoins', amount: 12, reason: 'карманные' }]);

    const [entry] = r.state().ledger;
    expect(entry.amount).toBe(12);
    expect(entry.reason).toBe('карманные');
    expect(entry.kind).toBe('income');
    expect(entry.day).toBe(1);
  });

  it('трата записывается как расход', () => {
    const r = run();
    r.apply([
      { do: 'grantCoins', amount: 12, reason: 'карманные' },
      { do: 'planBudget', must: 9, want: 3, save: 0 },
      { do: 'spendFrom', category: 'must', amount: 3, reason: 'Корм' },
    ]);

    const spend = r.state().ledger.find(e => e.kind === 'expense');
    expect(spend?.amount).toBe(3);
    expect(spend?.reason).toBe('Корм');
  });

  it('новые записи идут первыми — их читают чаще', () => {
    const r = run();
    r.apply([{ do: 'grantCoins', amount: 5, reason: 'первое' }]);
    r.apply([{ do: 'grantCoins', amount: 7, reason: 'второе' }]);

    expect(r.state().ledger[0].reason).toBe('второе');
  });

  it('неудавшаяся операция в историю не попадает', () => {
    const r = run();
    r.apply([{ do: 'grantCoins', amount: 2, reason: 'доход' }]);
    // В кошельке меньше цены — трата не проходит, значит и записи нет.
    r.apply([{ do: 'spendFrom', category: 'must', amount: 3, reason: 'Корм' }]);

    expect(r.state().ledger.filter(e => e.kind === 'expense')).toEqual([]);
  });

  it('история не растёт бесконечно', () => {
    const r = run();
    for (let i = 0; i < LEDGER_LIMIT + 20; i++) {
      r.apply([{ do: 'grantCoins', amount: 1, reason: `раз ${i}` }]);
    }
    expect(r.state().ledger.length).toBe(LEDGER_LIMIT);
    // Обрезаются старые, а не новые.
    expect(r.state().ledger[0].reason).toBe(`раз ${LEDGER_LIMIT + 19}`);
  });

  it('в истории название товара, а не его идентификатор', () => {
    // Историю читает ребёнок: «leash» ему ничего не говорит.
    const r = run();
    const item = REGISTRIES.items.find(i => i.category === 'must')!;
    r.apply([
      { do: 'grantCoins', amount: 12, reason: 'карманные' },
      { do: 'planBudget', must: 9, want: 3, save: 0 },
      {
        do: 'spendFrom',
        category: 'must',
        amount: item.price,
        reason: item.title,
      },
    ]);

    const spend = r.state().ledger.find(e => e.kind === 'expense')!;
    expect(spend.reason).toBe(item.title);
    expect(spend.reason).not.toBe(item.id);
    // Кириллица: идентификаторы у нас латиницей.
    expect(spend.reason).toMatch(/[А-Яа-яЁё]/);
  });

  it('вечерний перевод в копилку виден как отдельная операция', () => {
    const r = run();
    r.apply([
      { do: 'grantCoins', amount: 12, reason: 'карманные' },
      { do: 'planBudget', must: 6, want: 4, save: 2 },
      { do: 'depositSavings' },
    ]);

    const save = r.state().ledger.find(e => e.kind === 'savings');
    expect(save?.amount).toBe(2);
  });
});
