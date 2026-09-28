import {
  XP_REWARDS,
  dayXp,
  levelFor,
  levelProgress,
  levelScale,
  levelStart,
  levelTitle,
  totalXp,
} from './level';

/**
 * Уровень питомца.
 *
 * Опыт копится от решений ребёнка за день: все дела сделаны, деньги
 * потрачены как задумано, что-то отложено, куплена радость питомцу.
 * ТЗ 2.5.10: развитие зависит от совокупности решений за несколько
 * периодов — поэтому одного удачного дня на большой рост не хватает.
 */

describe('опыт за день', () => {
  const perfect = {
    allTasksDone: true,
    planKept: true,
    saved: true,
    treats: ['Бантик', 'Вкусняшка'],
  };

  it('каждое решение — своя строка с источником и суммой', () => {
    // Как и с монетами (ТЗ 2.5.4): ничего не прибавляется без
    // объяснения, откуда оно взялось.
    const lines = dayXp(perfect);

    expect(lines.map(l => l.xp)).toEqual([
      XP_REWARDS.allTasks,
      XP_REWARDS.planKept,
      XP_REWARDS.saved,
      XP_REWARDS.treat,
      XP_REWARDS.treat,
    ]);
    lines.forEach(l => expect(l.title.length).toBeGreaterThan(0));
  });

  it('за каждую радость питомцу — отдельно и с названием', () => {
    const titles = dayXp(perfect).map(l => l.title);

    expect(titles.some(t => t.includes('Бантик'))).toBe(true);
    expect(titles.some(t => t.includes('Вкусняшка'))).toBe(true);
  });

  it('несделанное просто не приносит опыта — минуса нет', () => {
    const lines = dayXp({
      allTasksDone: false,
      planKept: false,
      saved: false,
      treats: [],
    });

    expect(lines).toEqual([]);
  });

  it('сумма опыта — это сумма строк', () => {
    expect(totalXp(dayXp(perfect))).toBe(
      XP_REWARDS.allTasks +
        XP_REWARDS.planKept +
        XP_REWARDS.saved +
        2 * XP_REWARDS.treat,
    );
  });
});

describe('уровень по опыту', () => {
  it('новый питомец — первый уровень', () => {
    expect(levelFor(0)).toBe(1);
  });

  it('уровень меняется ровно на пороге', () => {
    expect(levelFor(levelStart(2) - 1)).toBe(1);
    expect(levelFor(levelStart(2))).toBe(2);
  });

  it('один идеальный день не даёт вырасти до конца', () => {
    // Развитие — про совокупность дней, а не про один успех.
    const oneDay = totalXp(
      dayXp({
        allTasksDone: true,
        planKept: true,
        saved: true,
        treats: ['Бантик', 'Вкусняшка', 'Игрушка'],
      }),
    );

    expect(levelFor(oneDay)).toBeLessThan(3);
  });

  it('каждый следующий уровень дальше предыдущего', () => {
    for (let level = 2; level < 10; level++) {
      expect(levelStart(level + 1) - levelStart(level)).toBeGreaterThan(
        levelStart(level) - levelStart(level - 1),
      );
    }
  });

  it('больше опыта — никогда не ниже уровень', () => {
    let previous = 1;
    for (let xp = 0; xp < 1000; xp += 7) {
      const level = levelFor(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it('полоса уровня показывает, сколько набрано из нужного', () => {
    const start = levelStart(2);
    const progress = levelProgress(start + 10);

    expect(progress.level).toBe(2);
    expect(progress.into).toBe(10);
    expect(progress.need).toBe(levelStart(3) - start);
    expect(progress.ratio).toBeGreaterThan(0);
    expect(progress.ratio).toBeLessThan(1);
  });
});

describe('размер питомца', () => {
  it('растёт с каждым уровнем до третьего', () => {
    expect(levelScale(2)).toBeGreaterThan(levelScale(1));
    expect(levelScale(3)).toBeGreaterThan(levelScale(2));
  });

  it('после третьего уровня больше не растёт', () => {
    // Дальше питомец взрослеет видом, а не размером: бесконечно
    // растущий зверь перестал бы помещаться в комнату.
    expect(levelScale(4)).toBe(levelScale(3));
    expect(levelScale(20)).toBe(levelScale(3));
  });

  it('у каждого уровня есть понятное ребёнку название', () => {
    [1, 2, 3, 4, 10].forEach(level => {
      expect(levelTitle(level).length).toBeGreaterThan(0);
    });
  });

  it('названий стадий не меньше трёх — ТЗ 2.6', () => {
    const titles = new Set([1, 2, 3, 4, 5, 6].map(levelTitle));
    expect(titles.size).toBeGreaterThanOrEqual(3);
  });
});
