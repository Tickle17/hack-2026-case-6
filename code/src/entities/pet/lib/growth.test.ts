import { dayCareScore } from './growth';

/**
 * Стадии развития питомца (UC-5).
 *
 * ТЗ 2.5.10: не менее трёх стадий; развитие зависит от СОВОКУПНОСТИ
 * решений за несколько периодов — покрытия обязательных расходов,
 * соответствия факта плану и регулярности накоплений.
 */

describe('оценка заботы за день', () => {
  const good = { mustCovered: true, planKept: true, saved: true };

  it('всё сделано — максимум', () => {
    expect(dayCareScore(good)).toBe(3);
  });

  it('ничего не сделано — ноль, но не минус', () => {
    expect(
      dayCareScore({ mustCovered: false, planKept: false, saved: false }),
    ).toBe(0);
  });

  it('каждое слагаемое считается отдельно', () => {
    expect(dayCareScore({ ...good, saved: false })).toBe(2);
    expect(dayCareScore({ ...good, planKept: false })).toBe(2);
    expect(dayCareScore({ ...good, mustCovered: false })).toBe(2);
  });
});
