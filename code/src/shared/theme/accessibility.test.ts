import { pixelLight } from './pixel';
import { duolingoLight } from './duolingo';
import type { ThemeContract } from './contract';

/**
 * Доступность (UC-11, ТЗ 3.6).
 *
 * Проверяем сами токены темы, а не каждую кнопку по отдельности:
 * если минимум заложен в тему, отдельный компонент не сможет
 * случайно оказаться меньше — он берёт размер оттуда.
 */

const THEMES: [string, ThemeContract][] = [
  ['пиксельная', pixelLight],
  ['duolingo', duolingoLight],
];

describe.each(THEMES)('тема «%s»', (_name, theme) => {
  it('минимальная область нажатия не меньше 48 dp', () => {
    expect(theme.touchTarget.min).toBeGreaterThanOrEqual(48);
  });

  it('основной текст не мельче 16 sp', () => {
    expect(theme.text.body.fontSize).toBeGreaterThanOrEqual(16);
  });

  it('вся типографика читаема: ничего мельче 13 sp', () => {
    Object.entries(theme.text).forEach(([variant, spec]) => {
      expect({ variant, size: spec.fontSize }).toEqual({
        variant,
        size: expect.any(Number),
      });
      expect(spec.fontSize).toBeGreaterThanOrEqual(13);
    });
  });

  it('межстрочный интервал не меньше кегля — строки не слипаются', () => {
    Object.values(theme.text).forEach(spec => {
      expect(spec.lineHeight).toBeGreaterThanOrEqual(spec.fontSize);
    });
  });

  it('у приглушённого текста есть отдельный тон, а не только прозрачность', () => {
    // Прозрачность не читается как «недоступно» — нужен явный цвет.
    expect(theme.color.text.muted).toBeTruthy();
    expect(theme.color.text.muted).not.toBe(theme.color.text.primary);
  });
});
