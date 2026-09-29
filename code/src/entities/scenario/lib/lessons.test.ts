import {
  LESSONS,
  lessonForDay,
  FIRST_LESSON_DAY,
  lessonDays,
} from '../config/lessons';
import { COMPETENCIES } from '@/entities/competency';

/**
 * Пул заданий — данные, а не код.
 *
 * ТЗ 2.5.14 требует, чтобы новое задание добавлялось без переработки
 * логики. Здесь это буквально: день выводится из порядка задания
 * в файле, поэтому добавленная строка удлиняет игру на день.
 */

describe('дни выводятся из порядка заданий', () => {
  it('первое задание приходится на второй день: первый — знакомство', () => {
    expect(FIRST_LESSON_DAY).toBe(2);
    expect(LESSONS[0].day).toBe(2);
  });

  it('дни идут подряд, без пропусков и повторов', () => {
    const days = LESSONS.map(l => l.day);
    expect(days).toEqual(days.map((_, i) => FIRST_LESSON_DAY + i));
  });

  it('lessonDays перечисляет все дни с заданием', () => {
    expect(lessonDays()).toEqual(LESSONS.map(l => l.day));
  });

  it('урок ищется по дню', () => {
    LESSONS.forEach(l => expect(lessonForDay(l.day)!.id).toBe(l.id));
  });

  it('после последнего задания дней с уроком нет', () => {
    expect(lessonForDay(LESSONS.length + FIRST_LESSON_DAY)).toBeUndefined();
  });
});

describe('объём и качество пула', () => {
  it('заданий хватает на требуемые ТЗ пять периодов с запасом', () => {
    // ТЗ 2.6: не менее 5 игровых периодов и не менее 6 заданий.
    expect(LESSONS.length).toBeGreaterThanOrEqual(6);
    expect(LESSONS[LESSONS.length - 1].day).toBeGreaterThanOrEqual(6);
  });

  it('темы разные: не менее трёх', () => {
    const topics = new Set(
      LESSONS.map(
        l =>
          COMPETENCIES.find(c => c.id === l.competencyId)?.topic ??
          l.competencyId,
      ),
    );
    expect(topics.size).toBeGreaterThanOrEqual(3);
  });

  it('каждое задание ссылается на существующую компетенцию', () => {
    LESSONS.forEach(l => {
      expect(COMPETENCIES.some(c => c.id === l.competencyId)).toBe(true);
    });
  });

  it('идентификаторы уникальны', () => {
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(LESSONS.length);
  });
});

/**
 * «Собери фразу»: ответ не выбирают, а составляют из слов.
 * Требования к таким заданиям другие — их и проверяем отдельно.
 */
describe('задания на сборку фразы', () => {
  const assembling = LESSONS.filter(l => l.kind === 'order');

  it('такие задания в пуле есть', () => {
    // ТЗ 2.5.8: задания не ограничиваются выбором готового ответа.
    expect(assembling.length).toBeGreaterThan(0);
  });

  it('у фразы ровно один верный вариант — она сама', () => {
    assembling.forEach(l => {
      expect(l.riddle.assemble).toBe(true);
      expect(l.riddle.options).toHaveLength(1);
      expect(l.riddle.options[0].correct).toBe(true);
    });
  });

  it('слов от трёх до семи — иначе доска не по возрасту', () => {
    assembling.forEach(l => {
      const words = String(l.riddle.options[0].value).split(' ');
      expect({
        фраза: l.id,
        слов: words.length >= 3 && words.length <= 7,
      }).toEqual({ фраза: l.id, слов: true });
    });
  });

  it('каждое слово помещается на плитку', () => {
    assembling.forEach(l => {
      String(l.riddle.options[0].value)
        .split(' ')
        .forEach(word => {
          expect({ слово: word, влезает: word.length <= 14 }).toEqual({
            слово: word,
            влезает: true,
          });
        });
    });
  });
});

describe('виды заданий чередуются', () => {
  it('у каждого задания есть вид', () => {
    LESSONS.forEach(l => {
      expect(['math', 'word', 'choice', 'order']).toContain(l.kind);
    });
  });

  it('два одинаковых вида подряд не идут', () => {
    // Однообразие утомляет быстрее, чем сложность.
    LESSONS.forEach((l, i) => {
      if (i > 0) {
        expect(l.kind).not.toBe(LESSONS[i - 1].kind);
      }
    });
  });

  it('есть задания на вставку слова', () => {
    expect(LESSONS.some(l => l.kind === 'word')).toBe(true);
  });

  it('у задания на слово в тексте есть пропуск', () => {
    LESSONS.filter(l => l.kind === 'word').forEach(l => {
      expect(l.riddle.prompt).toContain('___');
    });
  });

  it('варианты ответа на слово — слова, а не числа', () => {
    LESSONS.filter(l => l.kind === 'word').forEach(l => {
      l.riddle.options.forEach(o => expect(typeof o.value).toBe('string'));
    });
  });
});

// ТЗ 2.5.8: объяснение — независимо от правильности ответа. «Попробуй
// ещё раз» без подсказки — не объяснение: ребёнок не узнаёт, как думать.
describe('на неверный ответ учительница объясняет, а не просто повторяет', () => {
  const RAW: { id: string; riddle: { onWrong: string } }[] =
    require('../config/lessons.data.json').lessons;

  it.each(RAW.map(l => [l.id, l.riddle.onWrong]))(
    '%s: в ответе на ошибку есть подсказка',
    (_id, onWrong) => {
      const rest = onWrong.replace(/^Почти!\s*/, '');
      expect(rest).not.toMatch(/^(Попробуй|Посчитай) ещё раз\.?$/);
      expect(rest.length).toBeGreaterThanOrEqual(20);
    },
  );
});

// ТЗ 2.5.4: у каждого начисления виден источник и сумма — и за урок тоже.
describe('за урок монеты не приходят молча', () => {
  it('после объяснения учительница говорит, сколько монет за урок', () => {
    const { lessonToNodes } = require('./lesson-nodes');
    const { LESSONS } = require('../config/lessons');
    const nodes = lessonToNodes(LESSONS[0], { idPrefix: 't', next: 'x' });
    const explain = nodes.find(
      (n: { type: string; text?: string }) =>
        n.type === 'dialogue' && n.text?.startsWith(LESSONS[0].explanation),
    );
    expect(explain.text).toContain('Держи 2 монеты за урок!');
  });
});
