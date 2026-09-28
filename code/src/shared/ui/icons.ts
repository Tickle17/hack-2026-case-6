import type { ImageSourcePropType } from 'react-native';

/**
 * Иконки интерфейса.
 *
 * Эмодзи здесь не годились: ✋ на плитке «погладить» и ✋ в подсказке —
 * один и тот же рисунок с разным смыслом, и ребёнок читал указатель
 * как ещё одну кнопку. Нарисованные иконки различаются формой,
 * а не только положением на экране.
 *
 * Пути в require() обязаны быть литералами, поэтому реестр плоский.
 * Картинки готовит tools/assets/prepare_items.py из одного листа.
 */
export const UI_ICONS: Record<string, ImageSourcePropType> = {
  /** Указатель подсказки: лапка питомца, тычет в кнопку. */
  point: require('../../../assets/items/ui-point.webp'),
  /** «Питомец грязный»: волны запаха и муха. */
  smell: require('../../../assets/items/ui-smell.png'),
};

/** Иконки дел дня — по идентификатору дела из реестра. */
export const TASK_ICONS: Record<string, ImageSourcePropType> = {
  pet: require('../../../assets/items/task-pet.webp'),
  bath: require('../../../assets/items/task-bath.webp'),
  walk: require('../../../assets/items/task-walk.png'),
};
