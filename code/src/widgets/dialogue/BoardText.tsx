import React from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/ui/Text';
import { SCHOOL_BOARD } from '@/entities/room/config/room';

/**
 * Надпись на школьной доске.
 *
 * Пример пишется мелом на доске, а не в панели внизу: ребёнок смотрит
 * туда, куда смотрел бы в классе. Координаты доски — данные фона
 * (SCHOOL_BOARD), поэтому при замене картинки класса правится одно место.
 *
 * Размер шрифта подбирается по длине текста. Короткий пример
 * «10 − 3 − 3 − ? = 1» должен быть крупным, а задача словами длиннее
 * в четыре раза — иначе она не помещается и выезжает за доску.
 * Обрезать нельзя: непрочитанное условие делает задачу нерешаемой.
 */

export type BoardTextProps = {
  text: string;
  roomWidth: number;
  roomHeight: number;
};

/** Чем длиннее условие, тем мельче мел. Пороги подобраны по ширине доски. */
function fitVariant(text: string): 'display' | 'title' | 'body' {
  if (text.length <= 22) {
    return 'display';
  }
  return text.length <= 44 ? 'title' : 'body';
}

export function BoardText({ text, roomWidth, roomHeight }: BoardTextProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: SCHOOL_BOARD.x * roomWidth,
        top: SCHOOL_BOARD.y * roomHeight,
        width: SCHOOL_BOARD.w * roomWidth,
        height: SCHOOL_BOARD.h * roomHeight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant={fitVariant(text)}
        style={{ color: '#F5EAD8', textAlign: 'center' }}
      >
        {text}
      </Text>
    </View>
  );
}
