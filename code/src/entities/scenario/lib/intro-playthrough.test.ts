import { createRun, type ScenarioRun } from './interpreter';
import { INTRO } from '../config/intro';
import { START_BUDGET, DAILY_REWARD, LESSON_REWARD } from './state';
import { GOALS } from '../config/goals';
import { REGISTRIES, TASKS } from '../config/registries';
import { LESSONS } from '../config/lessons';
import { shoppingList, mustCost } from './shopping';
import { MIN_BALANCE } from './state';

/**
 * Сквозная симуляция сценария вступления без UI.
 *
 * Это главный тест движка: обе ветки развилки второго дня должны доводить
 * ребёнка до следующего дня, и ни одна не должна оставлять его в состоянии,
 * из которого нет выхода.
 */

function run(): ScenarioRun {
  return createRun(INTRO, REGISTRIES);
}

/** Прокликать диалоги до узла, который ждёт действия игрока. */
function advanceUntil(
  r: ScenarioRun,
  predicate: (id: string) => boolean,
  limit = 200,
): void {
  for (let i = 0; i < limit; i++) {
    if (predicate(r.current().id)) {
      return;
    }
    const before = r.current().id;
    r.advance();
    if (r.current().id === before && !predicate(before)) {
      throw new Error(`Застряли в узле "${before}"`);
    }
  }
  throw new Error('Превышен лимит шагов');
}

/** Любой неверный вариант текущей загадки — не зная её содержимого. */
function wrongAnswerFor(nodeId: string, r: ScenarioRun): number | string {
  const node = r.current();
  if (node.type !== 'riddle' || node.id !== nodeId) {
    throw new Error(`Ожидалась загадка ${nodeId}, а не ${node.id}`);
  }
  return node.options.find(o => !o.correct)!.value;
}

function doAllTasks(r: ScenarioRun, times: Record<string, number> = {}): void {
  TASKS.forEach(t => {
    const n = times[t.id] ?? t.perDay;
    for (let i = 0; i < n; i++) {
      r.markTaskDone(t.id);
    }
  });
}

function solveRiddle(r: ScenarioRun): void {
  const node = r.current();
  if (node.type !== 'riddle') {
    throw new Error(`Ожидалась загадка, а не ${node.type}`);
  }
  const correct = node.options.find(o => o.correct);
  r.answer(correct!.value);
}

/**
 * Пройти школьную часть дня, если она сегодня есть, и остановиться
 * на делах. Уроки идут не каждый день, поэтому просто «шагаем, пока
 * не упрёмся в дела».
 */
function advanceThroughSchool(r: ScenarioRun): void {
  for (let i = 0; i < 30; i++) {
    const node = r.current();
    if (node.id === 'loop.day') {
      return;
    }
    if (node.type === 'riddle') {
      r.answer(node.options.find(o => o.correct)!.value);
    }
    r.advance();
  }
  throw new Error(`Не дошли до дел, застряли на "${r.current().id}"`);
}

/** Пройти вступление до школы второго дня. */
function playIntro(r: ScenarioRun, species = 'cat'): void {
  advanceUntil(r, id => id === 'bd.pick');
  r.choose(species);
  advanceUntil(r, id => id === 'bd.chores');
  doAllTasks(r, { pet: 1 });
  advanceUntil(r, id => id === 'd2.school.riddle');
}

describe('вступление', () => {
  it('доходит до выбора питомца и запоминает выбор', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('pig');
    expect(r.state().petSpeciesId).toBe('pig');
  });

  it('первый круг дел добавляет награду к карманным и переводит во второй день', () => {
    const r = run();
    playIntro(r);
    expect(r.state().balance).toBe(START_BUDGET + DAILY_REWARD);
    expect(r.state().day).toBe(2);
  });

  it('награда падает на счёт В МОМЕНТ похвалы, а не на следующий день', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');
    doAllTasks(r, { pet: 1 });

    // Дошли до реплики, где родители обещают монеты.
    advanceUntil(r, id => id === 'bd.praise');
    const before = r.state().balance;

    r.advance();
    // Прирост ровно на награду, и он происходит здесь, а не завтра.
    expect(r.state().balance - before).toBe(DAILY_REWARD);
  });

  it('магазин открыт с первого дня — расходники покупает ребёнок', () => {
    // Прежде магазин открывался только на второй день: так была устроена
    // развилка, которой больше нет. Теперь обязательные расходы есть
    // в первом же дне (Приложение А, шаги 5 и 7).
    const r = run();
    playIntro(r);
    expect(r.state().shopUnlocked).toBe(true);
  });

  it('загадка второго дня не выпускает, пока не решена', () => {
    const r = run();
    playIntro(r);
    // Заведомо неверный вариант второго дня.
    r.answer(wrongAnswerFor('d2.school.riddle', r));
    r.advance();
    expect(r.current().id).toBe('d2.school.riddle');
  });

  it('урок открывает магазин', () => {
    const r = run();
    playIntro(r);
    solveRiddle(r);
    advanceUntil(r, id => id === 'd2.canWork');
    expect(r.state().shopUnlocked).toBe(true);
  });
});

describe('задание начисляет игровую валюту', () => {
  /**
   * Приложение А, шаг 6: «Выполнение задания и получение игровой
   * валюты». Заказчик уточнил: только опыта недостаточно, задание
   * обязано давать монеты.
   */
  it('верно решённая загадка приносит монеты', () => {
    const r = run();
    playIntro(r);

    const before = r.state().balance;
    solveRiddle(r);
    advanceUntil(r, id => id === 'd2.home');

    expect(r.state().balance).toBeGreaterThan(before);
  });

  it('награда за урок начисляется один раз, а не при каждом заходе', () => {
    const r = run();
    playIntro(r);
    solveRiddle(r);
    advanceUntil(r, id => id === 'd2.home');
    const after = r.state().balance;

    // Повторное применение эффекта урока ничего не добавляет.
    r.apply([{ do: 'markLessonDone', lessonId: LESSONS[0].id }]);
    expect(r.state().balance).toBe(after);
  });
});

describe('первый день: обязательные расходы есть с самого начала', () => {
  /**
   * Приложение А требует в ОДНОМ игровом цикле (шаги 1–10) и
   * распределение на обязательные и необязательные расходы (шаг 5),
   * и покупку каждого типа (шаг 7). Обязательные расходы появляются
   * уже в первом дне: набор на СЕГОДНЯ дали родители, а набор
   * на ЗАВТРА ребёнок покупает сам.
   */
  it('набор на первый день выдают родители — иначе день начинается с запертых дел', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');

    expect(r.state().inventory.food).toBe(1);
    expect(r.state().inventory.shampoo).toBe(1);
    expect(r.state().inventory.leash).toBe(1);
  });

  it('и всё равно есть что купить: завтрашние корм и шампунь', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');

    const list = shoppingList(r.state()).map(e => e.item.id);
    expect(list.sort()).toEqual(['food', 'shampoo']);
  });

  it('карманных хватает на всё обязательное и остаётся на выбор', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');

    expect(r.state().balance).toBe(START_BUDGET);
    expect(r.state().balance).toBeGreaterThan(mustCost(r.state()));
  });

  it('магазин открыт с первого дня — иначе купить негде', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');

    expect(r.state().shopUnlocked).toBe(true);
  });
});

describe('второй день: магазин по дороге с прогулки', () => {
  /** Дойти до дел второго дня. */
  function atDay2(): ScenarioRun {
    const r = run();
    playIntro(r);
    solveRiddle(r);
    advanceUntil(r, id => id === 'd2.canWork');
    return r;
  }

  it('на руках карманные, награда за день и за урок; расходники стоят 9', () => {
    const r = atDay2();
    expect(r.state().balance).toBe(START_BUDGET + DAILY_REWARD + LESSON_REWARD);

    const price = (id: string) =>
      REGISTRIES.items.find(i => i.id === id)!.price;
    const needs = REGISTRIES.items.filter(i => i.kind === 'consumable');
    expect(needs.reduce((sum, i) => sum + i.price, 0)).toBe(9);
    expect(price('toy')).toBe(10);
  });

  it('корм и шампунь ушли на дела, а поводок остался', () => {
    // Расходники тратятся делами, поэтому к утру их нет. Поводок
    // не тратится: он нужен каждой прогулке и служит дальше.
    const r = atDay2();
    expect(r.state().inventory.shampoo).toBe(0);
    expect(r.state().inventory.food).toBe(0);
    expect(r.state().inventory.leash).toBe(1);
  });

  it('за один день не накопить ни на одну цель — вот ради чего копят', () => {
    const r = atDay2();
    r.apply([{ do: 'takeCoins', amount: 9, reason: 'расходники' }]);

    // Нужное куплено, остаток виден.
    expect(r.state().balance).toBe(
      START_BUDGET + DAILY_REWARD + LESSON_REWARD - 9,
    );

    // ТЗ 2.2: «за один игровой период нельзя купить все сразу».
    // Предел задаёт не игрушка, а цели: они дороже любого дневного дохода.
    const cheapest = Math.min(...GOALS.map(g => g.price));
    expect(cheapest).toBeGreaterThan(
      START_BUDGET + DAILY_REWARD + LESSON_REWARD,
    );
    expect(r.state().balance).toBeLessThan(cheapest);
  });

  it('день заканчивается наградой, накопленное не сгорает', () => {
    const r = atDay2();
    r.apply([{ do: 'takeCoins', amount: 9, reason: 'расходники' }]);
    doAllTasks(r);
    advanceUntil(r, id => id === 'loop.school.d3.riddle');

    // остаток после расходников плюс награда за прожитый день
    expect(r.state().balance).toBe(
      START_BUDGET + DAILY_REWARD + LESSON_REWARD - 9 + DAILY_REWARD,
    );
    expect(r.state().day).toBe(3);
  });

  it('вечером доля копилки уходит до маминой награды: награда в остаток дня не входит', () => {
    const r = atDay2();
    const wallet = r.state().balance;
    r.apply([{ do: 'planBudget', must: wallet - 3, want: 0, save: 3 }]);
    doAllTasks(r);
    advanceUntil(r, id => id === 'd2.endA');

    expect(r.state().savings).toBe(3);
    expect(r.state().leftoverToday).toBe(wallet - 3);
    expect(r.state().balance).toBe(wallet - 3 + DAILY_REWARD);
  });

  it('ветки с наказанием больше нет: ошибиться нельзя', () => {
    // Магазин обязателен и идёт по порядку «сначала нужное».
    // Узлов ветки Б в сценарии не осталось.
    const ids = INTRO.nodes.map(n => n.id);
    expect(ids).not.toContain('d2.noSupplies');
    expect(ids).not.toContain('d2.choresB');
  });
});

describe('инварианты на всех путях', () => {
  it.each([9, 10, 25] as const)('трата %d не уводит баланс в минус', spend => {
    const r = run();
    playIntro(r);
    solveRiddle(r);
    advanceUntil(r, id => id === 'd2.canWork');

    const seen: number[] = [r.state().balance];
    // 25 больше, чем есть: магазин такого не предложит, но состояние
    // обязано остаться корректным при любом наборе эффектов.
    r.apply([{ do: 'takeCoins', amount: spend, reason: 'покупка' }]);
    seen.push(r.state().balance);

    doAllTasks(r);
    advanceUntil(r, id => id === 'loop.school.d3.riddle');
    seen.push(r.state().balance);

    seen.forEach(b => expect(b).toBeGreaterThanOrEqual(MIN_BALANCE));
  });

  it('дневной цикл повторяется без тупика', () => {
    const r = run();
    playIntro(r);
    solveRiddle(r);
    advanceUntil(r, id => id === 'd2.canWork');
    r.apply([{ do: 'takeCoins', amount: 9, reason: 'расходники' }]);
    doAllTasks(r);
    advanceUntil(r, id => id === 'loop.school.d3.riddle');
    solveRiddle(r);
    advanceUntil(r, id => id === 'loop.day');
    doAllTasks(r);

    advanceThroughSchool(r);

    const dayBefore = r.state().day;
    const balanceBefore = r.state().balance;

    // Пять обычных дней: дела → похвала → монеты сразу → вечер → новый день
    for (let i = 0; i < 5; i++) {
      // В цикле может стоять школа: у дней с уроком сначала загадка.
      // Доходим до дел, решая всё, что встретится по пути.
      advanceThroughSchool(r);
      expect(r.current().id).toBe('loop.day');
      const before = r.state().balance;

      doAllTasks(r);
      r.advance(); // замок открыт → похвала
      expect(r.current().id).toBe('loop.praise');
      expect(r.state().balance).toBe(before);

      r.advance(); // реплика прочитана → монеты на счету, ещё не вечер
      expect(r.state().balance).toBe(before + 10);
      expect(r.current().id).toBe('loop.end');

      r.advance(); // новый день
    }

    expect(r.state().day).toBe(dayBefore + 5);
    // Пять дневных наград плюс награды за уроки, встреченные по пути:
    // в цикле теперь есть школа, и задания тоже начисляют валюту.
    const earned = r.state().balance - balanceBefore;
    expect(earned).toBeGreaterThanOrEqual(5 * DAILY_REWARD);
    // Уроков за пять дней бывает максимум пять.
    expect(earned).toBeLessThanOrEqual(5 * DAILY_REWARD + 5 * LESSON_REWARD);
    // Цикл не выродился: мы снова в дне, а не в тупике
    advanceThroughSchool(r);
    expect(r.current().id).toBe('loop.day');
  });
});

describe('переход ко сну не телепортирует в класс', () => {
  it('после «спать» ребёнок сначала дома, и только потом в школе', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');
    doAllTasks(r, { pet: 1, feed: 1, bath: 1, walk: 1 });
    advanceUntil(r, () => r.current().type === 'endDay');

    // Лёг спать — наступило утро второго дня.
    r.advance();
    expect(r.state().day).toBe(2);

    // Первый кадр нового дня — дома, а не за партой: иначе ребёнок
    // видит телепорт из кровати в класс.
    expect(r.scene()).toBe('home');
    expect(r.current().type).toBe('thought');

    // А уже следующий — школа.
    r.advance();
    expect(r.scene()).toBe('school');
  });

  it('утренний кадр есть у каждого школьного дня, а не только у второго', () => {
    /** Шагать до дел, решая загадки по дороге. */
    const toTasks = (r: ScenarioRun): void => {
      for (let i = 0; i < 40; i++) {
        const node = r.current();
        if (node.type === 'taskGate') {
          return;
        }
        if (node.type === 'riddle') {
          r.answer(node.options.find(o => o.correct)!.value);
        }
        r.advance();
      }
      throw new Error(`Не дошли до дел, застряли на "${r.current().id}"`);
    };

    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');
    doAllTasks(r, { pet: 1, feed: 1, bath: 1, walk: 1 });

    // Дни 2 и 3 расписаны поимённо, четвёртый обслуживает общий цикл —
    // утро должно быть у всех трёх, а не только у прописанного вручную.
    for (let day = 2; day <= 4; day++) {
      advanceUntil(r, () => r.current().type === 'endDay');
      r.advance();
      expect(r.state().day).toBe(day);
      expect(r.scene()).toBe('home');
      expect(r.current().type).toBe('thought');
      toTasks(r);
      doAllTasks(r);
    }
  });
});

describe('порядок школьного дня', () => {
  it('правило → приглашение → задача, а не правило сразу в задачу', () => {
    const r = run();
    advanceUntil(r, id => id === 'bd.pick');
    r.choose('cat');
    advanceUntil(r, id => id === 'bd.chores');
    doAllTasks(r, { pet: 1, feed: 1, bath: 1, walk: 1 });
    advanceUntil(r, () => r.current().type === 'endDay');
    r.advance();

    // утро дома
    expect(r.current().type).toBe('thought');
    r.advance();

    // правило от учительницы
    const rule = r.current();
    expect(rule.type).toBe('dialogue');
    expect(rule.id).toMatch(/\.rule$/);
    r.advance();

    // приглашение к заданию — именно здесь, между правилом и задачей
    const invite = r.current();
    expect(invite.id).toMatch(/\.task$/);
    expect(invite.type).toBe('dialogue');
    expect(invite.type === 'dialogue' && invite.text).toContain('попробуй');
    r.advance();

    expect(r.current().type).toBe('riddle');
  });
});
