import { animationSetKey, youngSpecies } from './animations';

/**
 * Взрослый набор картинок бывает неполным: сначала рисуют основные
 * позы, остальные подтягиваются позже. Недостающая поза берётся из
 * обычного набора — ТОЙ ЖЕ позой, а не заменой на «покой»: купание
 * без кадров купания выглядело бы поломкой.
 */
describe('поза из взрослого набора', () => {
  const registry = {
    cat: { idle: {}, bath: {} },
    'cat-adult': { idle: {} },
    'cat-adult--black': { idle: {} },
    'cat--black': { idle: {}, bath: {} },
  };

  it('есть во взрослом — берётся взрослая', () => {
    expect(animationSetKey(registry, 'cat-adult', 'idle')).toBe('cat-adult');
  });

  it('нет во взрослом — та же поза из обычного набора', () => {
    expect(animationSetKey(registry, 'cat-adult', 'bath')).toBe('cat');
    expect(animationSetKey(registry, 'cat-adult--black', 'bath')).toBe(
      'cat--black',
    );
  });

  it('обычный набор ведёт себя как раньше', () => {
    expect(animationSetKey(registry, 'cat', 'bath')).toBe('cat');
  });

  it('обычный вид получается из взрослого ключа с окрасом', () => {
    expect(youngSpecies('cat-adult--black')).toBe('cat--black');
    expect(youngSpecies('dog')).toBe('dog');
  });
});
