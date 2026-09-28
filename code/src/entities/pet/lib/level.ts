/**
 * Уровень питомца: опыт за решения ребёнка.
 *
 * Заменяет прежние стадии «малыш → подросток → взрослый», которые
 * считались скрытыми баллами. Баллов ребёнок не видел и не понимал,
 * за что питомец вырос. Опыт виден: в конце дня каждая строка итога
 * говорит, за какое решение он пришёл, и перетекает в полосу уровня.
 *
 * ТЗ 2.5.10 требует, чтобы развитие зависело от совокупности решений
 * за несколько периодов: покрытия обязательных расходов, соответствия
 * трат плану и регулярности накоплений. Все три здесь — источники
 * опыта; четвёртый — радость питомцу, покупка «для настроения».
 *
 * Правила, которые держатся здесь, а не в интерфейсе:
 * 1. Опыт только прибавляется. Плохой день не отнимает достигнутого:
 *    питомец не наказывает ребёнка (CLAUDE.md, «Что нельзя»).
 * 2. Уровни растут всё дальше друг от друга: одного удачного дня на
 *    большой рост не хватает — нужна серия решений.
 */

/** Сколько опыта даёт каждое решение за день. */
export const XP_REWARDS = {
  /** Все дела дня: покормил, помыл, погулял, погладил. */
  allTasks: 10,
  /** Потратил на нужное и на хочу ровно столько, сколько задумал. */
  planKept: 10,
  /** Отложил что-то в копилку — регулярность накоплений (ТЗ 2.5.10). */
  saved: 5,
  /** Каждая вещь для настроения: игрушка, бантик, вкусняшка. */
  treat: 3,
} as const;

export type DayXpInput = {
  allTasksDone: boolean;
  planKept: boolean;
  saved: boolean;
  /** Названия купленных сегодня вещей для настроения. */
  treats: readonly string[];
};

export type XpLine = {
  id: string;
  /** За что — фразой, которую прочтёт ребёнок. */
  title: string;
  xp: number;
};

export function dayXp(input: DayXpInput): XpLine[] {
  const lines: XpLine[] = [];
  if (input.allTasksDone) {
    lines.push({
      id: 'tasks',
      title: 'Все дела сделаны',
      xp: XP_REWARDS.allTasks,
    });
  }
  if (input.planKept) {
    lines.push({
      id: 'plan',
      title: 'Потратил как задумал',
      xp: XP_REWARDS.planKept,
    });
  }
  if (input.saved) {
    lines.push({
      id: 'saved',
      title: 'Отложил в копилку',
      xp: XP_REWARDS.saved,
    });
  }
  input.treats.forEach((title, i) => {
    lines.push({
      id: `treat-${i}`,
      // «Бантик для питомца»: название вещи узнаваемо, как в магазине.
      title: `${title} для питомца`,
      xp: XP_REWARDS.treat,
    });
  });
  return lines;
}

export function totalXp(lines: readonly XpLine[]): number {
  return lines.reduce((sum, l) => sum + l.xp, 0);
}

/**
 * С какого опыта начинается уровень.
 *
 * Шаг до следующего уровня: 40, 60, 80, 100… Хороший день приносит
 * около 30 опыта — значит, второй уровень на второй день, третий
 * к четвёртому, четвёртый к шестому. Формулу ребёнок не видит, но
 * взрослый в разделе для взрослого может её проверить.
 */
export function levelStart(level: number): number {
  if (level <= 1) {
    return 0;
  }
  const steps = level - 1;
  // Сумма арифметической прогрессии 40, 60, 80, …
  return steps * 40 + 10 * steps * (steps - 1);
}

export function levelFor(xp: number): number {
  let level = 1;
  while (levelStart(level + 1) <= Math.max(0, xp)) {
    level++;
  }
  return level;
}

export type LevelProgress = {
  level: number;
  /** Сколько набрано на текущем уровне. */
  into: number;
  /** Сколько нужно на текущем уровне целиком. */
  need: number;
  /** Доля полосы, от 0 до 1 (единица не достигается — это уже новый уровень). */
  ratio: number;
};

export function levelProgress(xp: number): LevelProgress {
  const level = levelFor(xp);
  const start = levelStart(level);
  const need = levelStart(level + 1) - start;
  const into = Math.max(0, xp) - start;
  return { level, into, need, ratio: into / need };
}

/** До какого уровня питомец растёт в размерах. */
export const GROW_UNTIL_LEVEL = 3;

/**
 * Во сколько раз питомец крупнее малыша.
 *
 * Растёт до третьего уровня, дальше взрослеет видом, а не размером:
 * бесконечно растущий зверь перестал бы помещаться в комнату.
 */
export function levelScale(level: number): number {
  const capped = Math.min(Math.max(level, 1), GROW_UNTIL_LEVEL);
  return 1 + (capped - 1) * 0.15;
}

/**
 * Питомец достаточно взрослый для «взрослых» рисунков.
 *
 * Картинки взрослого вида подключаются, как только появятся: пока их
 * нет, игра показывает обычные — см. `config/animations.ts`.
 */
export function isGrownUp(level: number): boolean {
  return level > GROW_UNTIL_LEVEL;
}

export function levelTitle(level: number): string {
  if (level <= 1) {
    return 'Малыш';
  }
  if (level <= GROW_UNTIL_LEVEL) {
    return 'Подросток';
  }
  return 'Взрослый';
}
