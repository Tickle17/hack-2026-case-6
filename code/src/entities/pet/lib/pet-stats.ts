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

/** Меньше половины — питомец говорит об этом. */
export const COMPLAIN_BELOW = 50;

/**
 * Что питомец говорит сам: только когда ему по-настоящему плохо.
 * Когда всё хорошо — молчит. Голод и грусть могут идти друг за другом.
 * Без упрёков ребёнку: питомец говорит о себе, а не о нём.
 */
export function petComplaints(stats: PetStats): string[] {
  const lines: string[] = [];
  if (stats.satiety < COMPLAIN_BELOW) {
    lines.push('Я очень голоден');
  }
  if (stats.mood < COMPLAIN_BELOW) {
    lines.push('Мне очень грустно');
  }
  return lines;
}

export const HOUR_MS = 60 * 60 * 1000;

/**
 * Сытость убывает на 1 за каждый полный реальный час — и пока игра
 * закрыта. Время передаётся аргументом: функция чистая и тестируемая.
 * `since` — с какого момента считать следующий час: неполный час
 * не теряется. Ниже пола не опускается — перерыв питомцу не вредит.
 */
export function hourlyHunger(
  stats: PetStats,
  since: number,
  now: number,
): { stats: PetStats; since: number } {
  const hours = Math.floor(Math.max(0, now - since) / HOUR_MS);
  if (hours === 0) {
    return { stats, since };
  }
  return {
    stats: { ...stats, satiety: clamp(stats.satiety - hours) },
    since: since + hours * HOUR_MS,
  };
}
