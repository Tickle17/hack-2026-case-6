import { validateScenario, validateLessons } from './validate';
import { PLAYER_SLOT } from './text';
import { INTRO } from '../config/intro';
import { LESSONS } from '../config/lessons';
import { REGISTRIES } from '../config/registries';
import type { Scenario, Lesson } from '../model/types';

describe('стражи сценария: реальный сценарий проходит', () => {
  it('в сценарии вступления нет ни одной проблемы', () => {
    expect(validateScenario(INTRO, REGISTRIES)).toEqual([]);
  });

  it('в пуле уроков нет ни одной проблемы', () => {
    expect(validateLessons(LESSONS, REGISTRIES)).toEqual([]);
  });
});

describe('страж 1: висящие переходы', () => {
  it('ловит next в несуществующий узел', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        { id: 'a', type: 'dialogue', speaker: 'x', text: 'y', next: 'nowhere' },
      ],
    };
    expect(validateScenario(broken, REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'dangling', nodeId: 'a' }),
    );
  });

  it('ловит висящий переход в branch', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        {
          id: 'a',
          type: 'branch',
          fallback: 'nope',
          branches: [{ when: { op: 'always' }, next: 'nada' }],
        },
      ],
    };
    const problems = validateScenario(broken, REGISTRIES);
    expect(problems.filter(p => p.rule === 'dangling')).toHaveLength(2);
  });
});

describe('страж 2: недостижимые узлы', () => {
  it('ловит узел, до которого не дойти', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        { id: 'a', type: 'dialogue', speaker: 'x', text: 'y' },
        { id: 'orphan', type: 'dialogue', speaker: 'x', text: 'y' },
      ],
    };
    expect(validateScenario(broken, REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'unreachable', nodeId: 'orphan' }),
    );
  });
});

describe('страж 4: ссылки на реестры', () => {
  it('ловит несуществующий товар', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        {
          id: 'a',
          type: 'effect',
          effects: [{ do: 'giveItem', itemId: 'unicorn' }],
        },
      ],
    };
    expect(validateScenario(broken, REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'unknownRef' }),
    );
  });

  it('ловит несуществующее дело', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        { id: 'a', type: 'taskGate', require: [{ taskId: 'fly', times: 1 }] },
      ],
    };
    expect(validateScenario(broken, REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'unknownRef' }),
    );
  });

  it('ловит несуществующий вид питомца', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        {
          id: 'a',
          type: 'effect',
          effects: [{ do: 'setPetSpecies', speciesId: 'dragon' }],
        },
      ],
    };
    expect(validateScenario(broken, REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'unknownRef' }),
    );
  });
});

describe('страж 5: обучающие узлы привязаны к компетенции', () => {
  it('ловит загадку без competencyId', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        {
          id: 'a',
          type: 'riddle',
          competencyId: '',
          prompt: '?',
          options: [{ value: 1, correct: true }],
          onWrong: 'x',
          onRight: 'y',
          retry: 'forever',
        },
      ],
    };
    expect(validateScenario(broken, REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'noCompetency' }),
    );
  });
});

describe('страж 8: запрещённые механики', () => {
  it('ловит загадку без верного ответа — из неё не выйти', () => {
    const broken: Scenario = {
      startNodeId: 'a',
      nodes: [
        {
          id: 'a',
          type: 'riddle',
          competencyId: 'draft:x',
          prompt: '?',
          options: [{ value: 1 }, { value: 2 }],
          onWrong: 'x',
          onRight: 'y',
          retry: 'forever',
        },
      ],
    };
    expect(validateScenario(broken, REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'noCorrectAnswer' }),
    );
  });
});

describe('стражи уроков', () => {
  const base: Lesson = LESSONS[0];

  it('страж 9: ловит урок без appliesToday', () => {
    const broken = { ...base, appliesToday: undefined } as unknown as Lesson;
    expect(validateLessons([broken], REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'noAppliesToday' }),
    );
  });

  it('страж 10: ловит урок, открывающий несуществующее дело', () => {
    const broken: Lesson = {
      ...base,
      unlocks: [{ do: 'unlockTask', taskId: 'fly' }],
    };
    expect(validateLessons([broken], REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'unknownRef' }),
    );
  });

  it('страж 12: ловит открытое дело, для которого нечего купить', () => {
    const broken: Lesson = {
      ...base,
      unlocks: [{ do: 'unlockTask', taskId: 'brushless' }],
    };
    const registries = {
      ...REGISTRIES,
      tasks: [
        ...REGISTRIES.tasks,
        {
          id: 'brushless',
          title: 'Причесать',
          perDay: 1,
          requiresItem: 'brush',
          unlockedFromStart: false,
        },
      ],
    };
    expect(validateLessons([broken], registries)).toContainEqual(
      expect.objectContaining({ rule: 'unbuyableRequirement' }),
    );
  });

  it('ловит урок без competencyId', () => {
    const broken: Lesson = { ...base, competencyId: '' };
    expect(validateLessons([broken], REGISTRIES)).toContainEqual(
      expect.objectContaining({ rule: 'noCompetency' }),
    );
  });
});

describe('дни выводятся, а не назначаются', () => {
  it('в пуле нет ни дублей, ни дырок — по построению', () => {
    // Стражи на это убраны вместе с полем `day`: номер дня выводится
    // из порядка задания, и разойтись с порядком он не может.
    const days = LESSONS.map(l => l.day);
    expect(days).toEqual(days.map((_, i) => days[0] + i));
  });
});

describe('приглашение к заданию', () => {
  it('урок без приглашения не проходит: ребёнок не поймёт, что от него ждут', () => {
    const lesson = { ...LESSONS[0], taskPrompt: '   ' };
    const problems = validateLessons([lesson], REGISTRIES);
    expect(problems.map(p => p.rule)).toContain('noTaskPrompt');
  });

  it('у всех уроков приглашение есть и зовёт по имени', () => {
    LESSONS.forEach(l => {
      expect(l.taskPrompt.trim()).not.toBe('');
      expect(l.taskPrompt).toContain(PLAYER_SLOT);
    });
  });
});
