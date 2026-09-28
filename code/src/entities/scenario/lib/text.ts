import type { GameState } from '../model/types';

/**
 * Обращение по имени.
 *
 * Реплики хранятся в сценарии как данные, а имена ребёнок вводит сам —
 * значит, в тексте стоит место под имя, а не само имя. Подстановка
 * происходит на отрисовке, поэтому смена имени видна сразу и нигде
 * не остаётся старой копии.
 *
 * Имена ставятся ТОЛЬКО в именительном падеже и в обращении
 * («Молодец, {имя}!», «{питомец} доволен»). Склонять русское имя
 * автоматически нельзя, а «дай {имя} корм» звучит сломанно.
 */

export const PLAYER_SLOT = '{имя}';
export const PET_SLOT = '{питомец}';

/**
 * Пока имя не введено — нейтральное обращение. Пустая строка
 * оставила бы «С днём рождения, !».
 */
const NO_NAME = 'друг';

export function personalize(
  text: string,
  state: Pick<GameState, 'playerName' | 'petName'>,
): string {
  return text
    .split(PLAYER_SLOT)
    .join(state.playerName || NO_NAME)
    .split(PET_SLOT)
    .join(state.petName);
}
