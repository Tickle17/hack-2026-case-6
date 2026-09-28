import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import {
  affordability,
  mustCost,
  shopPhase,
  shoppingList,
  missingNeeds,
  purchaseEffects,
  treatBoughtToday,
  mustCover,
  coverAndBuyEffects,
} from './shopping';
import { taskBlocker } from './tasks';
import type { ScenarioRun } from './interpreter';

/**
 * Покупки из лимитов направлений (UC-2).
 *
 * ТЗ 2.5.6: перед покупкой видны цена и категория; отрицательный баланс
 * невозможен; при нехватке приложение объясняет, чего не хватает
 * и какие есть варианты.
 */

function planned(must: number, want: number, save: number): ScenarioRun {
  const r = createRun(INTRO, REGISTRIES);
  r.apply([{ do: 'grantCoins', amount: must + want + save, reason: 'тест' }]);
  r.apply([{ do: 'planBudget', must, want, save }]);
  return r;
}

/** Кошелёк и копилка: копилка наполнена вечерним взносом прошлого дня. */
function wallet(balance: number, savings = 0): ScenarioRun {
  const r = createRun(INTRO, REGISTRIES);
  r.apply([{ do: 'grantCoins', amount: balance + savings, reason: 'тест' }]);
  r.apply([{ do: 'planBudget', must: 0, want: 0, save: savings }]);
  r.apply([{ do: 'depositSavings' }, { do: 'advanceDay' }]);
  r.apply([{ do: 'planBudget', must: balance, want: 0, save: 0 }]);
  return r;
}

const price = (id: string): number =>
  REGISTRIES.items.find(i => i.id === id)!.price;

describe('каждый товар знает своё направление', () => {
  it('у всех товаров проставлена категория', () => {
    REGISTRIES.items.forEach(i => {
      expect(['must', 'want']).toContain(i.category);
    });
  });

  it('расходники — обязательные, игрушка — желаемое', () => {
    expect(REGISTRIES.items.find(i => i.id === 'food')!.category).toBe('must');
    expect(REGISTRIES.items.find(i => i.id === 'toy')!.category).toBe('want');
  });
});

describe('хватает ли на покупку: решает кошелёк, а не план', () => {
  const item = (id: string) => REGISTRIES.items.find(i => i.id === id)!;

  it('в кошельке хватает — покупка разрешена', () => {
    expect(affordability(wallet(6).state(), item('food')).kind).toBe('ok');
  });

  it('план покупку не ограничивает: на обязательное 0, а корм купить можно', () => {
    const r = planned(0, 12, 0);
    expect(affordability(r.state(), item('food')).kind).toBe('ok');
  });

  it('в кошельке мало — называем, сколько не хватает', () => {
    const v = affordability(wallet(2).state(), item('toy'));
    expect(v).toEqual({ kind: 'short', short: price('toy') - 2 });
  });

  it('уже потраченное учитывается', () => {
    const r = wallet(5);
    r.apply([{ do: 'spendFrom', category: 'must', amount: 3, reason: 'корм' }]);
    expect(affordability(r.state(), item('shampoo'))).toEqual({
      kind: 'short',
      short: 1,
    });
  });

  it('копилка в кошелёк не входит', () => {
    const v = affordability(wallet(0, 30).state(), item('food'));
    expect(v.kind).toBe('short');
  });

  it('баланс не уходит в минус ни при каких тратах', () => {
    const r = wallet(4);
    for (let i = 0; i < 8; i++) {
      r.apply([
        { do: 'spendFrom', category: 'must', amount: 3, reason: 'ещё' },
      ]);
      expect(r.state().balance).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('покупаем то, что понадобится завтра', () => {
  /** День с выданными родителями расходниками и без сделанных дел. */
  const day1 = () => {
    const r = planned(6, 6, 0);
    r.apply([
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'shampoo' },
      { do: 'giveItem', itemId: 'leash' },
    ]);
    return r;
  };

  it('утром первого дня надо взять корм и шампунь на завтра', () => {
    // Свои корм и шампунь уйдут сегодня, поводок останется.
    const list = shoppingList(day1().state()).map(e => e.item.id);
    expect(list.sort()).toEqual(['food', 'shampoo']);
  });

  it('поводок не покупаем: он не тратится за день', () => {
    expect(shoppingList(day1().state()).map(e => e.item.id)).not.toContain(
      'leash',
    );
  });

  it('поводка нет — тогда покупаем', () => {
    const r = planned(9, 3, 0);
    r.apply([
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'shampoo' },
    ]);
    expect(shoppingList(r.state()).map(e => e.item.id)).toContain('leash');
  });

  it('уже покормили — корма всё равно надо взять на завтра', () => {
    const r = day1();
    r.markTaskDone('feed');
    const food = shoppingList(r.state()).find(e => e.item.id === 'food');
    expect(food?.count).toBe(1);
  });

  it('шампунь нужен и на сегодня, и на завтра, но свой уже есть', () => {
    // Один в руках уйдёт вечером, значит докупаем ровно один.
    const shampoo = shoppingList(day1().state()).find(
      e => e.item.id === 'shampoo',
    );
    expect(shampoo?.count).toBe(1);
  });

  it('запас на два дня — покупать нечего', () => {
    const r = day1();
    r.apply([
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'shampoo' },
    ]);
    expect(shoppingList(r.state())).toEqual([]);
  });

  it('приятное в этот список не попадает: оно не обязательное', () => {
    expect(
      shoppingList(planned(0, 0, 0).state()).every(
        e => e.item.category === 'must',
      ),
    ).toBe(true);
  });

  it('цена списка — это и есть «Нужное» на сегодня', () => {
    expect(mustCost(day1().state())).toBe(6);
  });

  it('пустой дом — закрываем и сегодня, и завтра', () => {
    // Корм и шампунь нужны дважды: на сегодняшние дела и на завтра.
    // Поводок один: он служит дальше.
    const list = shoppingList(planned(0, 0, 0).state());
    expect(list.find(e => e.item.id === 'food')?.count).toBe(2);
    expect(list.find(e => e.item.id === 'shampoo')?.count).toBe(2);
    expect(list.find(e => e.item.id === 'leash')?.count).toBe(1);
  });
});

describe('фаза магазина: из магазина всегда есть выход', () => {
  it('пока обязательное по карману — берём нужное', () => {
    expect(shopPhase(wallet(12).state())).toBe('needs');
  });

  it('всё нужное на руках — переходим к приятному', () => {
    const r = wallet(12);
    r.apply([
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'shampoo' },
      { do: 'giveItem', itemId: 'shampoo' },
      { do: 'giveItem', itemId: 'leash' },
    ]);
    expect(shopPhase(r.state())).toBe('treats');
  });

  it('в кошельке пусто, монеты в копилке — ребёнок не заперт в магазине', () => {
    expect(shopPhase(wallet(0, 12).state())).toBe('done');
  });

  it('хватает на часть — покупаем что можем, а не уходим ни с чем', () => {
    expect(shopPhase(wallet(3).state())).toBe('needs');
  });

  it('одна штука из двух нужных не закрывает покупку', () => {
    const r = wallet(12);
    r.apply([{ do: 'giveItem', itemId: 'food' }]);

    expect(missingNeeds(r.state()).map(i => i.id)).toContain('food');
    expect(shopPhase(r.state())).toBe('needs');
  });
});

describe('что меняется в момент покупки', () => {
  const item = (id: string) => REGISTRIES.items.find(i => i.id === id)!;

  it('лакомство радует сразу: его дарят, а не откладывают', () => {
    expect(purchaseEffects(item('bow'))).toEqual([
      { do: 'changeStat', stat: 'mood', amount: 5 },
    ]);
  });

  it('расходник в момент покупки ничего не меняет', () => {
    // Шампунь в пакете не моет питомца. Иначе поход в магазин
    // сам собой «отмывал» его, и после прогулки грязи как не бывало.
    expect(purchaseEffects(item('shampoo'))).toEqual([]);
    expect(purchaseEffects(item('food'))).toEqual([]);
    expect(purchaseEffects(item('leash'))).toEqual([]);
  });
});

describe('лакомство — одно в день', () => {
  const bow = REGISTRIES.items.find(i => i.id === 'bow')!;
  const buyBow = {
    do: 'spendFrom' as const,
    category: 'want' as const,
    amount: bow.price,
    reason: bow.title,
  };

  it('после покупки сегодня второй раз не продают', () => {
    const r = planned(0, 5, 0);
    expect(treatBoughtToday(r.state(), bow)).toBe(false);
    r.apply([buyBow]);
    expect(treatBoughtToday(r.state(), bow)).toBe(true);
  });

  it('на следующий день снова можно', () => {
    const r = planned(0, 5, 0);
    r.apply([buyBow, { do: 'advanceDay' }]);
    expect(treatBoughtToday(r.state(), bow)).toBe(false);
  });

  it('нужное ограничение не касается', () => {
    const r = planned(6, 0, 0);
    const food = REGISTRIES.items.find(i => i.id === 'food')!;
    r.apply([
      {
        do: 'spendFrom',
        category: 'must',
        amount: food.price,
        reason: food.title,
      },
    ]);
    expect(treatBoughtToday(r.state(), food)).toBe(false);
  });
});

describe('порванный поводок', () => {
  it('после прогулки со спотыканием поводок встаёт в список нужного', () => {
    const r = planned(6, 0, 0);
    r.apply([{ do: 'giveItem', itemId: 'leash' }]);
    expect(shoppingList(r.state()).map(e => e.item.id)).not.toContain('leash');

    r.apply([{ do: 'consumeItem', itemId: 'leash' }]);
    expect(shoppingList(r.state()).map(e => e.item.id)).toContain('leash');
    expect(shopPhase(r.state())).toBe('needs');
  });
});

describe('не хватает на обязательное: можно взять из копилки', () => {
  const leash = REGISTRIES.items.find(i => i.id === 'leash')!;
  const toy = REGISTRIES.items.find(i => i.id === 'toy')!;
  const shampoo = REGISTRIES.items.find(i => i.id === 'shampoo')!;

  it('в кошельке хватает — брать не нужно', () => {
    expect(mustCover(wallet(3).state(), leash)).toBeNull();
  });

  it('лакомства это не касается: только обязательное', () => {
    expect(mustCover(wallet(0, 30).state(), toy)).toBeNull();
  });

  it('в копилке хватает — предлагает взять ровно недостающее', () => {
    const cover = mustCover(wallet(1, 5).state(), leash)!;
    expect(cover).toEqual({ short: 2, options: [{ fromSavings: 2 }] });
  });

  it('в копилке мало — вариантов нет', () => {
    const cover = mustCover(wallet(0, 1).state(), leash)!;
    expect(cover).toEqual({ short: 3, options: [] });
  });

  it('взять из копилки: копилка уменьшается, товар куплен, кошелёк не в минусе', () => {
    const r = wallet(1, 5);
    const option = mustCover(r.state(), leash)!.options[0];
    r.apply(coverAndBuyEffects(r.state(), leash, option));
    expect(r.state().savings).toBe(3);
    expect(r.state().inventory.leash).toBe(1);
    expect(r.state().spent.must).toBe(3);
    expect(r.state().balance).toBe(0);
    expect(r.state().lastWithdrawDay).toBe(r.state().day);
  });

  it('шампунь из копилки не блокирует купание — день не упирается в тупик', () => {
    const r = wallet(0, 5);
    r.apply([{ do: 'changeStat', stat: 'cleanliness', amount: -22 }]);
    const option = mustCover(r.state(), shampoo)!.options[0];
    r.apply(coverAndBuyEffects(r.state(), shampoo, option));
    expect(taskBlocker(r.state(), 'bath')).toBeNull();
  });
});
