import type { ImageSourcePropType } from 'react-native';
import type { SpendCategory } from '../model/types';

/**
 * Значки направлений бюджета.
 *
 * Различаются ФОРМОЙ, а не только цветом: ТЗ 3.6 требует, чтобы цвет
 * не был единственным способом передать смысл.
 */

export type BudgetDirection = SpendCategory | 'save';

export const DIRECTIONS: {
  id: BudgetDirection;
  title: string;
  hint: string;
  image: ImageSourcePropType;
}[] = [
  {
    id: 'must',
    title: 'ОБЯЗАТЕЛЬНОЕ',
    hint: 'еда, шампунь, поводок',
    image: require('../../../../assets/budget/must.webp'),
  },
  {
    id: 'want',
    title: 'РАЗВЛЕЧЕНИЯ',
    hint: 'игрушки и вкусняшки',
    image: require('../../../../assets/budget/want.webp'),
  },
  {
    id: 'save',
    title: 'КОПИЛКА',
    hint: 'на большую цель',
    image: require('../../../../assets/budget/save.webp'),
  },
];
