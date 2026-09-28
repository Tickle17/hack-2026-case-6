import type {
  Comparison,
  Condition,
  GameState,
  TaskSpec,
} from '../model/types';

function compare(left: number, cmp: Comparison, right: number): boolean {
  switch (cmp) {
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '=':
      return left === right;
    case '>=':
      return left >= right;
    case '>':
      return left > right;
  }
}

/** Дела, которые сегодня обязательны: открытые с начала + открытые уроками. */
export function activeTasks(state: GameState, tasks: TaskSpec[]): TaskSpec[] {
  return tasks.filter(
    t => t.unlockedFromStart || state.unlockedTasks.includes(t.id),
  );
}

function taskDone(
  state: GameState,
  tasks: TaskSpec[],
  taskId: string,
  times?: number,
): boolean {
  const done = state.tasksToday[taskId] ?? 0;
  if (times !== undefined) {
    return done >= times;
  }
  // Без явного times спрашиваем про норму дня из реестра.
  const spec = tasks.find(t => t.id === taskId);
  return done >= (spec?.perDay ?? 1);
}

export function evaluate(
  condition: Condition,
  state: GameState,
  tasks: TaskSpec[],
): boolean {
  switch (condition.op) {
    case 'always':
      return true;

    case 'flag':
      return (state.flags[condition.flag] ?? false) === condition.is;

    case 'balance':
      return compare(state.balance, condition.cmp, condition.value);

    case 'day':
      return compare(state.day, condition.cmp, condition.value);

    case 'hasItem':
      return (state.inventory[condition.itemId] ?? 0) >= (condition.count ?? 1);

    case 'taskDone':
      return taskDone(state, tasks, condition.taskId, condition.times);

    case 'allTasksDone':
      return activeTasks(state, tasks).every(t => taskDone(state, tasks, t.id));

    case 'petSpecies':
      return state.petSpeciesId === condition.speciesId;

    case 'not':
      return !evaluate(condition.of, state, tasks);

    case 'and':
      return condition.all.every(c => evaluate(c, state, tasks));

    case 'or':
      return condition.any.some(c => evaluate(c, state, tasks));
  }
}
