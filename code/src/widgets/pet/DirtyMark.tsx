import React from 'react';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Image } from 'react-native';
import { Text } from '@/shared/ui/Text';
import { UI_ICONS } from '@/shared/ui/icons';
import { useReducedMotion } from '@/shared/ui/motion';

/**
 * Значок «питомец грязный» над питомцем.
 *
 * Зачем. После прогулки чистота падает, и это решение — вести питомца
 * в ванну — ребёнок должен принимать, глядя на питомца, а не на полоску
 * в выдвижной панели. Полоску ещё надо открыть, а грязь видно сразу.
 *
 * Смысл несут И значок, И подпись: цвет или одна иконка не могут быть
 * единственным носителем смысла (ТЗ 3.6).
 *
 * Значок следит за питомцем: тот ходит по комнате, и его координаты
 * живут в shared values, поэтому позиция считается в воркете.
 */

export type DirtyMarkProps = {
  petX: SharedValue<number>;
  petY: SharedValue<number>;
  petWidth: SharedValue<number>;
};

/** Ширина значка: по ней же он центрируется над питомцем. */
const WIDTH = 92;
/** Насколько выше питомца висит значок, чтобы не закрывать его. */
const LIFT = 46;

export function DirtyMark({ petX, petY, petWidth }: DirtyMarkProps) {
  const theme = useTheme();
  const still = useReducedMotion();
  const float = useSharedValue(0);

  React.useEffect(() => {
    // Лёгкое покачивание: запах «поднимается». При выключенных
    // анимациях значок просто висит на месте.
    float.value = still
      ? 0
      : withRepeat(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        );
  }, [float, still]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: petX.value + petWidth.value / 2 - WIDTH / 2,
    top: petY.value - LIFT - float.value * 6,
    width: WIDTH,
    alignItems: 'center',
    // Значок висит НАД питомцем, поэтому и в порядке отрисовки должен
    // быть выше него. Питомец получает свой zIndex по линии ног —
    // без явного значения здесь значок ушёл бы за спрайт и пропал.
    zIndex: Math.round(petY.value) + 10_000,
  }));

  return (
    <Animated.View pointerEvents="none" style={style}>
      <Image
        source={UI_ICONS.smell}
        resizeMode="contain"
        style={{ width: 30, height: 30 }}
      />
      <Text
        variant="caption"
        style={{
          textAlign: 'center',
          color: theme.color.text.onColor,
          backgroundColor: theme.color.border,
          paddingHorizontal: theme.space.xs,
        }}
      >
        грязный
      </Text>
    </Animated.View>
  );
}
