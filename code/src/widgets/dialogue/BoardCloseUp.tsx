import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

/**
 * Школьная доска крупным планом.
 *
 * Зачем отдельно от фона класса. Доска, нарисованная на фоне, стоит
 * «в глубине кадра»: она мелкая, и пример на ней приходится писать
 * таким же мелким. Ребёнок 7–11 лет читает по слогам — условие задачи
 * должно быть крупным, иначе задача не решается не потому, что трудная,
 * а потому, что её не разобрать.
 *
 * Доска нарисована фигурами, а не картинкой: так она остаётся чёткой
 * при любом размере экрана и не зависит от разрешения исходника.
 * Фон класса при этом остаётся — доска просто выходит на передний план.
 */

export type BoardCloseUpProps = {
  text: string;
};

/** Чем длиннее условие, тем мельче мел — но всё равно крупно. */
function fitVariant(text: string): 'display' | 'title' {
  return text.length <= 40 ? 'display' : 'title';
}

/**
 * Пропуск в задании «вставь слово».
 *
 * Пишется в тексте тремя подчёркиваниями и на доске показывается
 * отдельным куском другого цвета: иначе пропуск теряется в строке,
 * и задание читается как утверждение, а не как вопрос.
 */
const GAP = '___';

export function BoardCloseUp({ text }: BoardCloseUpProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const frame = Math.max(10, Math.round(width * 0.022));

  return (
    <View style={{ paddingHorizontal: theme.space.md }}>
      {/* деревянная рама */}
      <View
        style={{
          backgroundColor: theme.color.board.frame,
          padding: frame,
          borderWidth: 4,
          borderColor: theme.color.border,
        }}
      >
        {/* зелёное полотно */}
        <View
          style={{
            backgroundColor: theme.color.board.surface,
            minHeight: Math.round(width * 0.42),
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.space.lg,
            paddingVertical: theme.space.xl,
          }}
        >
          <Text
            variant={fitVariant(text)}
            style={{ color: theme.color.board.chalk, textAlign: 'center' }}
          >
            {text.split(GAP).map((part, i, all) => (
              <Text key={i} variant={fitVariant(text)}>
                {part}
                {i < all.length - 1 ? (
                  <Text
                    variant={fitVariant(text)}
                    style={{ color: theme.color.coin }}
                  >
                    {GAP}
                  </Text>
                ) : null}
              </Text>
            ))}
          </Text>
        </View>
      </View>

      {/* полочка для мела — от неё доска читается как доска */}
      <View
        style={{
          height: Math.round(frame * 0.8),
          marginHorizontal: frame,
          backgroundColor: theme.color.board.tray,
          borderWidth: 4,
          borderTopWidth: 0,
          borderColor: theme.color.border,
        }}
      />
    </View>
  );
}
