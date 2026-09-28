import type {
  Condition,
  Effect,
  Lesson,
  Node,
  Registries,
  Scenario,
  ScenarioId,
} from '../model/types';

/**
 * Стражи сценария. См. docs/scenario-engine.md, раздел «Тесты-стражи».
 *
 * Смысл: сценарий для детей ломать нельзя. Данные можно провалидировать
 * до запуска — со скриптом на JS это было бы невозможно.
 */

export type Problem = {
  rule:
    | 'dangling'
    | 'unreachable'
    | 'deadEnd'
    | 'unknownRef'
    | 'noCompetency'
    | 'noCorrectAnswer'
    | 'noAppliesToday'
    | 'noTaskPrompt'
    | 'unbuyableRequirement';
  nodeId?: ScenarioId;
  lessonId?: string;
  detail: string;
};

// ------------------------------------------------------------------ helpers

function outgoing(node: Node): ScenarioId[] {
  const out: ScenarioId[] = [];
  if (node.next) {
    out.push(node.next);
  }
  if (node.type === 'choice') {
    node.options.forEach(o => out.push(o.next));
  }
  if (node.type === 'branch') {
    node.branches.forEach(b => out.push(b.next));
    out.push(node.fallback);
  }
  return out;
}

function effectsOf(node: Node): Effect[] {
  if (node.type === 'effect') {
    return node.effects;
  }
  if (node.type === 'endDay') {
    return node.reward ?? [];
  }
  if (node.type === 'minigame') {
    return node.onComplete ?? [];
  }
  if (node.type === 'choice') {
    return node.options.flatMap(o => o.effects ?? []);
  }
  return [];
}

function conditionRefs(c: Condition): {
  items: string[];
  tasks: string[];
  species: string[];
} {
  const acc = {
    items: [] as string[],
    tasks: [] as string[],
    species: [] as string[],
  };
  const walk = (cond: Condition): void => {
    switch (cond.op) {
      case 'hasItem':
        acc.items.push(cond.itemId);
        break;
      case 'taskDone':
        acc.tasks.push(cond.taskId);
        break;
      case 'petSpecies':
        acc.species.push(cond.speciesId);
        break;
      case 'not':
        walk(cond.of);
        break;
      case 'and':
        cond.all.forEach(walk);
        break;
      case 'or':
        cond.any.forEach(walk);
        break;
      default:
        break;
    }
  };
  walk(c);
  return acc;
}

function checkEffectRefs(
  effects: Effect[],
  registries: Registries,
  where: { nodeId?: string; lessonId?: string },
): Problem[] {
  const problems: Problem[] = [];
  const has = {
    item: (id: string) => registries.items.some(i => i.id === id),
    task: (id: string) => registries.tasks.some(t => t.id === id),
    species: (id: string) => registries.species.includes(id),
    catalog: (id: string) => registries.catalogs.includes(id),
  };

  effects.forEach(e => {
    const bad = (detail: string): void => {
      problems.push({ rule: 'unknownRef', ...where, detail });
    };
    if (
      (e.do === 'giveItem' || e.do === 'consumeItem') &&
      !has.item(e.itemId)
    ) {
      bad(`неизвестный товар "${e.itemId}"`);
    }
    if (
      (e.do === 'markTaskDone' || e.do === 'unlockTask') &&
      !has.task(e.taskId)
    ) {
      bad(`неизвестное дело "${e.taskId}"`);
    }
    if (e.do === 'setPetSpecies' && !has.species(e.speciesId)) {
      bad(`неизвестный вид питомца "${e.speciesId}"`);
    }
    if (e.do === 'unlockCatalog' && !has.catalog(e.catalogId)) {
      bad(`неизвестный каталог "${e.catalogId}"`);
    }
  });

  return problems;
}

// ---------------------------------------------------------------- сценарий

export function validateScenario(
  scenario: Scenario,
  registries: Registries,
): Problem[] {
  const problems: Problem[] = [];
  const ids = new Set(scenario.nodes.map(n => n.id));

  // 1. Висящие переходы
  scenario.nodes.forEach(node => {
    outgoing(node).forEach(target => {
      if (!ids.has(target)) {
        problems.push({
          rule: 'dangling',
          nodeId: node.id,
          detail: `переход в несуществующий узел "${target}"`,
        });
      }
    });
  });

  // 2. Недостижимые узлы
  const reachable = new Set<ScenarioId>();
  const queue: ScenarioId[] = [scenario.startNodeId];
  const byId = new Map(scenario.nodes.map(n => [n.id, n]));
  while (queue.length) {
    const id = queue.shift() as ScenarioId;
    if (reachable.has(id)) {
      continue;
    }
    reachable.add(id);
    const node = byId.get(id);
    if (node) {
      outgoing(node).forEach(t => queue.push(t));
    }
  }
  scenario.nodes.forEach(node => {
    if (!reachable.has(node.id)) {
      problems.push({
        rule: 'unreachable',
        nodeId: node.id,
        detail: 'до узла невозможно дойти',
      });
    }
  });

  scenario.nodes.forEach(node => {
    // 4. Ссылки на реестры
    problems.push(
      ...checkEffectRefs(effectsOf(node), registries, { nodeId: node.id }),
    );

    if (node.when) {
      const refs = conditionRefs(node.when);
      refs.items.forEach(id => {
        if (!registries.items.some(i => i.id === id)) {
          problems.push({
            rule: 'unknownRef',
            nodeId: node.id,
            detail: `условие ссылается на неизвестный товар "${id}"`,
          });
        }
      });
    }

    if (node.type === 'taskGate' && node.require !== 'all') {
      node.require.forEach(r => {
        if (!registries.tasks.some(t => t.id === r.taskId)) {
          problems.push({
            rule: 'unknownRef',
            nodeId: node.id,
            detail: `неизвестное дело "${r.taskId}"`,
          });
        }
      });
    }

    if (node.type === 'minigame') {
      if (!registries.minigames.includes(node.gameId)) {
        problems.push({
          rule: 'unknownRef',
          nodeId: node.id,
          detail: `неизвестная мини-игра "${node.gameId}"`,
        });
      }
      if (
        node.countsAsTask &&
        !registries.tasks.some(t => t.id === node.countsAsTask)
      ) {
        problems.push({
          rule: 'unknownRef',
          nodeId: node.id,
          detail: `неизвестное дело "${node.countsAsTask}"`,
        });
      }
    }

    if (node.type === 'shop' && !registries.catalogs.includes(node.catalogId)) {
      problems.push({
        rule: 'unknownRef',
        nodeId: node.id,
        detail: `неизвестный каталог "${node.catalogId}"`,
      });
    }

    // 5. Обучающий узел привязан к компетенции
    if (node.type === 'riddle') {
      if (!node.competencyId.trim()) {
        problems.push({
          rule: 'noCompetency',
          nodeId: node.id,
          detail: 'у загадки нет competencyId',
        });
      }
      // 8. Из загадки должен быть выход — иначе ребёнок заперт навсегда
      if (!node.options.some(o => o.correct)) {
        problems.push({
          rule: 'noCorrectAnswer',
          nodeId: node.id,
          detail: 'у загадки нет верного ответа — из неё не выйти',
        });
      }
    }
  });

  return problems;
}

// ------------------------------------------------------------------ уроки

export function validateLessons(
  lessons: Lesson[],
  registries: Registries,
): Problem[] {
  const problems: Problem[] = [];

  lessons.forEach(lesson => {
    const where = { lessonId: lesson.id };

    // 9. appliesToday обязателен: урок без применения — лекция
    if (!lesson.appliesToday?.reminder?.trim()) {
      problems.push({
        rule: 'noAppliesToday',
        ...where,
        detail: 'у урока нет appliesToday — правилу негде примениться сегодня',
      });
    }

    if (!lesson.taskPrompt?.trim()) {
      problems.push({
        rule: 'noTaskPrompt',
        ...where,
        detail: 'у урока нет приглашения к заданию — непонятно, что делать',
      });
    }

    if (!lesson.competencyId.trim()) {
      problems.push({
        rule: 'noCompetency',
        ...where,
        detail: 'у урока нет competencyId',
      });
    }

    if (!lesson.riddle.options.some(o => o.correct)) {
      problems.push({
        rule: 'noCorrectAnswer',
        ...where,
        detail: 'у загадки урока нет верного ответа',
      });
    }

    // 10. Ссылки урока валидны
    problems.push(...checkEffectRefs(lesson.unlocks ?? [], registries, where));

    // 12. Открытое дело выполнимо: если требует расходник — он продаётся
    (lesson.unlocks ?? []).forEach(e => {
      if (e.do !== 'unlockTask') {
        return;
      }
      const task = registries.tasks.find(t => t.id === e.taskId);
      if (
        task?.requiresItem &&
        !registries.items.some(i => i.id === task.requiresItem)
      ) {
        problems.push({
          rule: 'unbuyableRequirement',
          ...where,
          detail:
            `урок открывает дело "${task.id}", которому нужен "${task.requiresItem}", ` +
            'но такого товара нет в продаже',
        });
      }
    });
  });

  // 11. Дни проверять не нужно: они выводятся из порядка задания
  // в пуле (см. config/lessons.ts). Дубль или дырка были возможны,
  // пока номер дня писали руками; теперь ошибиться негде, и стражи
  // на это место убраны вместе с полем.

  return problems;
}
