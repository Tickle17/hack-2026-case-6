import type { ImageSourcePropType } from 'react-native';

/**
 * Шаги купания. Порядок важен: это тренировка планирования — того же
 * навыка, что и в бюджете, только на бытовом материале
 * (docs/minigames.md, «Искупать»).
 *
 * Убрать шаг или добавить новый = правка этого массива. Ни компонент,
 * ни логика игры не трогаются.
 *
 * Картинки нарезаны из общего листа (tools/assets/prepare_items.py).
 */
export type BathStep = {
  id: string;
  label: string;
  image: ImageSourcePropType;
  /** Что говорит питомец, если этот шаг сделали не вовремя. */
  tooEarly: string;
};

export const BATH_STEPS: BathStep[] = [
  {
    id: 'wet',
    label: 'Намочить',
    image: require('../../../../assets/items/bath-wet.png'),
    tooEarly: 'Сначала меня надо намочить!',
  },
  {
    id: 'soap',
    label: 'Намылить',
    image: require('../../../../assets/items/bath-soap.png'),
    tooEarly: 'Я ещё сухой, намочи сначала',
  },
  {
    id: 'rinse',
    label: 'Смыть',
    image: require('../../../../assets/items/bath-rinse.png'),
    tooEarly: 'Смывать пока нечего',
  },
  {
    id: 'dry',
    label: 'Посушить',
    image: require('../../../../assets/items/bath-dry.webp'),
    tooEarly: 'Я же ещё в пене!',
  },
  {
    id: 'brush',
    label: 'Причесать',
    image: require('../../../../assets/items/bath-brush.png'),
    tooEarly: 'Мокрого чесать не надо',
  },
];

/** Сцена ванны: два слоя, между ними питомец. */
export const TUB_BACK: ImageSourcePropType = require('../../../../assets/scenes/tub-back.png');
export const TUB_FRONT: ImageSourcePropType = require('../../../../assets/scenes/tub-front.png');
export const TUB_ASPECT = 900 / 675;
