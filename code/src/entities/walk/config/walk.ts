import type { ImageSourcePropType } from 'react-native';

/**
 * Прогулка: слои параллакса, препятствия, финиш.
 *
 * Числа — данные: сложность настраивается под возраст без правки кода
 * (docs/minigames.md, «Выгулять»).
 */

export type ParallaxLayer = {
  source: ImageSourcePropType;
  width: number;
  height: number;
  /** Доля скорости переднего плана: чем дальше, тем медленнее. */
  speed: number;
};

/** Дальний план — небо и город, почти неподвижен. */
export const LAYER_FAR: ParallaxLayer = {
  source: require('../../../../assets/walk/far.webp'),
  width: 1520,
  height: 760,
  speed: 0.15,
};

/** Средний план — деревья и скамейки. */
export const LAYER_MID: ParallaxLayer = {
  source: require('../../../../assets/walk/mid.webp'),
  width: 3040,
  height: 760,
  speed: 0.45,
};

/** Передний план — дорожка под лапами, задаёт ощущение скорости. */
export const LAYER_NEAR: ParallaxLayer = {
  source: require('../../../../assets/walk/near.webp'),
  width: 1520,
  height: 760,
  speed: 1,
};

export type ObstacleSpec = {
  id: string;
  source: ImageSourcePropType;
  width: number;
  height: number;
  /** Множитель к базовой высоте: не все препятствия одного размера. */
  scale?: number;
};

/**
 * Что встречается на прогулке.
 *
 * Скамейки здесь нет намеренно: она читается как место, где можно
 * посидеть, а не как преграда. Файл остаётся в ассетах — вернуть
 * её значит дописать строку.
 */
export const OBSTACLES: ObstacleSpec[] = [
  {
    id: 'puddle',
    source: require('../../../../assets/walk/puddle.webp'),
    width: 309,
    height: 150,
  },
  {
    id: 'box',
    source: require('../../../../assets/walk/box.webp'),
    width: 156,
    height: 150,
    scale: 2,
  },
  {
    id: 'bush',
    source: require('../../../../assets/walk/bush.webp'),
    width: 245,
    height: 150,
    scale: 2,
  },
];

export const SHOP = {
  source: require('../../../../assets/walk/shop.webp') as ImageSourcePropType,
  width: 771,
  height: 700,
};

/**
 * Настройки забега. Сложность меняется здесь, а не в компоненте:
 * для семи лет — медленнее и реже, для одиннадцати — быстрее.
 */
export const RUN_CONFIG = {
  /** Сколько длится забег, мс. */
  durationMs: 18000,
  /**
   * Скорость мира в dp за секунду. Задаёт всё: и как быстро едут слои,
   * и сколько времени видно приближающееся препятствие.
   * 250 dp/с на экране шириной ~400 dp дают около 1,4 секунды на реакцию.
   * Ориентир — гугловский динозаврик; медленнее ощущается вязко.
   */
  speedDpPerSecond: 250,
  /** Сколько препятствий встретится. */
  obstacleCount: 6,
  /** Первое препятствие не сразу: дать освоиться. */
  firstObstacleAt: 0.16,
  /** До финиша препятствий нет — подход к магазину спокойный. */
  lastObstacleAt: 0.78,
  /** Длительность прыжка, мс. */
  jumpMs: 700,
  /** Высота прыжка в долях высоты сцены. */
  jumpHeight: 0.45,
  /**
   * Насколько сузить прямоугольники при проверке столкновения.
   * У кота в габарит попадает хвост, у лужи — брызги: без сужения
   * питомец «задевает» то, чего не касается.
   */
  petHitInset: 0.25,
  obstacleHitInset: 0.18,
  /** Сколько питомец мигает после столкновения, мс. */
  blinkMs: 1000,

  /**
   * Пропорции сцены. Ориентир — динозаврик Google: невысокая полоса
   * и мелкий персонаж, чтобы препятствие было видно заранее.
   */
  sceneHeightRatio: 0.34,
  petHeightRatio: 0.3,
  /** Препятствия низкие: их перепрыгивает даже неловкий игрок. */
  obstacleHeightRatio: 0.08,
  /** Где стоит питомец по ширине экрана. */
  petLeftRatio: 0.12,
  /** Насколько поднять над нижним краем сцены, чтобы стоял на дорожке. */
  groundRatio: 0.1,
};
