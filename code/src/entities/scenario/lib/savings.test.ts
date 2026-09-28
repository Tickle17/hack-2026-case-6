import { averageContribution, goalProgress } from './savings';
import { GOALS } from '../config/goals';

/**
 * Копилка и цель (UC-3).
 *
 * ТЗ 2.5.7: расчёт срока должен быть понятным и основанным на средней
 * сумме регулярного пополнения; снятие показывает, как изменится срок.
 */

describe('средняя сумма пополнения', () => {
  it('без пополнений среднего нет — срок показать нельзя', () => {
    expect(averageContribution([])).toBe(0);
  });

  it('считается по пополнениям, а не по дням', () => {
    // Клали 2, 4, 3 — в среднем 3.
    expect(averageContribution([2, 4, 3])).toBe(3);
  });

  it('округляется вниз: обещать больше, чем выходит, нечестно', () => {
    // 2 и 3 дают 2.5 — показываем 2, иначе срок окажется оптимистичнее правды.
    expect(averageContribution([2, 3])).toBe(2);
  });

  it('пустые и нулевые пополнения не занижают среднее', () => {
    expect(averageContribution([0, 4, 0, 4])).toBe(4);
  });
});

describe('прогресс по цели', () => {
  const goal = GOALS.find(g => g.id === 'house')!;

  it('показывает накоплено, осталось и срок', () => {
    const p = goalProgress({ goal, savings: 12, history: [4, 4, 4] });

    expect(p.saved).toBe(12);
    expect(p.left).toBe(goal.price - 12);
    expect(p.ratio).toBeCloseTo(12 / goal.price);
    expect(p.etaDays).toBe(Math.ceil((goal.price - 12) / 4));
  });

  it('цель достигнута — остатка нет, срок нулевой', () => {
    const p = goalProgress({ goal, savings: goal.price + 5, history: [4] });

    expect(p.left).toBe(0);
    expect(p.ratio).toBe(1);
    expect(p.etaDays).toBe(0);
    expect(p.reached).toBe(true);
  });

  it('ещё ни разу не откладывали — срок неизвестен, а не бесконечен', () => {
    const p = goalProgress({ goal, savings: 0, history: [] });

    expect(p.etaDays).toBeNull();
    expect(p.reached).toBe(false);
  });

  it('снятие отодвигает цель, и видно на сколько', () => {
    const before = goalProgress({ goal, savings: 20, history: [5, 5, 5, 5] });
    const after = goalProgress({ goal, savings: 15, history: [5, 5, 5, 5] });

    expect(before.etaDays).toBe(2);
    expect(after.etaDays).toBe(3);
    // Именно эту разницу показываем ребёнку при подтверждении снятия.
    expect(after.etaDays! - before.etaDays!).toBe(1);
  });
});
