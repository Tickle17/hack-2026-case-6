import type { ImageSourcePropType } from 'react-native';

/**
 * Готовые спрайты персонажей (PNG от дизайна).
 *
 * Пути должны быть литералами — бандлер RN разрешает require только
 * статически, вычислять путь строкой нельзя.
 *
 * Файлы готовит tools/assets/prepare_actors.py: обрезает поля и убирает
 * полупрозрачный ореол, иначе вокруг персонажа виден светлый нимб
 * на цветном фоне комнаты.
 *
 * Есть все четыре персонажа: мама, папа, ребёнок и учительница.
 * Если спрайта для позы нет, берётся ближайшая доступная.
 */

/** Настроение реплики — определяет позу. */
export type ActorPose =
  | 'talk'
  | 'point'
  | 'love'
  | 'greet'
  | 'wink'
  | 'gift'
  | 'think'
  | 'cheer'
  | 'book';

const MOTHER: Partial<Record<ActorPose, ImageSourcePropType>> = {
  point: require('../../../../assets/characters/mother-point.webp'),
  love: require('../../../../assets/characters/mother-kiss.webp'),
  greet: require('../../../../assets/characters/mother-wave.webp'),
  wink: require('../../../../assets/characters/mother-wink.webp'),
};

const FATHER: Partial<Record<ActorPose, ImageSourcePropType>> = {
  greet: require('../../../../assets/characters/father-wave.webp'),
  gift: require('../../../../assets/characters/father-gift.webp'),
  point: require('../../../../assets/characters/father-point.webp'),
};

const HERO: Partial<Record<ActorPose, ImageSourcePropType>> = {
  talk: require('../../../../assets/characters/hero-talk.webp'),
  think: require('../../../../assets/characters/hero-think.webp'),
  greet: require('../../../../assets/characters/hero-wave.webp'),
  love: require('../../../../assets/characters/hero-love.webp'),
  cheer: require('../../../../assets/characters/hero-cheer.webp'),
};

const TEACHER: Partial<Record<ActorPose, ImageSourcePropType>> = {
  greet: require('../../../../assets/characters/teacher-wave.webp'),
  point: require('../../../../assets/characters/teacher-point.webp'),
  book: require('../../../../assets/characters/teacher-book.webp'),
  cheer: require('../../../../assets/characters/teacher-praise.webp'),
};

const SELLER: Partial<Record<ActorPose, ImageSourcePropType>> = {
  greet: require('../../../../assets/characters/seller-wave.webp'),
  point: require('../../../../assets/characters/seller-point.webp'),
  gift: require('../../../../assets/characters/seller-give.webp'),
  talk: require('../../../../assets/characters/seller-idle.webp'),
};

const IMAGES: Record<
  string,
  Partial<Record<ActorPose, ImageSourcePropType>>
> = {
  seller: SELLER,
  mother: MOTHER,
  father: FATHER,
  hero: HERO,
  teacher: TEACHER,
};

/** Что показывать, если для нужной позы картинки нет. */
const FALLBACK_ORDER: ActorPose[] = [
  'talk',
  'greet',
  'point',
  'think',
  'book',
  'wink',
  'love',
  'cheer',
  'gift',
];

export function actorImage(
  speaker: string,
  pose: ActorPose,
): ImageSourcePropType | null {
  const set = IMAGES[speaker];
  if (!set) {
    return null;
  }
  if (set[pose]) {
    return set[pose] as ImageSourcePropType;
  }
  for (const p of FALLBACK_ORDER) {
    if (set[p]) {
      return set[p] as ImageSourcePropType;
    }
  }
  return null;
}

export function hasActorImage(speaker: string): boolean {
  return Boolean(IMAGES[speaker]);
}
