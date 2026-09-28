/**
 * Русское склонение при числе.
 *
 * Нужно на кнопках и в подписях: «Отложить 2 монет» ребёнок прочтёт
 * как поломку игры, а не как свою ошибку.
 */

/** Одиннадцать похоже на единицу, но склоняется как пять — это правило. */
export function plural(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(Math.round(n));
  const tail100 = abs % 100;
  if (tail100 >= 11 && tail100 <= 14) {
    return many;
  }
  const tail10 = abs % 10;
  if (tail10 === 1) {
    return one;
  }
  if (tail10 >= 2 && tail10 <= 4) {
    return few;
  }
  return many;
}

export function coinsWord(n: number): string {
  return plural(n, 'монета', 'монеты', 'монет');
}
