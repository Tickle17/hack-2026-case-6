import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import {
  askedTaskHint,
  currentHint,
  planStepHint,
  HINT_TARGETS,
  SUGGESTED_WANT,
} from './hints';
import type { GameState } from '../model/types';

/**
 * Подсказки первого дня (ТЗ 2.5.1: вернуться к подсказке в любой момент).
 *
 * Подсказка появляется там, где нужна, а не собрана на отдельной
 * странице: ребёнок 7–11 лет не идёт читать инструкцию, он тыкает.
 */

/** Старые проверки говорят о тексте — разворачиваем подсказку. */
function hintText(s: GameState, ctx: Parameters<typeof currentHint>[1]) {
  return currentHint(s, ctx)?.text ?? null;
}

function state(patch: Partial<GameState> = {}): GameState {
  const r = createRun(INTRO, REGISTRIES);
  return { ...r.state(), ...patch };
}

describe('какая подсказка показывается', () => {
  it('выключены — подсказок нет', () => {
    expect(
      hintText(state({ hintsOn: false }), { planning: true, tasksLeft: 3 }),
    ).toBeNull();
  });

  it('на планировании объясняет, как раскладывать', () => {
    const hint = hintText(state({ hintsOn: true }), {
      planning: true,
      tasksLeft: 3,
    });
    expect(hint).toContain('ползун');
  });

  it('когда есть незакрытые дела — называет следующий шаг, а не «дела внизу»', () => {
    // Пустой инвентарь: первый же шаг упирается в покупку,
    // и подсказка ведёт туда, а не оставляет ребёнка гадать.
    const hint = hintText(state({ hintsOn: true }), {
      planning: false,
      tasksLeft: 3,
    });
    expect(hint).toBeTruthy();
    expect(hint).toMatch(/магазин|покорми|гул|ванн|погладь/i);
  });

  it('когда дела закончились — подсказывает, что дальше', () => {
    const hint = hintText(state({ hintsOn: true }), {
      planning: false,
      tasksLeft: 0,
    });
    expect(hint).toBeTruthy();
    expect(hint).not.toMatch(/внизу/i);
  });

  it('подсказка короткая — её читают на бегу', () => {
    [
      { planning: true, tasksLeft: 3 },
      { planning: false, tasksLeft: 3 },
      { planning: false, tasksLeft: 0 },
    ].forEach(ctx => {
      const hint = hintText(state({ hintsOn: true }), ctx);
      expect(hint!.length).toBeLessThanOrEqual(70);
    });
  });

  it('ни одна подсказка не приказывает и не ругает', () => {
    [
      { planning: true, tasksLeft: 3 },
      { planning: false, tasksLeft: 3 },
      { planning: false, tasksLeft: 0 },
    ].forEach(ctx => {
      expect(hintText(state({ hintsOn: true }), ctx)).not.toMatch(
        /должен|обязан|нельзя|неправильно/i,
      );
    });
  });
});

describe('подсказки на остальных экранах', () => {
  it('в школе зовёт выбрать ответ и снимает страх ошибки', () => {
    const hint = hintText(state({ hintsOn: true }), {
      planning: false,
      tasksLeft: 3,
      riddle: true,
    });
    expect(hint).toMatch(/ответ/i);
    expect(hint).toMatch(/не страшно|ещё раз/i);
  });

  it('в магазине сначала про обязательное', () => {
    const hint = hintText(state({ hintsOn: true }), {
      planning: false,
      tasksLeft: 3,
      shopNeeds: true,
    });
    expect(hint).toMatch(/нужное/i);
  });

  it('в магазине после обязательного — про выбор', () => {
    const hint = hintText(state({ hintsOn: true }), {
      planning: false,
      tasksLeft: 3,
      shopTreats: true,
    });
    expect(hint).toMatch(/порадовать|домой/i);
  });

  it('экран поверх всего важнее дел: подсказка не зовёт туда, куда не попасть', () => {
    const hint = hintText(state({ hintsOn: true }), {
      planning: false,
      tasksLeft: 3,
      shopNeeds: true,
    });
    expect(hint).not.toMatch(/внизу/i);
  });
});

describe('краевые случаи: подсказки включили не вовремя', () => {
  /**
   * «Как играть» можно нажать в любой момент — в том числе когда
   * денег нет и раскладывать нечего. Подсказка, зовущая делать
   * невозможное, хуже её отсутствия: ребёнок решит, что сломалось.
   */
  it('монет нет и планировать нечего — подсказка про дела, а не про ползунки', () => {
    const hint = hintText(state({ hintsOn: true, balance: 0 }), {
      planning: false,
      tasksLeft: 2,
    });
    expect(hint).not.toContain('ползун');
  });

  it('всё сделано и планировать нечего — подсказка про итог дня', () => {
    const hint = hintText(state({ hintsOn: true, balance: 0 }), {
      planning: false,
      tasksLeft: 0,
    });
    expect(hint).toBeTruthy();
    expect(hint).not.toContain('ползун');
  });

  it('подсказка никогда не зовёт туда, где кнопки не нажать', () => {
    // Планирование показывается ТОЛЬКО когда открыт его экран.
    const notPlanning = hintText(state({ hintsOn: true }), {
      planning: false,
      tasksLeft: 1,
    });
    expect(notPlanning).not.toContain('ползун');
  });
});

describe('когда подсказки включены', () => {
  it('в новой игре включены — первый день ведём за руку', () => {
    expect(createRun(INTRO, REGISTRIES).state().hintsOn).toBe(true);
  });

  it('выключаются эффектом и снова включаются им же', () => {
    const r = createRun(INTRO, REGISTRIES);
    r.apply([{ do: 'setHints', on: false }]);
    expect(r.state().hintsOn).toBe(false);

    r.apply([{ do: 'setHints', on: true }]);
    expect(r.state().hintsOn).toBe(true);
  });
});

describe('первый день ведёт по шагам', () => {
  function day(inventory: Record<string, number> = {}, done: string[] = []) {
    const r = createRun(INTRO, REGISTRIES);
    r.apply(
      Object.entries(inventory).flatMap(([itemId, count]) =>
        Array.from({ length: count }, () => ({
          do: 'giveItem' as const,
          itemId,
        })),
      ),
    );
    done.forEach(id => r.markTaskDone(id));
    return r.state();
  }

  const ctx = { planning: false, tasksLeft: 3 };
  const full = { food: 1, shampoo: 1, leash: 1 };

  it('первым делом — покормить, корм уже есть', () => {
    expect(hintText(day(full), ctx)).toContain('Покорми');
  });

  it('покормил — зовёт на прогулку', () => {
    expect(hintText(day(full, ['feed']), ctx)).toContain('гул');
  });

  it('погулял — зовёт в ванну, питомец испачкался', () => {
    expect(hintText(day(full, ['feed', 'walk']), ctx)).toContain('ванну');
  });

  it('осталось только погладить — зовёт погладить', () => {
    const s = day(full, ['feed', 'walk', 'bath']);
    expect(hintText(s, { planning: false, tasksLeft: 1 })).toContain('Погладь');
  });

  it('нечем — подсказка ведёт в магазин, а не молчит', () => {
    expect(hintText(day({}), ctx)).toContain('магазин');
  });

  it('всё сделано — подсказка про итог дня', () => {
    const s = day(full, ['feed', 'walk', 'bath', 'pet', 'pet', 'pet']);
    expect(hintText(s, { planning: false, tasksLeft: 0 })).toContain(
      'вышло за день',
    );
  });
});

describe('подсказка показывает на конкретную кнопку', () => {
  function day(inventory: Record<string, number> = {}, done: string[] = []) {
    const r = createRun(INTRO, REGISTRIES);
    r.apply(
      Object.entries(inventory).flatMap(([itemId, count]) =>
        Array.from({ length: count }, () => ({
          do: 'giveItem' as const,
          itemId,
        })),
      ),
    );
    done.forEach(id => r.markTaskDone(id));
    return r.state();
  }

  const ctx = { planning: false, tasksLeft: 3 };
  const full = { food: 1, shampoo: 1, leash: 1 };

  it('зовёт кормить — показывает на плитку кормления', () => {
    expect(currentHint(day(full), ctx)!.target).toBe('task.feed');
  });

  it('зовёт гулять — показывает на плитку прогулки', () => {
    expect(currentHint(day(full, ['feed']), ctx)!.target).toBe('task.walk');
  });

  it('зовёт в ванну — показывает на плитку купания', () => {
    expect(currentHint(day(full, ['feed', 'walk']), ctx)!.target).toBe(
      'task.bath',
    );
  });

  it('нечем делать — называет путь словами, но пальцем не показывает', () => {
    // Лапка нарисована тычущей вниз, а над кнопкой шапки места нет:
    // перевёрнутый указатель хуже, чем его отсутствие.
    const hint = currentHint(day({}), ctx)!;
    expect(hint.text).toContain('меню');
    expect(hint.target).toBeNull();
  });

  it('на планировании показывает на полосу «Нужное»', () => {
    expect(
      currentHint(day(full), { planning: true, tasksLeft: 3 })!.target,
    ).toBe('plan.needs');
  });

  it('в магазине показывает на обязательный товар', () => {
    expect(currentHint(day(full), { ...ctx, shopNeeds: true })!.target).toBe(
      'shop.item',
    );
  });

  it('в магазине после обязательного — на кнопку домой', () => {
    expect(currentHint(day(full), { ...ctx, shopTreats: true })!.target).toBe(
      'shop.exit',
    );
  });

  it('в загадке НЕ показывает ни на что: это подсказало бы ответ', () => {
    expect(currentHint(day(full), { ...ctx, riddle: true })!.target).toBeNull();
  });

  it('каждая цель — из известного списка, опечатка не пройдёт', () => {
    const cases = [
      [day(full), ctx],
      [day(full, ['feed']), ctx],
      [day({}), ctx],
      [day(full), { planning: true, tasksLeft: 3 }],
      [day(full), { ...ctx, shopNeeds: true }],
      [day(full), { ...ctx, shopTreats: true }],
      [day(full), { planning: false, tasksLeft: 0 }],
    ] as const;
    cases.forEach(([s, c]) => {
      const t = currentHint(s, c)!.target;
      expect(t === null || HINT_TARGETS.includes(t)).toBe(true);
    });
  });
});

describe('в магазине, где нечего купить', () => {
  const s = () => ({ ...createRun(INTRO, REGISTRIES).state(), hintsOn: true });

  it('не зовёт гулять: мы уже в магазине', () => {
    const hint = currentHint(s(), {
      planning: false,
      tasksLeft: 3,
      shopDone: true,
    });
    expect(hint!.text).not.toMatch(/гулять/i);
  });

  it('говорит, что покупать нечего, и показывает на выход', () => {
    const hint = currentHint(s(), {
      planning: false,
      tasksLeft: 3,
      shopDone: true,
    });
    expect(hint!.text).toMatch(/нечего|не хватает/i);
    expect(hint!.target).toBe('shop.exit');
  });
});

describe('первый день: план собирается по шагам', () => {
  const opts = { mustCost: 6, income: 12, goalChosen: false };

  it('сначала «Нужное» — и называет, сколько положить', () => {
    const h = planStepHint({ must: 0, want: 0 }, opts)!;
    expect(h.text).toContain('6');
    expect(h.text).toMatch(/обязательн/i);
    expect(h.target).toBe('plan.needs');
  });

  it('положил нужное — зовёт в «Хочу»', () => {
    const h = planStepHint({ must: 6, want: 0 }, opts)!;
    expect(h.text).toContain(String(SUGGESTED_WANT));
    expect(h.target).toBe('plan.want');
  });

  it('разложил — зовёт выбрать цель и называет её', () => {
    const h = planStepHint({ must: 6, want: SUGGESTED_WANT }, opts)!;
    expect(h.target).toBe('plan.goal');
    expect(h.text.toLowerCase()).toContain('домик');
  });

  it('цель выбрана — зовёт сохранить', () => {
    const h = planStepHint(
      { must: 6, want: SUGGESTED_WANT },
      { ...opts, goalChosen: true },
    )!;
    expect(h.target).toBe('plan.save');
    // Копилка пополняется вечером, а не в момент плана.
    expect(h.text).toContain('вечером');
  });

  it('положил больше советуемого — шаг считается пройденным', () => {
    expect(planStepHint({ must: 9, want: 0 }, opts)!.target).toBe('plan.want');
  });

  it('покупать нечего — шаг «Нужное» пропускается', () => {
    const h = planStepHint({ must: 0, want: 0 }, { ...opts, mustCost: 0 })!;
    expect(h.target).toBe('plan.want');
  });

  it('все цели уже получены — шаг цели пропускается', () => {
    const h = planStepHint(
      { must: 6, want: SUGGESTED_WANT },
      { ...opts, goalChosen: false, noGoalsLeft: true },
    )!;
    expect(h.target).toBe('plan.save');
  });

  it('советуем ровно на два маленьких лакомства', () => {
    // Бантик и вкусняшка: ребёнок видит, что «Хочу» — это не «потом»,
    // а сегодня, и что на него хватает.
    expect(SUGGESTED_WANT).toBe(3);
  });
});

describe('в магазине после обязательного', () => {
  function planned(must: number, want: number) {
    const r = createRun(INTRO, REGISTRIES);
    r.apply([
      { do: 'grantCoins', amount: must + want, reason: 'тест' },
      { do: 'planBudget', must, want, save: 0 },
    ]);
    return r.state();
  }

  it('называет, сколько осталось на «Хочу»', () => {
    // Ребёнок отложил на радость утром — вечером надо напомнить,
    // что она отложена, иначе деньги просто не потратятся.
    const hint = currentHint(planned(0, 3), {
      planning: false,
      tasksLeft: 3,
      shopTreats: true,
    })!;
    expect(hint.text).toContain('3');
    expect(hint.target).toBe('shop.item');
  });

  it('на «Хочу» не отложено — зовёт домой, а не тратить', () => {
    const hint = currentHint(planned(0, 0), {
      planning: false,
      tasksLeft: 3,
      shopTreats: true,
    })!;
    expect(hint.target).toBe('shop.exit');
    expect(hint.text).toMatch(/домой/i);
  });
});

describe('кнопка «Подсказать» в списке дел', () => {
  const allDone = { feed: 1, walk: 1, bath: 1, pet: 3 };

  // Ребёнок сам попросил — выключенные автоподсказки ему не мешают.
  it('отвечает, даже когда подсказки выключены', () => {
    const s = state({ hintsOn: false, tasksToday: { ...allDone, pet: 1 } });

    expect(askedTaskHint(s)?.target).toBe('task.pet');
  });

  it('показывает на недоделанное дело, а не на уже выполненное', () => {
    const s = state({ hintsOn: false, tasksToday: { ...allDone, pet: 1 } });

    expect(askedTaskHint(s)?.text).toMatch(/[Пп]огладь/);
  });

  it('молчит, когда все дела сделаны', () => {
    expect(
      askedTaskHint(state({ hintsOn: false, tasksToday: allDone })),
    ).toBeNull();
  });
});
