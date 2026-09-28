import {
  saveState,
  loadState,
  clearState,
  type StatePort,
} from './persistence';
import { createInitialState, STATE_VERSION } from './state';
import type { GameState } from '../model/types';

/** Хранилище в памяти — тесты не должны зависеть от нативного MMKV. */
function memoryPort(
  initial: string | null = null,
): StatePort & { value: string | null } {
  return {
    value: initial,
    read() {
      return this.value;
    },
    write(v: string) {
      this.value = v;
    },
    clear() {
      this.value = null;
    },
  };
}

function state(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState('start'), ...patch };
}

describe('сохранение и загрузка', () => {
  it('состояние переживает круг сохранить → загрузить', () => {
    const port = memoryPort();
    const before = state({
      day: 4,
      balance: 17,
      petSpeciesId: 'pig',
      inventory: { food: 2, shampoo: 1 },
      tasksToday: { pet: 2 },
      unlockedTasks: ['brush'],
      flags: { 'shop.visited': true },
      currentNodeId: 'loop.day',
      shopUnlocked: true,
    });

    saveState(before, port);
    expect(loadState(port)).toEqual(before);
  });

  it('пустое хранилище — начинаем заново, без ошибки', () => {
    expect(loadState(memoryPort())).toBeNull();
  });

  it('битые данные не роняют игру', () => {
    expect(loadState(memoryPort('{это не json'))).toBeNull();
    expect(loadState(memoryPort('null'))).toBeNull();
    expect(loadState(memoryPort('[]'))).toBeNull();
  });

  it('сохранение из будущей версии игнорируется', () => {
    const port = memoryPort();
    saveState(state({ day: 3 }), port);
    const raw = JSON.parse(port.value as string);
    raw.version = STATE_VERSION + 1;
    port.value = JSON.stringify(raw);

    // Формат мог измениться несовместимо — лучше начать заново,
    // чем упасть на чужой структуре.
    expect(loadState(port)).toBeNull();
  });

  it('старая версия без нужных полей дополняется значениями по умолчанию', () => {
    const port = memoryPort(
      JSON.stringify({
        version: STATE_VERSION,
        state: { day: 2, balance: 5, currentNodeId: 'loop.day' },
      }),
    );

    const loaded = loadState(port);
    expect(loaded).not.toBeNull();
    expect(loaded!.day).toBe(2);
    expect(loaded!.balance).toBe(5);
    // Поля, которых не было в старом сохранении.
    expect(loaded!.inventory).toEqual({});
    expect(loaded!.unlockedTasks).toEqual([]);
    expect(loaded!.lessonsDone).toEqual([]);
  });

  it('баланс из повреждённого сохранения не уводит игру в минус', () => {
    const port = memoryPort(
      JSON.stringify({
        version: STATE_VERSION,
        state: { balance: -50, currentNodeId: 'x' },
      }),
    );
    expect(loadState(port)!.balance).toBe(0);
  });

  it('накопления, план и цель переживают перезапуск', () => {
    const port = memoryPort();
    const before = state({
      savings: 14,
      plan: { must: 6, want: 4, save: 2 },
      spent: { must: 3, want: 0 },
      goalId: 'house',
      savingsHistory: [2, 4, 2],
    });

    saveState(before, port);
    const after = loadState(port)!;
    expect(after.savings).toBe(14);
    expect(after.plan).toEqual({ must: 6, want: 4, save: 2 });
    expect(after.spent).toEqual({ must: 3, want: 0 });
    expect(after.goalId).toBe('house');
  });

  it('накопления из повреждённого сохранения не уходят в минус', () => {
    const port = memoryPort(
      JSON.stringify({
        version: STATE_VERSION,
        state: { savings: -7, currentNodeId: 'x' },
      }),
    );
    expect(loadState(port)!.savings).toBe(0);
  });

  it('битый план не ломает игру — начинаем день без плана', () => {
    const port = memoryPort(
      JSON.stringify({
        version: STATE_VERSION,
        state: { plan: 'не объект', currentNodeId: 'x' },
      }),
    );
    expect(loadState(port)!.plan).toBeNull();
  });

  it('сброс очищает хранилище', () => {
    const port = memoryPort();
    saveState(state({ day: 9 }), port);
    clearState(port);
    expect(loadState(port)).toBeNull();
  });
});

describe('имя игрока в сохранении', () => {
  it('переживает перезапуск', () => {
    const port = memoryPort();
    saveState(state({ playerName: 'Аня' }), port);
    expect(loadState(port)!.playerName).toBe('Аня');
  });

  it('испорченное имя не попадает в игру — спросим заново', () => {
    const port = memoryPort(
      JSON.stringify({
        version: STATE_VERSION,
        state: { playerName: '<><>', currentNodeId: 'x' },
      }),
    );
    expect(loadState(port)!.playerName).toBe('');
  });

  it('сохранение без имени не роняет игру', () => {
    const port = memoryPort(
      JSON.stringify({
        version: STATE_VERSION,
        state: { day: 2, currentNodeId: 'x' },
      }),
    );
    expect(loadState(port)!.playerName).toBe('');
  });
});
