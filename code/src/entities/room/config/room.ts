import type { ImageSourcePropType } from 'react-native';

/**
 * Комната — фоновая картинка от дизайна.
 *
 * Карта проходимости описана здесь ДАННЫМИ, в долях от размера комнаты
 * (0..1), а не в пикселях: тогда она не зависит от разрешения картинки
 * и от размера экрана. Из изображения её вывести нельзя — что мебель,
 * а что коврик, знает только человек.
 *
 * Изображение готовит tools/assets/prepare_room.py.
 */

export type NormRect = { x: number; y: number; w: number; h: number };

/** Где происходит сцена. Задаётся сценарием, а не логикой экрана. */
export type SceneId = 'home' | 'school' | 'shop';

const SCENE_IMAGES: Record<SceneId, ImageSourcePropType> = {
  home: require('../../../../assets/rooms/home.webp'),
  school: require('../../../../assets/rooms/school.webp'),
  shop: require('../../../../assets/rooms/shop.webp'),
};

export function sceneImage(scene: SceneId): ImageSourcePropType {
  return SCENE_IMAGES[scene] ?? SCENE_IMAGES.home;
}

export const ROOM_IMAGE: ImageSourcePropType = SCENE_IMAGES.home;

/**
 * Доска в классе — в долях от размера фона. Поверх неё выводится
 * загадка урока, поэтому координаты нужны здесь, а не в компоненте.
 */
export const SCHOOL_BOARD = { x: 0.22, y: 0.05, w: 0.58, h: 0.22 };

/** Соотношение сторон исходника — чтобы не растягивать комнату. */
export const ROOM_ASPECT = 1280 / 2767;

/**
 * Пол, по которому можно ходить. Выше — стена с диваном и дверями,
 * ниже — нижняя стенка комнаты.
 */
export const FLOOR: NormRect = { x: 0.1, y: 0.305, w: 0.8, h: 0.53 };

/**
 * Мебель, сквозь которую нельзя ходить.
 * Ковры намеренно НЕ включены: по ним питомец ходит.
 */
export const OBSTACLES: NormRect[] = [
  // распахнутая дверь слева
  { x: 0.03, y: 0.28, w: 0.09, h: 0.13 },
  // тумбочка с цветком слева
  { x: 0.04, y: 0.485, w: 0.15, h: 0.13 },
  // журнальный столик по центру
  { x: 0.26, y: 0.465, w: 0.13, h: 0.16 },
  // тумба с телевизором справа
  { x: 0.775, y: 0.42, w: 0.17, h: 0.2 },
];

/** Высота питомца в долях высоты комнаты. */
export const PET_HEIGHT = 0.075;
