import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { useReducedMotion } from '@/shared/ui/motion';

/**
 * Панель, выезжающая от края экрана.
 *
 * Зачем. Служебные панели — показатели питомца и управление приёмкой —
 * нужны не всё время, а сцена нужна всегда. Постоянно висящие плашки
 * занимали середину экрана и закрывали то, ради чего игра и сделана:
 * комнату, персонажей, пример на доске.
 *
 * Поэтому по умолчанию видна только узкая вкладка у края. Нажал —
 * панель выехала, нажал ещё — уехала обратно.
 *
 * Вкладка едет вместе с панелью, как ручка выдвижного ящика: в закрытом
 * состоянии она у самого края, в открытом — рядом с панелью. В обоих
 * случаях по ней можно нажать, и это единственное, что важно.
 */

export type EdgePanelProps = {
  /** С какой стороны выезжает. */
  side: 'left' | 'right';
  /** Подпись на вкладке — одно-два слова. */
  label: string;
  /**
   * Открыта ли панель. Состоянием владеет экран, а не сама панель:
   * нажатие по сцене должно закрывать её, а об этом панель знать
   * не может.
   */
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const HANDLE_WIDTH = 34;
/** Высота вкладки и одновременно длина повёрнутой подписи. */
const HANDLE_HEIGHT = 104;

export function EdgePanel({
  side,
  label,
  open,
  onToggle,
  children,
}: EdgePanelProps) {
  const theme = useTheme();
  const still = useReducedMotion();

  /**
   * Ширина меряется, а не задаётся числом.
   *
   * С фиксированной шириной обёртка оказывалась шире содержимого,
   * и вкладка отъезжала от панели на пустое место. Начальное значение
   * заведомо больше любой панели, чтобы до первого замера она была
   * спрятана за краем, а не мелькнула на экране.
   */
  const width = useSharedValue(400);

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(
          open ? 0 : (side === 'right' ? 1 : -1) * width.value,
          {
            // При выключенных анимациях панель просто появляется на месте.
            duration: still ? 0 : 220,
            easing: Easing.out(Easing.quad),
          },
        ),
      },
    ],
  }));

  const handle = (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      style={{
        width: HANDLE_WIDTH,
        height: HANDLE_HEIGHT,
        backgroundColor: theme.color.surface,
        borderWidth: 3,
        borderColor: theme.color.border,
        alignItems: 'center',
        justifyContent: 'center',
        // Повёрнутая подпись шире вкладки — иначе её обрежет.
        overflow: 'visible',
      }}
    >
      {/*
        Подпись вертикальная: во вкладку шириной 34 dp слово
        горизонтально не помещается.

        Ширина задана ДО поворота. Без неё текст верстается по ширине
        вкладки и обрезается многоточием ещё до того, как повернётся, —
        на экране оставалась одна буква.
      */}
      <Text
        variant="caption"
        numberOfLines={1}
        style={{
          position: 'absolute',
          width: HANDLE_HEIGHT,
          textAlign: 'center',
          transform: [{ rotate: '90deg' }],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          // alignSelf здесь НЕ нужен: панели лежат в ряду, и там он
          // управлял бы вертикалью — вкладки оказывались на разной
          // высоте. Сторону задаёт родительский ряд.
        },
        style,
      ]}
    >
      {side === 'right' ? handle : null}
      {/* Ширину не задаём — панель занимает ровно столько, сколько
          нужно содержимому, и вкладка прилегает к ней вплотную. */}
      <View
        onLayout={e => {
          width.value = e.nativeEvent.layout.width;
        }}
      >
        {children}
      </View>
      {side === 'left' ? handle : null}
    </Animated.View>
  );
}
