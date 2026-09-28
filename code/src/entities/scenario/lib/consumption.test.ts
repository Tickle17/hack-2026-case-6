import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { mustCost } from './shopping';

/**
 * Расходники кончаются за день.
 *
 * Без этого «Нужное» дорожало и дешевело от дня ко дню: купленный
 * однажды корм лежал в инвентаре вечно, и со третьего дня покупать
 * было нечего. Вместе с этим исчезала и развилка, ради которой
 * игра сделана: обязательные расходы каждый день — 9 при доходе 10.
 */

function run() {
  const r = createRun(INTRO, REGISTRIES);
  r.apply([
    { do: 'giveItem', itemId: 'food' },
    { do: 'giveItem', itemId: 'shampoo' },
    { do: 'giveItem', itemId: 'leash' },
  ]);
  return r;
}

describe('дело тратит свой расходник', () => {
  it('покормить — тратит корм', () => {
    const r = run();
    r.markTaskDone('feed');
    expect(r.state().inventory.food).toBe(0);
  });

  it('искупать — тратит шампунь', () => {
    const r = run();
    r.markTaskDone('bath');
    expect(r.state().inventory.shampoo).toBe(0);
  });

  it('выгулять НЕ тратит поводок: он служит дальше', () => {
    // Поэтому в магазине его и не предлагают, пока он цел.
    const r = run();
    r.markTaskDone('walk');
    expect(r.state().inventory.leash).toBe(1);
  });

  it('погладить не тратит ничего: ласка бесплатна', () => {
    const r = run();
    r.markTaskDone('pet');
    expect(r.state().inventory).toEqual({ food: 1, shampoo: 1, leash: 1 });
  });

  it('дело без расходника не уводит запас в минус', () => {
    const r = createRun(INTRO, REGISTRIES);
    r.markTaskDone('feed');
    r.markTaskDone('feed');
    expect(r.state().inventory.food ?? 0).toBe(0);
  });

  it('чужой расходник не трогается', () => {
    const r = run();
    r.markTaskDone('feed');
    expect(r.state().inventory.shampoo).toBe(1);
    expect(r.state().inventory.leash).toBe(1);
  });
});

describe('обязательное стоит одно и то же каждый день', () => {
  it('день с полным набором на руках — докупаем на завтра ровно 6', () => {
    // Свои корм и шампунь уйдут сегодня, значит на завтра нужны новые.
    expect(mustCost(run().state())).toBe(6);
  });

  it('вечером, когда всё куплено и сделано, покупать больше нечего', () => {
    const r = run();
    r.markTaskDone('feed');
    r.markTaskDone('bath');
    r.markTaskDone('walk');
    r.apply([
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'shampoo' },
    ]);
    expect(mustCost(r.state())).toBe(0);
  });

  it('назавтра набор снова стоит 6, а не дешевеет', () => {
    // Раньше купленный однажды корм лежал вечно, и с третьего дня
    // покупать было нечего — вместе с этим исчезала и развилка.
    const r = run();
    r.markTaskDone('feed');
    r.markTaskDone('bath');
    r.markTaskDone('walk');
    r.apply([
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'shampoo' },
      { do: 'advanceDay' },
    ]);
    expect(mustCost(r.state())).toBe(6);
  });
});

describe('на прогулке питомец пачкается', () => {
  it('после прогулки чистота падает', () => {
    const r = run();
    const before = r.state().stats.cleanliness;
    r.markTaskDone('walk');
    expect(r.state().stats.cleanliness).toBeLessThan(before);
  });

  it('и настроение всё равно растёт: гулять приятно', () => {
    const r = run();
    const before = r.state().stats.mood;
    r.markTaskDone('walk');
    expect(r.state().stats.mood).toBeGreaterThan(before);
  });

  it('купание после прогулки возвращает чистоту', () => {
    const r = run();
    r.markTaskDone('walk');
    const dirty = r.state().stats.cleanliness;
    r.markTaskDone('bath');
    expect(r.state().stats.cleanliness).toBeGreaterThan(dirty);
  });

  it('чистота не уходит в минус', () => {
    const r = run();
    for (let i = 0; i < 20; i++) {
      r.apply([{ do: 'giveItem', itemId: 'leash' }]);
      r.markTaskDone('walk');
    }
    expect(r.state().stats.cleanliness).toBeGreaterThanOrEqual(0);
  });
});

describe('купленное вчера доживает до утра', () => {
  /** Пройти первый день целиком и оказаться на делах второго. */
  function toDayTwo() {
    const r = createRun(INTRO, REGISTRIES);
    for (let i = 0; i < 200; i++) {
      const node = r.current();
      if (node.id === 'bd.pick') {
        r.choose('cat');
        continue;
      }
      if (node.id === 'bd.chores') {
        // Дела первого дня: набор от родителей уходит за день.
        // Купание открывается только после прогулки.
        ['feed', 'walk', 'bath', 'pet'].forEach(id => r.markTaskDone(id));
      }
      if (node.id === 'd2.canWork') {
        return r;
      }
      if (node.type === 'riddle') {
        r.answer(node.options.find(o => o.correct)!.value);
      }
      if (node.id === 'bd.praise') {
        // Набор на завтра, купленный в магазине во время прогулки:
        // дела первого дня уже сделаны, значит он доживёт до утра.
        r.apply([
          { do: 'giveItem', itemId: 'food' },
          { do: 'giveItem', itemId: 'shampoo' },
        ]);
      }
      r.advance();
    }
    throw new Error(`не дошли до второго дня, застряли на "${r.current().id}"`);
  }

  it('сценарий второго дня не выбрасывает вчерашние покупки', () => {
    // Иначе ребёнок платит дважды: купил на завтра, а утром пусто.
    const s = toDayTwo().state();
    expect(s.inventory.food).toBe(1);
    expect(s.inventory.shampoo).toBe(1);
  });

  it('поводок от родителей служит дальше — покупать его не надо', () => {
    expect(toDayTwo().state().inventory.leash).toBe(1);
  });

  it('обычный день стоит 6, а не 15', () => {
    // 15 получалось, когда утро начиналось с пустого дома: тогда
    // корм и шампунь приходилось брать и на сегодня, и на завтра.
    expect(mustCost(toDayTwo().state())).toBe(6);
  });
});
