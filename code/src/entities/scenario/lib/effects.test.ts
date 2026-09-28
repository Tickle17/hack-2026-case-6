import { applyEffect, applyEffects } from './effects';
import { createInitialState, MAX_BALANCE } from './state';
import type { GameState } from '../model/types';

function state(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState('start'), ...patch };
}

describe('монеты: инвариант «баланс не уходит в минус»', () => {
  it('начисляет', () => {
    const s = applyEffect(state(), {
      do: 'grantCoins',
      amount: 10,
      reason: 'дела',
    });
    expect(s.balance).toBe(10);
  });

  it('списывает', () => {
    const s = applyEffect(state({ balance: 10 }), {
      do: 'takeCoins',
      amount: 3,
      reason: 'шампунь',
    });
    expect(s.balance).toBe(7);
  });

  it('НЕ уходит в минус — списание больше баланса обрезается до нуля', () => {
    const s = applyEffect(state({ balance: 2 }), {
      do: 'takeCoins',
      amount: 10,
      reason: 'игрушка',
    });
    expect(s.balance).toBe(0);
  });

  it('не превышает максимум', () => {
    const s = applyEffect(state({ balance: MAX_BALANCE }), {
      do: 'grantCoins',
      amount: 100,
      reason: 'дела',
    });
    expect(s.balance).toBe(MAX_BALANCE);
  });

  it('отвергает отрицательные и дробные суммы', () => {
    expect(() =>
      applyEffect(state(), { do: 'grantCoins', amount: -1, reason: 'x' }),
    ).toThrow();
    expect(() =>
      applyEffect(state(), { do: 'takeCoins', amount: 2.5, reason: 'x' }),
    ).toThrow();
  });
});

describe('инвентарь', () => {
  it('выдаёт предмет', () => {
    const s = applyEffect(state(), { do: 'giveItem', itemId: 'shampoo' });
    expect(s.inventory.shampoo).toBe(1);
  });

  it('складывает количество', () => {
    let s = applyEffect(state(), { do: 'giveItem', itemId: 'food', count: 2 });
    s = applyEffect(s, { do: 'giveItem', itemId: 'food' });
    expect(s.inventory.food).toBe(3);
  });

  it('расходует предмет', () => {
    const s = applyEffect(state({ inventory: { food: 1 } }), {
      do: 'consumeItem',
      itemId: 'food',
    });
    expect(s.inventory.food).toBe(0);
  });

  it('расход отсутствующего предмета не уводит в минус', () => {
    const s = applyEffect(state(), { do: 'consumeItem', itemId: 'food' });
    expect(s.inventory.food ?? 0).toBe(0);
  });
});

describe('дела', () => {
  it('засчитывает выполнение', () => {
    let s = applyEffect(state(), { do: 'markTaskDone', taskId: 'pet' });
    s = applyEffect(s, { do: 'markTaskDone', taskId: 'pet' });
    expect(s.tasksToday.pet).toBe(2);
  });

  it('открывает новое дело без дублей', () => {
    let s = applyEffect(state(), { do: 'unlockTask', taskId: 'brush' });
    s = applyEffect(s, { do: 'unlockTask', taskId: 'brush' });
    expect(s.unlockedTasks).toEqual(['brush']);
  });
});

describe('новый день', () => {
  it('обнуляет счётчики дел и увеличивает день', () => {
    const s = applyEffect(state({ day: 2, tasksToday: { pet: 3, feed: 1 } }), {
      do: 'advanceDay',
    });
    expect(s.day).toBe(3);
    expect(s.tasksToday).toEqual({});
  });

  it('НЕ обнуляет баланс, инвентарь и открытые дела — накопленное не сгорает', () => {
    const before = state({
      day: 2,
      balance: 14,
      inventory: { food: 2 },
      unlockedTasks: ['brush'],
    });
    const s = applyEffect(before, { do: 'advanceDay' });
    expect(s.balance).toBe(14);
    expect(s.inventory).toEqual({ food: 2 });
    expect(s.unlockedTasks).toEqual(['brush']);
  });
});

describe('applyEffects', () => {
  it('применяет по порядку и не мутирует исходное состояние', () => {
    const before = state({ balance: 10 });
    const after = applyEffects(before, [
      { do: 'takeCoins', amount: 3, reason: 'шампунь' },
      { do: 'giveItem', itemId: 'shampoo' },
    ]);
    expect(after.balance).toBe(7);
    expect(after.inventory.shampoo).toBe(1);
    expect(before.balance).toBe(10);
    expect(before.inventory.shampoo).toBeUndefined();
  });
});

describe('имя игрока', () => {
  it('запоминается', () => {
    const s = applyEffect(state(), { do: 'setPlayerName', name: 'Вася' });
    expect(s.playerName).toBe('Вася');
  });

  it('негодное имя не записывается — поле остаётся прежним', () => {
    // Проверку проходит экран ввода; эффект — последний рубеж,
    // чтобы в сохранение не попало то, чего ребёнок не вводил.
    const s = applyEffect(state({ playerName: 'Аня' }), {
      do: 'setPlayerName',
      name: '<script>',
    });
    expect(s.playerName).toBe('Аня');
  });

  it('приводится к виду с заглавной буквы', () => {
    expect(
      applyEffect(state(), { do: 'setPlayerName', name: ' вася ' }).playerName,
    ).toBe('Вася');
  });
});

describe('награда за задание дня', () => {
  const reward = (id: 'plan' | 'savings', amount: number) =>
    ({ do: 'rewardChallenge', id, amount } as const);

  it('начисляется и видна в истории', () => {
    const s = applyEffect(state({ balance: 4 }), reward('plan', 2));
    expect(s.balance).toBe(6);
    expect(s.ledger[0]).toMatchObject({ kind: 'income', amount: 2 });
  });

  it('за один день — только раз', () => {
    // Перезапуск на итоге дня показывает экран заново; без защиты
    // награду можно было бы получать сколько угодно.
    const once = applyEffect(state({ balance: 0 }), reward('plan', 2));
    const twice = applyEffect(once, reward('plan', 2));
    expect(twice.balance).toBe(2);
  });

  it('задания считаются по отдельности', () => {
    // Одна отметка на оба сразу съела бы вторую награду.
    const first = applyEffect(state({ balance: 0 }), reward('plan', 2));
    const both = applyEffect(first, reward('savings', 1));
    expect(both.balance).toBe(3);
  });

  it('на следующий день награду можно получить снова', () => {
    const today = applyEffect(state({ balance: 0, day: 1 }), reward('plan', 2));
    const tomorrow = applyEffect({ ...today, day: 2 }, reward('plan', 2));
    expect(tomorrow.balance).toBe(4);
  });
});
