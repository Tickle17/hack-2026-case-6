import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { taskBlocker } from './tasks';

/**
 * Чего не хватает, чтобы сделать дело прямо сейчас.
 *
 * Два разных «нельзя»: нечем (не куплен расходник) и рано (сначала
 * другое дело). Оба объясняются словами, и оба ведут ребёнка дальше,
 * а не упираются в серую кнопку.
 */

function state(inventory: Record<string, number> = {}, walked = false) {
  const r = createRun(INTRO, REGISTRIES);
  r.apply([
    { do: 'setPetName', name: 'Барсик' },
    ...Object.entries(inventory).flatMap(([itemId, count]) =>
      Array.from({ length: count }, () => ({
        do: 'giveItem' as const,
        itemId,
      })),
    ),
  ]);
  if (walked) {
    r.markTaskDone('walk');
  }
  return r.state();
}

const full = { food: 1, shampoo: 1, leash: 1 };

describe('нечем делать дело', () => {
  it('кормить нечем, пока не куплен корм', () => {
    const block = taskBlocker(state(), 'feed');
    expect(block).toMatchObject({ kind: 'item' });
    expect(block!.message).toBe('Сначала надо купить корм');
  });

  it('корм есть — кормить можно', () => {
    expect(taskBlocker(state({ food: 1 }), 'feed')).toBeNull();
  });

  it('гладить можно всегда — это бесплатно и ничего не требует', () => {
    expect(taskBlocker(state(), 'pet')).toBeNull();
  });

  it('гулять нечем без поводка', () => {
    expect(taskBlocker(state(), 'walk')?.message).toBe(
      'Сначала надо купить поводок',
    );
  });

  it('поводок есть — гулять можно', () => {
    expect(taskBlocker(state({ leash: 1 }), 'walk')).toBeNull();
  });
});

describe('дело уже сделано сегодня', () => {
  function afterDoing(taskId: string) {
    const r = createRun(INTRO, REGISTRIES);
    r.apply([
      { do: 'setPetName', name: 'Барсик' },
      { do: 'giveItem', itemId: 'food' },
      { do: 'giveItem', itemId: 'shampoo' },
      { do: 'giveItem', itemId: 'leash' },
    ]);
    if (taskId === 'bath') {
      // Купание открывается только грязному питомцу.
      r.markTaskDone('walk');
    }
    r.markTaskDone(taskId);
    return r.state();
  }

  it('покормили — так и говорим, а не зовём покупать корм', () => {
    // Корм ушёл на кормление, и формально его нет. Но звать в магазин
    // сразу после кормления — сбивать: покупать сегодня больше нечего.
    const block = taskBlocker(afterDoing('feed'), 'feed');
    expect(block).toMatchObject({ kind: 'order' });
    expect(block!.message).toBe('Барсик уже поел');
  });

  it('искупали — говорим об этом', () => {
    expect(taskBlocker(afterDoing('bath'), 'bath')!.message).toBe(
      'Барсик уже купался',
    );
  });

  it('погуляли — говорим об этом', () => {
    expect(taskBlocker(afterDoing('walk'), 'walk')!.message).toBe(
      'Барсик уже гулял',
    );
  });

  it('«уже сделано» важнее нехватки: в магазин не зовём', () => {
    expect(taskBlocker(afterDoing('feed'), 'feed')).not.toMatchObject({
      kind: 'item',
    });
  });

  it('гладить можно сколько угодно: ласка ничего не тратит', () => {
    const r = createRun(INTRO, REGISTRIES);
    r.markTaskDone('pet');
    r.markTaskDone('pet');
    r.markTaskDone('pet');
    expect(taskBlocker(r.state(), 'pet')).toBeNull();
  });
});

describe('чистого питомца мыть незачем', () => {
  it('питомец чистый — купание не нужно, и это сказано его именем', () => {
    const block = taskBlocker(state(full), 'bath');
    expect(block).toMatchObject({ kind: 'order' });
    expect(block!.message).toBe('Барсик уже очень чистый');
  });

  it('после прогулки испачкался — купать можно', () => {
    expect(taskBlocker(state(full, true), 'bath')).toBeNull();
  });

  it('испачкался, но шампуня нет — теперь мешает шампунь', () => {
    const block = taskBlocker(state({ leash: 1 }, true), 'bath');
    expect(block).toMatchObject({ kind: 'item' });
    expect(block!.message).toBe('Сначала надо купить шампунь');
  });

  it('чистота важнее нехватки: сначала объясняем, что мыть некого', () => {
    // Иначе ребёнок купит шампунь и всё равно упрётся в «он чистый».
    expect(taskBlocker(state({}, false), 'bath')).toMatchObject({
      kind: 'order',
    });
  });
});

describe('неизвестное дело', () => {
  it('ничего не требует, а не роняет игру', () => {
    expect(taskBlocker(state(), 'нет такого')).toBeNull();
  });
});
