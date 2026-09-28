import { REGISTRIES } from '../config/registries';
import { LESSONS } from '../config/lessons';
import { GOALS } from '../config/goals';
import { SPECIES } from '@/entities/pet/config/species';
import { COLORS } from '@/entities/pet/lib/appearance';
import { levelTitle } from '@/entities/pet/lib/level';
import { DAILY_REWARD, START_BUDGET } from './state';

/**
 * Минимальный объём демонстрационного контента (ТЗ 2.6).
 *
 * Это чек-лист приёмки, а не пожелание: не добрали по любой строке —
 * решение не соответствует заданию. Страж стоит здесь, чтобы объём
 * нельзя было потерять при следующей правке контента.
 */

describe('объём контента по ТЗ 2.6', () => {
  it('комбинаций питомца не меньше 9', () => {
    expect(SPECIES.length * COLORS.length).toBeGreaterThanOrEqual(9);
  });

  it('заданий не меньше 6', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(6);
  });

  it('задания охватывают не меньше 3 тем', () => {
    const topics = new Set(LESSONS.map(l => l.competencyId));
    expect(topics.size).toBeGreaterThanOrEqual(3);
  });

  it('покупок не меньше 8, и оба типа представлены', () => {
    expect(REGISTRIES.items.length).toBeGreaterThanOrEqual(8);
    expect(REGISTRIES.items.some(i => i.category === 'must')).toBe(true);
    expect(REGISTRIES.items.some(i => i.category === 'want')).toBe(true);
  });

  it('целей накопления не меньше 3', () => {
    expect(GOALS.length).toBeGreaterThanOrEqual(3);
  });

  it('стадий роста питомца не меньше 3', () => {
    // Стадии теперь выводятся из уровня: считаем разные названия
    // на первых десяти уровнях.
    const stages = new Set(
      Array.from({ length: 10 }, (_, i) => levelTitle(i + 1)),
    );
    expect(stages.size).toBeGreaterThanOrEqual(3);
  });
});

describe('экономика остаётся проходимой', () => {
  const must = REGISTRIES.items.filter(i => i.category === 'must');
  const wants = REGISTRIES.items.filter(i => i.category === 'want');

  it('обязательное можно купить на дневной доход', () => {
    // Иначе магазин запрёт ребёнка в фазе «возьми всё нужное».
    const total = must.reduce((s, i) => s + i.price, 0);
    expect(total).toBeLessThanOrEqual(DAILY_REWARD);
  });

  it('после обязательного что-то из приятного по карману', () => {
    const left = DAILY_REWARD - must.reduce((s, i) => s + i.price, 0);
    const cheapest = Math.min(...wants.map(i => i.price));
    // Маленькая радость достижима сегодня — большая требует копить.
    expect(cheapest).toBeLessThanOrEqual(left);
  });

  it('ни одну цель за день не накопить', () => {
    const cheapest = Math.min(...GOALS.map(g => g.price));
    expect(cheapest).toBeGreaterThan(START_BUDGET + DAILY_REWARD);
  });

  it('каждый урок объявляет, когда он применяется', () => {
    LESSONS.forEach(l => {
      expect(l.appliesToday).toBeTruthy();
    });
  });

  it('дни уроков идут подряд без пропусков', () => {
    const days = LESSONS.map(l => l.day).sort((a, b) => a - b);
    days.forEach((d, i) => {
      if (i > 0) {
        expect(d - days[i - 1]).toBe(1);
      }
    });
  });
});
