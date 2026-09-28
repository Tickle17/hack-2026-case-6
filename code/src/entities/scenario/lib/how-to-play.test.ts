import { HOW_TO_PLAY } from '../config/how-to-play';

const text = HOW_TO_PLAY.flatMap(section => section.lines).join(' ');

describe('экран «Как играть»', () => {
  // ТЗ 2.5.1: три типа решений — потратить на обязательное, на желаемое, отложить.
  it('называет три решения теми же словами, что экран плана', () => {
    ['ОБЯЗАТЕЛЬНОЕ', 'РАЗВЛЕЧЕНИЯ', 'КОПИЛКА'].forEach(word =>
      expect(text).toContain(word),
    );
  });

  it('проводит по дню в том порядке, в каком он идёт', () => {
    const order = ['План', 'Дела', 'Магазин', 'Итог дня'].map(word =>
      text.indexOf(word),
    );

    expect(order.every(index => index >= 0)).toBe(true);
    expect([...order].sort((left, right) => left - right)).toEqual(order);
  });

  it('говорит, где взять подсказку', () => {
    expect(text).toContain('Подсказать');
  });

  // Читают на бегу: одна строка — одна мысль.
  it('держит строки короткими', () => {
    HOW_TO_PLAY.flatMap(section => section.lines).forEach(line =>
      expect(line.length).toBeLessThanOrEqual(80),
    );
  });
});
