import type { PetEmotion, PetStats } from '../model/types';

/**
 * Числа — из docs/game-design.md, раздел «Характеристики питомца».
 * Менять только там, потом здесь.
 */
export const DECAY_PER_DAY = {
  satiety: 30,
  mood: 20,
  cleanliness: 25,
} as const;
export const FLOOR = 10;
export const MAX_STAT = 100;

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number): number {
  return Math.max(FLOOR, Math.min(MAX_STAT, Math.round(value)));
}

/**
 * Время передаётся аргументом, а не берётся из Date.now() — иначе функцию
 * нельзя протестировать.
 *
 * Промежуток обрезается сутками: недельный перерыв не должен обнулять питомца.
 * Отсутствие в игре не наказывается — см. принцип 4 в game-design.md.
 */
export function applyDecay(stats: PetStats, elapsedMs: number): PetStats {
  const days = Math.min(Math.max(elapsedMs, 0), DAY_MS) / DAY_MS;
  return {
    satiety: clamp(stats.satiety - DECAY_PER_DAY.satiety * days),
    mood: clamp(stats.mood - DECAY_PER_DAY.mood * days),
    cleanliness: clamp(stats.cleanliness - DECAY_PER_DAY.cleanliness * days),
  };
}

export function wellbeing(stats: PetStats): number {
  return Math.round((stats.satiety + stats.mood + stats.cleanliness) / 3);
}

/** Питомцу может быть грустно — но он не умирает и не обвиняет ребёнка. */
export function emotionFor(stats: PetStats): PetEmotion {
  const weakest = Math.min(stats.satiety, stats.mood, stats.cleanliness);
  if (weakest >= 70) {
    return 'happy';
  }
  if (weakest >= 40) {
    return 'content';
  }
  if (weakest === stats.satiety) {
    return 'hungry';
  }
  if (weakest === stats.cleanliness) {
    return 'dirty';
  }
  return 'sad';
}

/**
 * Почему питомцу так, от первого лица — по самому слабому показателю.
 * Порядок при равенстве тот же, что у emotionFor.
 */
export function moodReason(stats: PetStats): string {
  const weakest = Math.min(stats.satiety, stats.mood, stats.cleanliness);
  if (weakest >= 70) {
    return 'Мне хорошо: я сытый, чистый и довольный!';
  }
  if (weakest === stats.satiety) {
    return 'Я голодный. Покорми меня!';
  }
  if (weakest === stats.cleanliness) {
    return 'Я грязный, хочу в ванну.';
  }
  return 'Мне скучно. Погладь меня или купи игрушку.';
}
