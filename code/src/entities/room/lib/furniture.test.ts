import { ROOM_THINGS, roomThings, thingObstacles } from './furniture';
import { isWalkable } from './walkable';
import { GOALS } from '@/entities/scenario/config/goals';
import { PET_HEIGHT } from '../config/room';

/**
 * Вещи, которые ребёнок накопил, стоят в комнате.
 *
 * Копилка обязана превращаться во что-то видимое. Полоса заполнилась,
 * вещь получена — и она появляется у питомца дома, иначе накопление
 * остаётся числом на экране.
 */

describe('вещи в комнате', () => {
  it('пока ничего не накоплено — комната пустая', () => {
    expect(roomThings([])).toEqual([]);
  });

  it('полученная цель появляется в комнате', () => {
    const things = roomThings(['house']);

    expect(things).toHaveLength(1);
    expect(things[0].goalId).toBe('house');
  });

  it('каждая цель появляется один раз, даже если получена дважды', () => {
    expect(roomThings(['ball', 'ball'])).toHaveLength(1);
  });

  it('неизвестная цель ничего не ломает', () => {
    expect(roomThings(['такой-цели-нет'])).toEqual([]);
  });

  // Страж: без него опечатка в координатах превращается в вещь,
  // до которой питомец идёт и не доходит — и застревает навсегда.
  it('к каждой вещи питомец может подойти', () => {
    const pet = { w: PET_HEIGHT * 0.8, h: PET_HEIGHT };

    ROOM_THINGS.forEach(thing => {
      expect({
        вещь: thing.goalId,
        подойти: isWalkable(thing.use, pet),
      }).toEqual({ вещь: thing.goalId, подойти: true });
    });
  });

  it('у каждой цели есть своя вещь — иначе копить не за чем', () => {
    const placed = ROOM_THINGS.map(t => t.goalId).sort();

    expect(placed).toEqual(GOALS.map(g => g.id).sort());
  });
});

/**
 * Вещь, сквозь которую нельзя ходить, должна влиять на карту
 * проходимости — иначе питомец пройдёт сквозь домик насквозь.
 */
describe('вещи как препятствия', () => {
  const pet = { w: PET_HEIGHT * 0.8, h: PET_HEIGHT };

  it('домик перекрывает место, где стоит', () => {
    const house = ROOM_THINGS.find(t => t.goalId === 'house')!;
    const inside = { x: house.spot.x + 0.02, y: house.spot.y + 0.02 };

    expect(isWalkable(inside, pet)).toBe(true);
    expect(isWalkable(inside, pet, thingObstacles([house]))).toBe(false);
  });

  it('лежанка и мяч не мешают: по ним ходят', () => {
    const flat = ROOM_THINGS.filter(t => t.goalId !== 'house');

    expect(thingObstacles(flat)).toEqual([]);
  });

  // Подход к вещи должен быть проходим со ВСЕЙ расставленной мебелью,
  // включая саму вещь. Так в коде ходьбы не нужно исключений вида
  // «к этой точке идём, не проверяя»: место рядом с вещью — обычное
  // место на полу.
  it('к вещам можно подойти при всей расставленной мебели', () => {
    const blocked = thingObstacles(ROOM_THINGS);

    ROOM_THINGS.forEach(thing => {
      expect({
        вещь: thing.goalId,
        подойти: isWalkable(thing.use, pet, blocked),
      }).toEqual({ вещь: thing.goalId, подойти: true });
    });
  });
});
