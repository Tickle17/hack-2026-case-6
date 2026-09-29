import { ITEMS, TASKS } from '../config/registries';

/**
 * ТЗ 2.5.6: до покупки видно влияние на питомца — и это влияние
 * должно быть правдой. Раньше на корме было «сытость +20», а кормление
 * давало +32: ребёнок видел одно, а получал другое.
 */

const WORD = { satiety: 'сытость', mood: 'радость', cleanliness: 'чистота' };

describe('подпись на карточке товара — правда', () => {
  it('у лакомства — ровно то, что оно даёт сразу', () => {
    ITEMS.filter(i => i.kind === 'treat').forEach(item => {
      expect(item.effectHint).toBe(
        `${WORD[item.effect!.stat]} +${item.effect!.amount}`,
      );
    });
  });

  it('у расходника — то, что даёт дело, для которого он нужен', () => {
    ITEMS.filter(i => i.kind === 'consumable').forEach(item => {
      const task = TASKS.find(t => t.requiresItem === item.id)!;
      expect(item.effectHint).toBe(
        `${task.title.toLowerCase()}: ${WORD[task.restores!.stat]} +${
          task.restores!.amount
        }`,
      );
    });
  });
});
