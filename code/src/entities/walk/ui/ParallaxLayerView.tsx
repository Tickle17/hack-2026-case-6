import React, { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/shared/ui/motion';
import type { ParallaxLayer } from '../config/walk';

/** Бесконечно едущий слой фона прогулки: две копии подряд. */
export function ParallaxLayerView({
  layer,
  height,
  speedDp,
  running,
}: {
  layer: ParallaxLayer;
  height: number;
  /** Скорость переднего плана в dp/с; слой едет медленнее в свою долю. */
  speedDp: number;
  /**
   * Пока true — слой едет. Слои крутятся бесконечным циклом, а движение
   * мира конечно: без этой остановки на финише кот и магазин замирали,
   * а фон продолжал ехать сам по себе.
   */
  running: boolean;
}) {
  const shift = useSharedValue(0);
  const scaled = Math.round(layer.width * (height / layer.height));
  // Параллакс — украшение, а не механика: при выключенных анимациях
  // фон стоит, а бег и препятствия остаются, иначе игра стала бы
  // непроходимой (см. shared/ui/motion).
  const still = useReducedMotion();

  useEffect(() => {
    if (!running || still) {
      // Тормозим плавно, а не рывком: резкая остановка читается как сбой.
      cancelAnimation(shift);
      shift.value = withTiming(shift.value - scaled * 0.02, {
        duration: 420,
        easing: Easing.out(Easing.quad),
      });
      return;
    }
    const period = (scaled / (speedDp * layer.speed)) * 1000;
    shift.value = 0;
    shift.value = withRepeat(
      withTiming(-scaled, { duration: period, easing: Easing.linear }),
      -1,
      false,
    );
  }, [shift, scaled, speedDp, layer.speed, running, still]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }));

  // Две копии подряд: пока уходит первая, вторая уже въезжает.
  return (
    <Animated.View
      style={[style, { position: 'absolute', flexDirection: 'row' }]}
    >
      <Image
        source={layer.source}
        style={{ width: scaled, height }}
        resizeMode="cover"
      />
      <Image
        source={layer.source}
        style={{ width: scaled, height }}
        resizeMode="cover"
      />
    </Animated.View>
  );
}
