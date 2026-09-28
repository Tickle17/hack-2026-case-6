import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { FLOOR, MAX_STAT } from '@/entities/pet/lib/pet-stats';

/**
 * Показатели питомца в состоянии игры (UC-5).
 *
 * ТЗ 2.5.9: после финансового действия видно изменение связанного
 * показателя питомца. ТЗ 2.2: явных негативных последствий от ошибок
 * пользователя быть не должно.
 */

function run() {
  return createRun(INTRO, REGISTRIES);
}

describe('показатели питомца', () => {
  it('новый питомец не голодный и не грустный', () => {
    const s = run().state();
    expect(s.stats.satiety).toBeGreaterThan(50);
    expect(s.stats.mood).toBeGreaterThan(50);
    expect(s.stats.cleanliness).toBeGreaterThan(50);
  });

  it('покупка корма поднимает сытость', () => {
    const r = run();
    const before = r.state().stats.satiety;
    r.apply([{ do: 'changeStat', stat: 'satiety', amount: 15 }]);

    expect(r.state().stats.satiety).toBe(Math.min(MAX_STAT, before + 15));
  });

  it('показатель не превышает максимум', () => {
    const r = run();
    r.apply([{ do: 'changeStat', stat: 'mood', amount: 500 }]);
    expect(r.state().stats.mood).toBe(MAX_STAT);
  });

  it('показатель НЕ падает ниже пола — питомец не доходит до беды', () => {
    const r = run();
    // Сколько бы дней ни прошло, до нуля питомец не опускается:
    // CLAUDE.md запрещает механику «питомец умрёт, если не зайдёшь».
    for (let i = 0; i < 20; i++) {
      r.apply([{ do: 'advanceDay' }]);
    }
    const s = r.state().stats;
    expect(s.satiety).toBeGreaterThanOrEqual(FLOOR);
    expect(s.mood).toBeGreaterThanOrEqual(FLOOR);
    expect(s.cleanliness).toBeGreaterThanOrEqual(FLOOR);
  });

  it('новый день немного снижает показатели', () => {
    const r = run();
    const before = r.state().stats.satiety;
    r.apply([{ do: 'advanceDay' }]);

    expect(r.state().stats.satiety).toBeLessThan(before);
  });

  it('забота восполняет показатели: делам есть смысл', () => {
    const r = run();
    r.apply([{ do: 'setPetSpecies', speciesId: 'cat' }, { do: 'advanceDay' }]);
    const hungry = r.state().stats.satiety;

    r.apply([{ do: 'markTaskDone', taskId: 'feed' }]);
    expect(r.state().stats.satiety).toBeGreaterThan(hungry);
  });

  it('если делать все дела, питомцу НЕ становится хуже день ото дня', () => {
    // Красная линия из CLAUDE.md: питомец не наказывает ребёнка.
    // Заботишься — он в порядке, и так каждый день.
    const r = run();
    r.apply([{ do: 'setPetSpecies', speciesId: 'cat' }]);
    const start = { ...r.state().stats };

    for (let day = 0; day < 7; day++) {
      r.apply([{ do: 'advanceDay' }, { do: 'completeAllTasks' }]);
    }

    const end = r.state().stats;
    expect(end.satiety).toBeGreaterThanOrEqual(start.satiety - 5);
    expect(end.mood).toBeGreaterThanOrEqual(start.mood - 5);
    expect(end.cleanliness).toBeGreaterThanOrEqual(start.cleanliness - 5);
  });

  it('день записывается в историю заботы ровно один раз', () => {
    // Перезапуск приложения на узле конца дня показывает итог заново.
    // Если запись дня не идемпотентна, история раздувается, и питомец
    // растёт быстрее, чем заслужил.
    const r = run();
    r.apply([{ do: 'recordDay', score: 2 }]);
    r.apply([{ do: 'recordDay', score: 2 }]);
    r.apply([{ do: 'recordDay', score: 3 }]);

    expect(r.state().careHistory).toEqual([2]);
  });

  it('новый день записывается отдельно', () => {
    const r = run();
    r.apply([{ do: 'recordDay', score: 2 }]);
    r.apply([{ do: 'advanceDay' }]);
    r.apply([{ do: 'recordDay', score: 3 }]);

    expect(r.state().careHistory).toEqual([2, 3]);
  });

  it('опыт дня начисляется ровно один раз', () => {
    // Перезапуск на итоге дня не должен давать опыт повторно — иначе
    // уровень можно было бы накрутить, открывая игру заново.
    const r = run();
    r.apply([{ do: 'recordDay', score: 3, xp: 25 }]);
    r.apply([{ do: 'recordDay', score: 3, xp: 25 }]);

    expect(r.state().xp).toBe(25);
  });

  it('опыт копится от дня ко дню и не убывает', () => {
    const r = run();
    r.apply([{ do: 'recordDay', score: 3, xp: 25 }]);
    r.apply([{ do: 'advanceDay' }]);
    r.apply([{ do: 'recordDay', score: 0, xp: 0 }]);
    r.apply([{ do: 'advanceDay' }]);
    r.apply([{ do: 'recordDay', score: 2, xp: 13 }]);

    // Пустой день не отнимает достигнутого: питомец не наказывает.
    expect(r.state().xp).toBe(38);
  });

  it('отрицательный опыт не принимается', () => {
    const r = run();
    r.apply([{ do: 'recordDay', score: 0, xp: -10 }]);

    expect(r.state().xp).toBe(0);
  });

  it('новый питомец начинает без опыта', () => {
    expect(run().state().xp).toBe(0);
  });

  it('покупка запоминает, нужная это вещь или для радости', () => {
    // По этой отметке считается опыт за вещи для настроения.
    const r = run();
    r.apply([
      { do: 'grantCoins', amount: 10, reason: 'тест' },
      { do: 'planBudget', must: 5, want: 5, save: 0 },
      { do: 'spendFrom', category: 'want', amount: 1, reason: 'Бантик' },
      { do: 'spendFrom', category: 'must', amount: 3, reason: 'Корм' },
    ]);

    const spent = r.state().ledger.filter(e => e.kind === 'expense');
    expect(spent.find(e => e.reason === 'Бантик')?.category).toBe('want');
    expect(spent.find(e => e.reason === 'Корм')?.category).toBe('must');
  });

  it('у каждого товара есть понятное влияние на питомца', () => {
    // ТЗ 2.5.6 требует показать влияние ДО покупки.
    REGISTRIES.items.forEach(i => {
      expect(i.effectHint).toBeTruthy();
    });
  });
});

describe('голод в реальном времени', () => {
  const HOUR = 60 * 60 * 1000;
  const t0 = 1_700_000_000_000;

  it('первый замер только запоминает время — сытость не трогает', () => {
    const r = run();
    const before = r.state().stats.satiety;
    r.apply([{ do: 'hungerTick', now: t0 }]);
    expect(r.state().stats.satiety).toBe(before);
    expect(r.state().hungerSince).toBe(t0);
  });

  it('через три часа сытость меньше на три', () => {
    const r = run();
    const before = r.state().stats.satiety;
    r.apply([{ do: 'hungerTick', now: t0 }]);
    r.apply([{ do: 'hungerTick', now: t0 + 3 * HOUR }]);
    expect(r.state().stats.satiety).toBe(before - 3);
  });

  it('повторный замер в тот же час ничего не меняет', () => {
    const r = run();
    r.apply([{ do: 'hungerTick', now: t0 }]);
    r.apply([{ do: 'hungerTick', now: t0 + HOUR }]);
    const after = r.state().stats.satiety;
    r.apply([{ do: 'hungerTick', now: t0 + HOUR + 1000 }]);
    expect(r.state().stats.satiety).toBe(after);
  });
});

describe('к концу дня питомец проголодался', () => {
  it('после смены дня сытость меньше половины, даже если он был сыт', () => {
    const r = run();
    r.apply([{ do: 'changeStat', stat: 'satiety', amount: 100 }]);
    r.apply([{ do: 'advanceDay' }]);
    expect(r.state().stats.satiety).toBeLessThan(50);
  });

  it('но не ниже пола', () => {
    const r = run();
    r.apply([{ do: 'changeStat', stat: 'satiety', amount: -100 }]);
    r.apply([{ do: 'advanceDay' }]);
    expect(r.state().stats.satiety).toBe(FLOOR);
  });
});
