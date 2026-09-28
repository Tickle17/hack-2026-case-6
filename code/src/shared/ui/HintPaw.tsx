import React, { useEffect } from 'react';
import { View, Image, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { UI_ICONS } from '@/shared/ui/icons';
import { useReducedMotion } from '@/shared/ui/motion';

/**
 * Указатель-лапка над кнопкой, о которой говорит подсказка.
 *
 * Показывает не только КУДА, но и КАК: по кнопке тыкают, а ползунок
 * тянут. Лапка, тыкающая в ползунок, врёт о способе — ребёнок будет
 * жать и не догадается провести пальцем.
 *
 * Зачем не рамка. Обводка спорит с собственной рамкой кнопки — у нас
 * каждый элемент и так в толстой пиксельной рамке, и ещё одна читается
 * как «кнопка сломалась», а не «нажми сюда». Лапка ничего не обводит:
 * она просто показывает пальцем и ритмично тыкает, как это сделал бы
 * человек рядом.
 *
 * Ритм с паузой, а не равномерное покачивание: равномерное движение
 * глаз быстро перестаёт замечать, а короткий тычок и остановка
 * притягивают взгляд снова и снова.
 *
 * При выключенных анимациях (ТЗ 3.6) лапка просто висит на месте —
 * смысл несёт сам указатель, а не его движение.
 *
 * Касания не перехватывает: подсказка не должна мешать сделать то,
 * к чему она зовёт.
 */

export type HintPawProps = {
  /** Показывать ли указатель. */
  active: boolean;
  /**
   * Лапка стоит ВНУТРИ кнопки, у самого её края.
   *
   * Нужно там, где кнопка лежит в прокручиваемом списке: всё, что
   * выше её края, обрезается границей списка, и у первой карточки
   * от лапки оставались одни подушечки.
   */
  inside?: boolean;
  /**
   * Что показать: нажатие или движение.
   *
   * `drag` ведёт лапку вдоль элемента слева направо — так видно,
   * что ползунок тянут, а не нажимают.
   */
  gesture?: 'tap' | 'drag';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Размер лапки: крупнее плитки быть не должна. */
const PAW = 40;
/** Насколько лапка «тычет». */
const POKE = 10;
/** Сколько едет лапка, показывая жест. */
const DRAG_MS = 1500;
/** Доля пути, на которой лапка появляется и исчезает. */
const FADE = 0.12;
/** Пауза между тычками: без неё движение превращается в фон. */
const REST_MS = 620;

export function HintPaw({
  active,
  inside = false,
  gesture = 'tap',
  children,
  style,
}: HintPawProps) {
  const still = useReducedMotion();
  const poke = useSharedValue(0);
  /** Ширина элемента: по ней считается путь лапки при показе жеста. */
  const width = useSharedValue(0);

  useEffect(() => {
    if (!active || still) {
      poke.value = 0;
      return;
    }
    if (gesture === 'drag') {
      // Проезд слева направо и пауза: за паузу глаз успевает понять,
      // что это был один жест, а не мельтешение.
      poke.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1 }),
          withTiming(1, {
            duration: DRAG_MS,
            easing: Easing.inOut(Easing.quad),
          }),
          withDelay(REST_MS, withTiming(1, { duration: 1 })),
        ),
        -1,
        false,
      );
      return;
    }
    poke.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 170, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 210, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 170, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 210, easing: Easing.inOut(Easing.quad) }),
        withDelay(REST_MS, withTiming(0, { duration: 1 })),
      ),
      -1,
      false,
    );
  }, [active, still, gesture, poke]);

  const pawStyle = useAnimatedStyle(() => {
    if (gesture === 'drag') {
      // При выключенных анимациях лапка просто стоит в начале пути.
      // Через общую формулу она получила бы прозрачность 0 (проезд
      // начинается с проявления) — то есть подсказка пропадала бы
      // совсем у того, кому она нужнее всех.
      if (still) {
        return { opacity: 1, transform: [{ translateX: 0 }] };
      }
      const travel = Math.max(0, width.value - PAW);
      // Гаснет на концах: иначе возврат в начало читается как рывок.
      const fade =
        poke.value < FADE
          ? poke.value / FADE
          : poke.value > 1 - FADE
          ? (1 - poke.value) / FADE
          : 1;
      return {
        opacity: fade,
        transform: [{ translateX: poke.value * travel }],
      };
    }
    return { transform: [{ translateY: poke.value * POKE }] };
  });

  return (
    <View
      style={style}
      onLayout={e => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      {children}
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[
            gesture === 'drag'
              ? // Показ жеста: лапка едет по самому элементу.
                {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                }
              : {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  // Стоит вплотную к кнопке: между указателем и целью
                  // не должно быть пустого места, иначе он показывает
                  // «куда-то туда». Внутри — когда снаружи обрежет.
                  top: inside ? 2 : -30,
                },
            pawStyle,
          ]}
        >
          {/* Лапка нарисована тычущей ВНИЗ, поэтому она бывает только
              над кнопкой. Перевернуть её нельзя: рисунок симметричен
              по вертикали, и вверх ногами он читается не как «лапка
              снизу», а как испорченная картинка. */}
          <Image
            source={UI_ICONS.point}
            resizeMode="contain"
            style={{ width: PAW, height: PAW }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
