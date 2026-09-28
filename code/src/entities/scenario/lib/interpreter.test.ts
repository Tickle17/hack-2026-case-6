import { createRun } from './interpreter';
import type { Registries, Scenario, TaskSpec } from '../model/types';

const TASKS: TaskSpec[] = [
  { id: 'pet', title: 'Погладить', perDay: 2, unlockedFromStart: true },
  {
    id: 'feed',
    title: 'Покормить',
    perDay: 1,
    unlockedFromStart: true,
    requiresItem: 'food',
  },
];

const REGISTRIES: Registries = {
  tasks: TASKS,
  items: [
    {
      id: 'food',
      title: 'Корм',
      price: 3,
      kind: 'consumable',
      category: 'must',
      catalogId: 'main',
    },
  ],
  minigames: ['runner'],
  species: ['cat', 'dog'],
  catalogs: ['main'],
};

const SCENARIO: Scenario = {
  startNodeId: 'hello',
  nodes: [
    {
      id: 'hello',
      type: 'dialogue',
      speaker: 'mother',
      text: 'Привет!',
      next: 'pick',
    },
    {
      id: 'pick',
      type: 'choice',
      prompt: 'Кого хочешь?',
      options: [
        {
          id: 'cat',
          label: 'Кот',
          effects: [{ do: 'setPetSpecies', speciesId: 'cat' }],
          next: 'gift',
        },
        {
          id: 'dog',
          label: 'Пёс',
          effects: [{ do: 'setPetSpecies', speciesId: 'dog' }],
          next: 'gift',
        },
      ],
    },
    {
      id: 'gift',
      type: 'effect',
      effects: [{ do: 'giveItem', itemId: 'food' }],
      next: 'chores',
    },
    { id: 'chores', type: 'taskGate', require: 'all', next: 'evening' },
    {
      id: 'evening',
      type: 'endDay',
      reward: [{ do: 'grantCoins', amount: 10, reason: 'дела' }],
      next: 'done',
    },
    { id: 'done', type: 'dialogue', speaker: 'mother', text: 'Спокойной ночи' },
  ],
};

describe('интерпретатор', () => {
  it('стартует с указанного узла', () => {
    const run = createRun(SCENARIO, REGISTRIES);
    expect(run.current().id).toBe('hello');
  });

  it('идёт по next у обычного узла', () => {
    const run = createRun(SCENARIO, REGISTRIES);
    run.advance();
    expect(run.current().id).toBe('pick');
  });

  it('выбор применяет эффекты и уводит по своей ветке', () => {
    const run = createRun(SCENARIO, REGISTRIES);
    run.advance();
    run.choose('dog');
    expect(run.state().petSpeciesId).toBe('dog');
    // gift — узел без экрана, интерпретатор проходит его насквозь
    expect(run.current().id).toBe('chores');
  });

  it('отвергает несуществующий вариант выбора', () => {
    const run = createRun(SCENARIO, REGISTRIES);
    run.advance();
    expect(() => run.choose('parrot')).toThrow();
  });

  it('effect-узел применяет эффекты и проходит насквозь, не показываясь', () => {
    const run = createRun(SCENARIO, REGISTRIES);
    run.advance();
    run.choose('cat');
    expect(run.state().inventory.food).toBe(1);
    expect(run.current().id).toBe('chores');
  });
});

describe('taskGate — замок дня', () => {
  function atGate() {
    const run = createRun(SCENARIO, REGISTRIES);
    run.advance();
    run.choose('cat');
    return run;
  }

  it('не пускает дальше, пока дела не сделаны', () => {
    const run = atGate();
    run.advance();
    expect(run.current().id).toBe('chores');
  });

  it('пропускает, когда нормы выполнены', () => {
    const run = atGate();
    run.markTaskDone('pet');
    run.markTaskDone('pet');
    run.markTaskDone('feed');
    run.advance();
    expect(run.current().id).toBe('evening');
  });

  it('показывает норму ТЕКУЩЕГО замка, а не норму дня из реестра', () => {
    // Во вступлении гладят 1 раз, хотя норма дня — 2. Ребёнку нельзя
    // показывать цель 0/2, которой сейчас никто не требует.
    const introLike: Scenario = {
      startNodeId: 'gate',
      nodes: [
        {
          id: 'gate',
          type: 'taskGate',
          require: [{ taskId: 'pet', times: 1 }],
          next: 'done',
        },
        { id: 'done', type: 'dialogue', speaker: 'mother', text: 'Молодец' },
      ],
    };
    const r = createRun(introLike, REGISTRIES);
    expect(r.pendingTasks()).toEqual([{ taskId: 'pet', done: 0, need: 1 }]);

    r.markTaskDone('pet');
    expect(r.pendingTasks()).toEqual([]);
    r.advance();
    expect(r.current().id).toBe('done');
  });

  it('отдаёт ВСЕ дела дня с отметкой выполнения — для списка с галочками', () => {
    const run = atGate();
    expect(run.dayTasks()).toEqual([
      { taskId: 'pet', done: 0, need: 2, complete: false },
      { taskId: 'feed', done: 0, need: 1, complete: false },
    ]);

    run.markTaskDone('feed');
    // Выполненное дело НЕ исчезает из списка: ребёнок должен видеть галочку.
    expect(run.dayTasks()).toEqual([
      { taskId: 'pet', done: 0, need: 2, complete: false },
      { taskId: 'feed', done: 1, need: 1, complete: true },
    ]);
  });

  it('сообщает, каких дел не хватает', () => {
    const run = atGate();
    run.markTaskDone('pet');
    expect(run.pendingTasks()).toEqual([
      { taskId: 'pet', done: 1, need: 2 },
      { taskId: 'feed', done: 0, need: 1 },
    ]);
  });
});

describe('endDay', () => {
  it('выдаёт награду и увеличивает день', () => {
    const run = createRun(SCENARIO, REGISTRIES);
    run.advance();
    run.choose('cat');
    run.advance();
    run.markTaskDone('pet');
    run.markTaskDone('pet');
    run.markTaskDone('feed');
    run.advance();
    run.advance();
    expect(run.state().balance).toBe(10);
    expect(run.state().day).toBe(2);
    expect(run.state().tasksToday).toEqual({});
  });
});

describe('сцена', () => {
  const scened: Scenario = {
    startNodeId: 'a',
    nodes: [
      { id: 'a', type: 'dialogue', speaker: 'mother', text: 'дома', next: 'b' },
      {
        id: 'b',
        type: 'dialogue',
        speaker: 'teacher',
        text: 'в школе',
        scene: 'school',
        next: 'c',
      },
      {
        id: 'c',
        type: 'dialogue',
        speaker: 'teacher',
        text: 'всё ещё в школе',
        next: 'd',
      },
      {
        id: 'd',
        type: 'dialogue',
        speaker: 'hero',
        text: 'дома',
        scene: 'home',
      },
    ],
  };

  it('по умолчанию дом', () => {
    expect(createRun(scened, REGISTRIES).scene()).toBe('home');
  });

  it('меняется, когда узел это указывает', () => {
    const r = createRun(scened, REGISTRIES);
    r.advance();
    expect(r.scene()).toBe('school');
  });

  it('НАСЛЕДУЕТСЯ следующими узлами — помечать каждую реплику не нужно', () => {
    const r = createRun(scened, REGISTRIES);
    r.advance();
    r.advance();
    expect(r.current().id).toBe('c');
    expect(r.scene()).toBe('school');
  });

  it('возвращается, когда узел указывает другую сцену', () => {
    const r = createRun(scened, REGISTRIES);
    r.advance();
    r.advance();
    r.advance();
    expect(r.scene()).toBe('home');
  });
});

describe('branch', () => {
  const branching: Scenario = {
    startNodeId: 'check',
    nodes: [
      {
        id: 'check',
        type: 'branch',
        fallback: 'poor',
        branches: [
          { when: { op: 'balance', cmp: '>=', value: 9 }, next: 'rich' },
        ],
      },
      { id: 'rich', type: 'dialogue', speaker: 'hero', text: 'Хватило' },
      { id: 'poor', type: 'dialogue', speaker: 'hero', text: 'Не хватило' },
    ],
  };

  it('уводит по выполненному условию, не показывая сам branch', () => {
    const run = createRun(branching, REGISTRIES, { balance: 10 });
    expect(run.current().id).toBe('rich');
  });

  it('уводит в fallback, если ни одно условие не выполнено', () => {
    const run = createRun(branching, REGISTRIES, { balance: 1 });
    expect(run.current().id).toBe('poor');
  });
});

describe('riddle', () => {
  const withRiddle: Scenario = {
    startNodeId: 'r',
    nodes: [
      {
        id: 'r',
        type: 'riddle',
        competencyId: 'draft:count',
        prompt: '10 − 3 − 3 − ? = 1',
        options: [{ value: 1 }, { value: 3, correct: true }, { value: 5 }],
        onWrong: 'Почти!',
        onRight: 'Верно!',
        retry: 'forever',
        next: 'after',
      },
      {
        id: 'after',
        type: 'dialogue',
        speaker: 'teacher',
        text: 'Идём дальше',
      },
    ],
  };

  it('неверный ответ НЕ выпускает и НЕ наказывает', () => {
    const run = createRun(withRiddle, REGISTRIES);
    const res = run.answer(5);
    expect(res.correct).toBe(false);
    expect(res.message).toBe('Почти!');
    expect(run.current().id).toBe('r');
    expect(run.state().balance).toBe(0);
  });

  it('верный ответ хвалит и пропускает дальше', () => {
    const run = createRun(withRiddle, REGISTRIES);
    run.answer(5);
    run.answer(1);
    const res = run.answer(3);
    expect(res.correct).toBe(true);
    expect(res.message).toBe('Верно!');
    run.advance();
    expect(run.current().id).toBe('after');
  });

  it('не считает попытки — счётчика ошибок нет', () => {
    const run = createRun(withRiddle, REGISTRIES);
    for (let i = 0; i < 20; i++) {
      run.answer(5);
    }
    expect(run.answer(3).correct).toBe(true);
  });

  it('ответ не из списка — ошибка разработчика, а не ребёнка', () => {
    // У загадки варианты перечислены: чужое значение означает, что
    // экран разошёлся со сценарием. Молчать про это нельзя.
    const run = createRun(withRiddle, REGISTRIES);
    expect(() => run.answer(42)).toThrow();
  });
});

/**
 * Задание «собери фразу»: ответ не выбирают из списка, а составляют.
 * Собранных неверно фраз бесконечно много, и ни одна из них не лежит
 * в вариантах — движок обязан считать такую фразу просто неверной.
 */
describe('собранная фраза', () => {
  const assembling: Scenario = {
    startNodeId: 'r',
    nodes: [
      {
        id: 'r',
        type: 'riddle',
        competencyId: 'draft:words',
        prompt: 'Собери: что такое бюджет',
        assemble: true,
        options: [{ value: 'Бюджет это план расходов', correct: true }],
        onWrong: 'Почти! Попробуй переставить слова.',
        onRight: 'Верно!',
        retry: 'forever',
        next: 'after',
      },
      {
        id: 'after',
        type: 'dialogue',
        speaker: 'teacher',
        text: 'Идём дальше',
      },
    ],
  };

  it('неверный порядок слов — это ошибка, а не поломка', () => {
    const run = createRun(assembling, REGISTRIES);
    const res = run.answer('план Бюджет это расходов');

    expect(res.correct).toBe(false);
    expect(res.message).toBe('Почти! Попробуй переставить слова.');
    expect(run.current().id).toBe('r');
  });

  it('верный порядок засчитывается', () => {
    const run = createRun(assembling, REGISTRIES);
    run.answer('это Бюджет план расходов');
    const res = run.answer('Бюджет это план расходов');

    expect(res.correct).toBe(true);
    run.advance();
    expect(run.current().id).toBe('after');
  });
});

describe('сцена переживает перезапуск', () => {
  /** Сценарий с классом: сцена объявлена только на первом узле. */
  const WITH_SCHOOL: Scenario = {
    startNodeId: 'home',
    nodes: [
      {
        id: 'home',
        type: 'dialogue',
        speaker: 'hero',
        text: 'Дома',
        next: 'class',
      },
      {
        id: 'class',
        type: 'dialogue',
        speaker: 'teacher',
        text: 'В классе',
        scene: 'school',
        next: 'task',
      },
      // Сцену НЕ объявляет — наследует школу от предыдущего узла.
      {
        id: 'task',
        type: 'dialogue',
        speaker: 'teacher',
        text: 'Задача',
        next: 'task',
      },
    ],
  };

  it('восстановление на школьном узле возвращает школу, а не дом', () => {
    const first = createRun(WITH_SCHOOL, REGISTRIES);
    first.advance();
    first.advance();
    expect(first.current().id).toBe('task');
    expect(first.scene()).toBe('school');

    // Перезапуск: истории нет, есть только сохранённое состояние.
    const restored = createRun(WITH_SCHOOL, REGISTRIES, first.state());
    expect(restored.scene()).toBe('school');
  });

  it('восстановление дома оставляет дом', () => {
    const r = createRun(WITH_SCHOOL, REGISTRIES);
    const restored = createRun(WITH_SCHOOL, REGISTRIES, r.state());
    expect(restored.scene()).toBe('home');
  });
});
