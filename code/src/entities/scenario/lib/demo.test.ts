import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { LESSONS } from '../config/lessons';
import type { ScenarioRun } from './interpreter';

/**
 * Демонстрационный режим (UC-8).
 *
 * ТЗ 2.5.13: этапы игрового цикла воспроизводятся подряд без ожидания
 * календарных сроков, тестовый профиль сбрасывается в исходное.
 * ТЗ 2.6: не менее пяти последовательных периодов.
 */

function run(): ScenarioRun {
  return createRun(INTRO, REGISTRIES);
}

/** Пройти день целиком, как это делает кнопка «следующий день». */
function skipDay(r: ScenarioRun): void {
  r.apply([{ do: 'completeAllTasks' }]);
  for (let i = 0; i < 80; i++) {
    const node = r.current();
    if (node.type === 'choice' && node.id === 'bd.pick') {
      r.choose('cat');
      continue;
    }
    if (node.type === 'riddle') {
      // answer только помечает ответ верным; дальше двигает advance.
      r.answer(node.options.find(o => o.correct)!.value);
    }
    if (node.type === 'taskGate') {
      r.apply([{ do: 'completeAllTasks' }]);
    }
    const before = r.current().id;
    r.advance();
    if (r.current().id === before) {
      break;
    }
  }
}

describe('режим включается и запоминается', () => {
  it('по умолчанию выключен', () => {
    expect(run().state().demoMode).toBe(false);
  });

  it('включается эффектом', () => {
    const r = run();
    r.apply([{ do: 'setDemoMode', on: true }]);
    expect(r.state().demoMode).toBe(true);
  });
});

describe('дела закрываются одним действием', () => {
  it('completeAllTasks закрывает все дела дня', () => {
    const r = run();
    r.apply([
      { do: 'setPetSpecies', speciesId: 'cat' },
      { do: 'completeAllTasks' },
    ]);

    REGISTRIES.tasks.forEach(t => {
      expect(r.state().tasksToday[t.id] ?? 0).toBeGreaterThanOrEqual(t.perDay);
    });
  });

  it('повторный вызов ничего не ломает', () => {
    const r = run();
    r.apply([{ do: 'completeAllTasks' }, { do: 'completeAllTasks' }]);
    expect(r.state().balance).toBeGreaterThanOrEqual(0);
  });
});

describe('пять периодов подряд без ожидания', () => {
  it('день доходит до пятого и цикл не ломается', () => {
    const r = run();
    for (let i = 0; i < 6; i++) {
      skipDay(r);
    }

    // ТЗ 2.6 требует не менее пяти воспроизводимых периодов.
    expect(r.state().day).toBeGreaterThanOrEqual(5);
    expect(r.state().balance).toBeGreaterThanOrEqual(0);
  });

  it('все уроки сценария проходятся за эти дни', () => {
    const r = run();
    for (let i = 0; i < 6; i++) {
      skipDay(r);
    }

    // Каждая тема должна успеть встретиться — иначе эксперт её не увидит.
    LESSONS.forEach(l => {
      expect(r.state().lessonsDone).toContain(l.id);
    });
  });

  it('накопленное за пять дней не теряется', () => {
    const r = run();
    skipDay(r);
    const after1 = r.state().balance;
    for (let i = 0; i < 4; i++) {
      skipDay(r);
    }

    expect(r.state().balance).toBeGreaterThan(after1);
  });
});
