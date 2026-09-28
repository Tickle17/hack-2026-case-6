import { ROOM_THINGS, thingRect, type RoomThing } from '../config/furniture';
import type { NormRect } from '../config/room';

/**
 * Что стоит в комнате прямо сейчас.
 *
 * Считается из списка полученных целей, а не хранится отдельно:
 * второй список тех же данных рано или поздно разойдётся с первым.
 */

export { ROOM_THINGS, thingRect };
export type { RoomThing };

export function roomThings(goalsAchieved: readonly string[]): RoomThing[] {
  // Порядок берём из таблицы вещей, а не из порядка получения:
  // расстановка мебели не должна зависеть от того, что ребёнок
  // накопил раньше.
  return ROOM_THINGS.filter(thing => goalsAchieved.includes(thing.goalId));
}

/** Препятствия от вещей — для карты проходимости. */
export function thingObstacles(things: readonly RoomThing[]): NormRect[] {
  return things.filter(t => t.blocks).map(thingRect);
}
