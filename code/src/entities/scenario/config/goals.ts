import type { ImageSourcePropType } from 'react-native';

/**
 * Цели накопления.
 *
 * Данные, а не код: новая цель добавляется строкой, без правок логики
 * (требование ТЗ 2.5.14). Цены подобраны так, чтобы за один день
 * накопить было нельзя — иначе копилка теряет смысл.
 */

export type GoalSpec = {
  id: string;
  title: string;
  price: number;
  /** Зачем это питомцу — детской фразой. */
  why: string;
  image: ImageSourcePropType;
};

/**
 * Картинка у цели и у вещи в комнате — ОДИН файл.
 *
 * Раньше их было две: нарядная «витринная» для каталога и своя для
 * комнаты. Они разошлись — ребёнок копил на домик с синей крышей, а
 * получал коричневый. Обещание, которое игра не выполняет, ломает
 * весь смысл накопления, поэтому картинка теперь одна физически:
 * разойтись им больше негде.
 */
export const GOALS: GoalSpec[] = [
  {
    id: 'ball',
    title: 'Большой мяч',
    price: 25,
    why: 'играть вместе',
    image: require('../../../../assets/things/ball.webp'),
  },
  {
    id: 'house',
    title: 'Домик для питомца',
    price: 30,
    why: 'своё место',
    image: require('../../../../assets/things/house.webp'),
  },
  {
    id: 'bed',
    title: 'Мягкая лежанка',
    price: 40,
    why: 'спать мягко',
    image: require('../../../../assets/things/bed.webp'),
  },
];

/**
 * Цель, которую игра советует в первый день.
 *
 * Домик, а не мяч: он дороже (30 против 25), и за один день на него
 * заведомо не накопить — ровно то, ради чего копилка и нужна. Мяч
 * ребёнок выберет сам во второй раз, если захочет быстрее.
 */
export const SUGGESTED_GOAL = 'house';

export function goalById(goalId: string): GoalSpec | undefined {
  return GOALS.find(g => g.id === goalId);
}

/**
 * Через сколько дней цель будет достигнута.
 *
 * ТЗ 2.5.7 требует, чтобы расчёт был понятным и основанным на средней
 * сумме регулярного пополнения. Поэтому формула ровно такая, какую
 * ребёнок может проверить в уме: осталось поделить на «сколько кладу в день».
 *
 * Возвращает null, если пополнений ещё не было: честнее не показать срок,
 * чем показать бесконечность.
 */
export function goalEta({
  price,
  saved,
  perDay,
}: {
  price: number;
  saved: number;
  perDay: number;
}): number | null {
  const left = price - saved;
  if (left <= 0) {
    return 0;
  }
  if (perDay <= 0) {
    return null;
  }
  return Math.ceil(left / perDay);
}
