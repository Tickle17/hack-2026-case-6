import type {
  Effect,
  SpendCategory,
  GameState,
  Node,
  Registries,
  Scenario,
  ScenarioId,
} from '../model/types';
import { activeTasks, evaluate } from './conditions';
import { applyEffects } from './effects';
import { createInitialState } from './state';

export type PendingTask = { taskId: string; done: number; need: number };

/** Дело дня со статусом — для списка с галочками. */
export type DayTask = PendingTask & { complete: boolean };

export type AnswerResult = { correct: boolean; message: string };

/**
 * Проход по сценарию. Вся логика переходов — здесь; ни одного ветвления
 * по сюжету в компонентах.
 *
 * Интерпретатор НЕ решает, что показать — он говорит, в каком узле мы
 * находимся. Отрисовка узла это дело UI.
 */
export function createRun(
  scenario: Scenario,
  registries: Registries,
  initial?: Partial<GameState>,
) {
  const byId = new Map<ScenarioId, Node>(scenario.nodes.map(n => [n.id, n]));

  let state: GameState = {
    ...createInitialState(scenario.startNodeId),
    ...initial,
    currentNodeId: initial?.currentNodeId ?? scenario.startNodeId,
  };

  /** Загадки, на которые уже дан верный ответ. */
  const solved = new Set<ScenarioId>();

  /**
   * Где сейчас происходит действие. Узел может её сменить; если не
   * указано — наследуется от предыдущего, чтобы сценаристу не пришлось
   * помечать каждую реплику подряд.
   */

  function node(id: ScenarioId): Node {
    const found = byId.get(id);
    if (!found) {
      throw new Error(`Узел не найден: ${id}`);
    }
    return found;
  }

  function current(): Node {
    return node(state.currentNodeId);
  }

  function syncScene(): void {
    const declared = current().scene;
    if (declared && declared !== state.scene) {
      state = { ...state, scene: declared };
    }
  }

  function goTo(id: ScenarioId): void {
    state = { ...state, currentNodeId: id };
    resolvePassthrough();
    syncScene();
  }

  /** Узлы без экрана (effect, branch) проходятся сразу. */
  function resolvePassthrough(): void {
    while (true) {
      const n = current();

      if (n.type === 'effect') {
        state = applyEffects(state, n.effects);
        if (!n.next) {
          return;
        }
        state = { ...state, currentNodeId: n.next };
        continue;
      }

      if (n.type === 'branch') {
        const hit = n.branches.find(b =>
          evaluate(b.when, state, registries.tasks),
        );
        state = { ...state, currentNodeId: hit ? hit.next : n.fallback };
        continue;
      }

      return;
    }
  }

  /**
   * Чего не хватает ПРЯМО СЕЙЧАС.
   *
   * Если мы стоим на замке с явными требованиями (вступление: погладить
   * 1 раз вместо обычных 3), показываем именно их. Иначе ребёнок увидит
   * цель, которой сейчас никто не требует.
   */
  /**
   * ВСЕ дела текущего дня со статусом. Нужны для списка, где выполненное
   * не исчезает, а помечается галочкой: ребёнок должен видеть, сколько
   * уже сделал, а не только сколько осталось.
   */
  function dayTasks(): DayTask[] {
    const n = byId.get(state.currentNodeId);

    const raw =
      n?.type === 'taskGate' && n.require !== 'all'
        ? n.require.map(r => ({
            taskId: r.taskId,
            done: state.tasksToday[r.taskId] ?? 0,
            need: r.times,
          }))
        : activeTasks(state, registries.tasks).map(t => ({
            taskId: t.id,
            done: state.tasksToday[t.id] ?? 0,
            need: t.perDay,
          }));

    return raw.map(t => ({ ...t, complete: t.done >= t.need }));
  }

  function pendingTasks(): PendingTask[] {
    return dayTasks()
      .filter(t => !t.complete)
      .map(({ taskId, done, need }) => ({ taskId, done, need }));
  }

  function gateOpen(n: Extract<Node, { type: 'taskGate' }>): boolean {
    if (n.require === 'all') {
      return pendingTasks().length === 0;
    }
    return n.require.every(r => (state.tasksToday[r.taskId] ?? 0) >= r.times);
  }

  // Стартовый узел тоже может оказаться проходным (effect/branch).
  resolvePassthrough();
  syncScene();

  /** Сколько ещё можно потратить по направлению сегодня. */
  function limitLeft(category: SpendCategory): number {
    const limit = state.plan?.[category] ?? 0;
    return Math.max(0, limit - state.spent[category]);
  }

  return {
    state: () => state,
    limitLeft,
    current,
    pendingTasks,
    dayTasks,
    isSolved: (id: ScenarioId) => solved.has(id),
    scene: () => state.scene,

    /** Шаг вперёд. Узлы, ждущие действия игрока, никуда не двигают. */
    advance(): void {
      const n = current();

      if (n.type === 'choice') {
        // Ждём выбора игрока.
        return;
      }

      if (n.type === 'riddle' && !solved.has(n.id)) {
        // Загадка не выпускает, пока не решена. Наказания при этом нет —
        // см. retry: 'forever' в docs/scenario-engine.md.
        return;
      }

      if (n.type === 'taskGate' && !gateOpen(n)) {
        // Замок дня: вечер не наступит, пока дела не сделаны.
        return;
      }

      if (n.type === 'endDay') {
        state = applyEffects(state, n.reward);
        state = applyEffects(state, [{ do: 'advanceDay' }]);
      }

      if (n.next) {
        goTo(n.next);
      }
    },

    choose(optionId: string): void {
      const n = current();
      if (n.type !== 'choice') {
        throw new Error(`Узел ${n.id} не предполагает выбора`);
      }
      const option = n.options.find(o => o.id === optionId);
      if (!option) {
        throw new Error(`Вариант "${optionId}" не найден в узле ${n.id}`);
      }
      if (option.when && !evaluate(option.when, state, registries.tasks)) {
        throw new Error(`Вариант "${optionId}" сейчас недоступен`);
      }
      state = applyEffects(state, option.effects);
      goTo(option.next);
    },

    /**
     * Ответ на загадку. Неверный ответ НИЧЕГО не отнимает и не выпускает —
     * только сообщение «попробуй ещё». Счётчика попыток нет намеренно.
     */
    answer(value: number | string): AnswerResult {
      const n = current();
      if (n.type !== 'riddle') {
        throw new Error(`Узел ${n.id} не является загадкой`);
      }
      const option = n.options.find(o => o.value === value);
      if (!option) {
        // У загадки с вариантами значение не из списка означает, что
        // экран разошёлся со сценарием, — такое надо ловить громко.
        // А у собираемой фразы неверных сборок бесконечно много, и ни
        // одна не перечислена: это обычная ошибка ребёнка.
        if (n.assemble) {
          return { correct: false, message: n.onWrong };
        }
        throw new Error(`Вариант ответа "${value}" не найден в узле ${n.id}`);
      }
      if (option.correct) {
        solved.add(n.id);
        return { correct: true, message: n.onRight };
      }
      return { correct: false, message: n.onWrong };
    },

    markTaskDone(taskId: string): void {
      this.apply([{ do: 'markTaskDone', taskId }]);
    },

    apply(effects: Parameters<typeof applyEffects>[1]): void {
      // `completeAllTasks` знает про реестр дел, а effects.ts — чистый
      // и реестра не видит. Разворачиваем здесь, где реестр есть.
      /**
       * Выполненное дело восполняет показатель питомца. Знание о том,
       * что чем восполняется, живёт в реестре; здесь только
       * разворачивание, потому что реестр доступен отсюда.
       */
      /**
       * Дело — это не только галочка: оно восполняет показатель
       * и тратит свой расходник.
       *
       * Расход живёт здесь, а не в сценарии: иначе купленный однажды
       * корм лежал бы в инвентаре вечно, «Нужное» со третьего дня
       * стоило бы ноль, и развилка «обязательное или приятное»
       * исчезла бы вместе с ним.
       */
      const withRestore = (taskId: string): Effect[] => {
        const spec = registries.tasks.find(t => t.id === taskId);
        const out: Effect[] = [{ do: 'markTaskDone', taskId }];
        if (spec?.restores) {
          out.push({ do: 'changeStat', ...spec.restores });
        }
        if (spec?.soils) {
          out.push({
            do: 'changeStat',
            stat: spec.soils.stat,
            amount: -spec.soils.amount,
          });
        }
        if (spec?.consumesItem && spec.requiresItem) {
          out.push({ do: 'consumeItem', itemId: spec.requiresItem });
        }
        return out;
      };

      const expanded: Effect[] = (effects ?? []).flatMap((e): Effect[] => {
        // Разворачиваем СКВОЗЬ completeAllTasks: иначе массовое
        // закрытие дел не восполняло бы показатели, и в демо-режиме
        // питомец таял бы, хотя за ним «ухаживали».
        if (e.do === 'completeAllTasks') {
          return registries.tasks.flatMap(t =>
            Array.from({ length: t.perDay }, () => withRestore(t.id)).flat(),
          );
        }
        if (e.do === 'markTaskDone') {
          return withRestore(e.taskId);
        }
        return [e];
      });
      state = applyEffects(state, expanded);
    },
  };
}

export type ScenarioRun = ReturnType<typeof createRun>;
