import React from 'react';
import { View, Image } from 'react-native';
import type { RoomThing } from '@/entities/room/lib/furniture';

/**
 * Вещи, которые ребёнок накопил, на своих местах в комнате.
 *
 * Порядок с питомцем разбирается сам собой: у каждой вещи zIndex по
 * её нижней кромке, у питомца — по линии ног. Кто ниже по комнате,
 * тот ближе к зрителю. Поэтому в домике питомец оказывается внутри,
 * а перед лежанкой — перед ней, и никаких отдельных правил на вещь
 * заводить не нужно.
 *
 * Касания не перехватываем: комната — фон, все действия в игре
 * начинаются с полки дел.
 */

export type RoomThingsProps = {
  things: readonly RoomThing[];
  width: number;
  height: number;
};

export function RoomThings({ things, width, height }: RoomThingsProps) {
  return (
    <>
      {things.map(thing => (
        <View
          key={thing.goalId}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: thing.spot.x * width,
            top: thing.spot.y * height,
            width: thing.size.w * width,
            height: thing.size.h * height,
            // +1 к нижней кромке: при точном совпадении с линией ног
            // питомца вещь должна оказаться перед ним — он сидит В
            // домике, а не перед домиком.
            zIndex: Math.round((thing.spot.y + thing.size.h) * height) + 1,
          }}
        >
          {/* Тень под вещью — то, чем она касается пола.

              Генератор её не рисует: вместо контактной тени он кладёт
              вокруг предмета тёплое свечение, а свечение снимается
              вместе с фоном. Без тени вещь висит наклейкой поверх
              пола, как бы верно ни был выбран ракурс. Рисуем сами —
              так она одинаковая у всех вещей и не зависит от того,
              что нарисовал генератор. */}
          <View
            style={{
              position: 'absolute',
              // Выступает из-под основания: тень, целиком спрятанная
              // за картинкой, ничего не заземляет — её просто не видно.
              left: '6%',
              right: '6%',
              bottom: '-5%',
              height: '15%',
              borderRadius: 999,
              backgroundColor: 'rgba(0, 0, 0, 0.28)',
            }}
          />
          <Image
            source={thing.image}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>
      ))}
    </>
  );
}
