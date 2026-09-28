import { EVENTS, eventForDay } from '../config/events';
import { createRun } from './interpreter';
import { INTRO } from '../config/intro';
import { REGISTRIES } from '../config/registries';
import { DEFAULT_PET_NAME } from '@/entities/pet/lib/appearance';

/**
 * События дня (UC-12).
 *
 * Заказчик разрешил: «Краткая грусть или вялость допустимы, если
 * реакция обратима и не пугает ребёнка. Например, питомцу понадобился
 * уход: нужно пересмотреть бюджет». И отдельно запретил: «Болезнь или
 * уход из дома как наказание за ошибку не подходят».
 *
 * Отсюда два требования, которые здесь и проверяются:
 * событие меняет бюджетную ситуацию — и НЕ является наказанием.
 */

describe('состав событий', () => {
  it('событий несколько, и у каждого есть текст и подсказка', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(4);
    EVENTS.forEach(e => {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.text.length).toBeGreaterThan(0);
      expect(e.hint.length).toBeGreaterThan(0);
    });
  });

  it('каждое событие меняет бюджетную ситуацию', () => {
    // Событие без последствий для денег — просто текст, а не механика.
    EVENTS.forEach(e => {
      expect(e.effects.length).toBeGreaterThan(0);
    });
  });

  it('ни одно событие не пугает и не обвиняет', () => {
    const forbidden =
      /болезн|заболе|умер|бросил|ушёл из дома|сбежал|виноват|наказ/i;
    EVENTS.forEach(e => {
      expect(`${e.title} ${e.text} ${e.hint}`).not.toMatch(forbidden);
    });
  });

  it('событие НЕ зависит от ошибок ребёнка — оно не наказание', () => {
    // Триггер по дню, а не по «плохому» состоянию: иначе событие
    // становилось бы карой за промах, что прямо запрещено.
    EVENTS.forEach(e => {
      expect(typeof e.day).toBe('number');
    });
  });

  it('на один день приходится не больше одного события', () => {
    const days = EVENTS.map(e => e.day);
    expect(new Set(days).size).toBe(days.length);
  });

  it('в первый день событий нет — ребёнок ещё осваивается', () => {
    expect(EVENTS.every(e => e.day > 1)).toBe(true);
  });
});

describe('выбор события дня', () => {
  it('для дня с событием возвращает его', () => {
    const first = EVENTS[0];
    expect(eventForDay(first.day)?.id).toBe(first.id);
  });

  it('для дня без события возвращает ничего', () => {
    const free = Math.max(...EVENTS.map(e => e.day)) + 5;
    expect(eventForDay(free)).toBeUndefined();
  });
});

describe('последствия события', () => {
  it('событие с подарком увеличивает доход, а не отнимает', () => {
    const gift = EVENTS.find(e => e.kind === 'gift');
    expect(gift).toBeTruthy();

    const r = createRun(INTRO, REGISTRIES);
    const before = r.state().balance;
    r.apply(gift!.effects);

    expect(r.state().balance).toBeGreaterThan(before);
  });

  it('событие с доп. расходом не уводит баланс в минус', () => {
    const r = createRun(INTRO, REGISTRIES);
    EVENTS.forEach(e => r.apply(e.effects));
    expect(r.state().balance).toBeGreaterThanOrEqual(0);
  });
});

describe('имя питомца в событиях', () => {
  it('не вписано жёстко: ребёнок мог назвать питомца по-своему', () => {
    EVENTS.forEach(event => {
      expect(`${event.title} ${event.text} ${event.hint}`).not.toContain(
        DEFAULT_PET_NAME,
      );
    });
  });
});
