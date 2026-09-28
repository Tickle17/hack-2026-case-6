import { evaluate } from './conditions';
import { createInitialState } from './state';
import type { GameState, TaskSpec } from '../model/types';

const TASKS: TaskSpec[] = [
  { id: 'pet', title: 'Погладить', perDay: 3, unlockedFromStart: true },
  { id: 'feed', title: 'Покормить', perDay: 1, unlockedFromStart: true },
];

function state(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState('start'), ...patch };
}

describe('условие always', () => {
  it('всегда истинно', () => {
    expect(evaluate({ op: 'always' }, state(), TASKS)).toBe(true);
  });
});

describe('условие balance', () => {
  it.each([
    ['<', 10, 5, true],
    ['<', 10, 10, false],
    ['>=', 10, 10, true],
    ['=', 9, 9, true],
    ['>', 9, 9, false],
  ] as const)('%s %d при балансе %d → %s', (cmp, value, balance, expected) => {
    expect(
      evaluate({ op: 'balance', cmp, value }, state({ balance }), TASKS),
    ).toBe(expected);
  });
});

describe('условие hasItem', () => {
  it('видит предмет в инвентаре', () => {
    const s = state({ inventory: { shampoo: 1 } });
    expect(evaluate({ op: 'hasItem', itemId: 'shampoo' }, s, TASKS)).toBe(true);
  });

  it('не видит отсутствующий предмет', () => {
    expect(evaluate({ op: 'hasItem', itemId: 'shampoo' }, state(), TASKS)).toBe(
      false,
    );
  });

  it('учитывает количество', () => {
    const s = state({ inventory: { food: 2 } });
    expect(
      evaluate({ op: 'hasItem', itemId: 'food', count: 3 }, s, TASKS),
    ).toBe(false);
    expect(
      evaluate({ op: 'hasItem', itemId: 'food', count: 2 }, s, TASKS),
    ).toBe(true);
  });

  it('нулевое количество не считается наличием', () => {
    const s = state({ inventory: { food: 0 } });
    expect(evaluate({ op: 'hasItem', itemId: 'food' }, s, TASKS)).toBe(false);
  });
});

describe('условие taskDone', () => {
  it('по умолчанию требует выполнения нормы дня', () => {
    const once = state({ tasksToday: { pet: 1 } });
    const full = state({ tasksToday: { pet: 3 } });
    expect(evaluate({ op: 'taskDone', taskId: 'pet' }, once, TASKS)).toBe(
      false,
    );
    expect(evaluate({ op: 'taskDone', taskId: 'pet' }, full, TASKS)).toBe(true);
  });

  it('можно спросить про конкретное число раз', () => {
    const s = state({ tasksToday: { pet: 2 } });
    expect(
      evaluate({ op: 'taskDone', taskId: 'pet', times: 2 }, s, TASKS),
    ).toBe(true);
  });
});

describe('условие allTasksDone', () => {
  it('ложно, пока хоть одно дело не добито до нормы', () => {
    const s = state({ tasksToday: { pet: 3, feed: 0 } });
    expect(evaluate({ op: 'allTasksDone' }, s, TASKS)).toBe(false);
  });

  it('истинно, когда все нормы выполнены', () => {
    const s = state({ tasksToday: { pet: 3, feed: 1 } });
    expect(evaluate({ op: 'allTasksDone' }, s, TASKS)).toBe(true);
  });

  it('не требует дел, которые ещё не открыты уроком', () => {
    const tasks: TaskSpec[] = [
      ...TASKS,
      { id: 'brush', title: 'Причесать', perDay: 1, unlockedFromStart: false },
    ];
    const s = state({ tasksToday: { pet: 3, feed: 1 } });
    expect(evaluate({ op: 'allTasksDone' }, s, tasks)).toBe(true);

    const withUnlock = state({
      tasksToday: { pet: 3, feed: 1 },
      unlockedTasks: ['brush'],
    });
    expect(evaluate({ op: 'allTasksDone' }, withUnlock, tasks)).toBe(false);
  });
});

describe('логические операции', () => {
  it('not инвертирует', () => {
    expect(evaluate({ op: 'not', of: { op: 'always' } }, state(), TASKS)).toBe(
      false,
    );
  });

  it('and требует все', () => {
    const s = state({ balance: 10, day: 2 });
    const cond = {
      op: 'and' as const,
      all: [
        { op: 'balance' as const, cmp: '>=' as const, value: 10 },
        { op: 'day' as const, cmp: '=' as const, value: 2 },
      ],
    };
    expect(evaluate(cond, s, TASKS)).toBe(true);
    expect(evaluate(cond, state({ balance: 9, day: 2 }), TASKS)).toBe(false);
  });

  it('or требует хотя бы одно', () => {
    const cond = {
      op: 'or' as const,
      any: [
        { op: 'balance' as const, cmp: '>=' as const, value: 100 },
        { op: 'day' as const, cmp: '=' as const, value: 1 },
      ],
    };
    expect(evaluate(cond, state({ day: 1 }), TASKS)).toBe(true);
  });

  it('пустой and истинен, пустой or ложен', () => {
    expect(evaluate({ op: 'and', all: [] }, state(), TASKS)).toBe(true);
    expect(evaluate({ op: 'or', any: [] }, state(), TASKS)).toBe(false);
  });
});
