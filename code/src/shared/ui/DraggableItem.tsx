import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  Easing,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/shared/theme';
import { Text } from './Text';

/**
 * Предмет, который ребёнок ПЕРЕТАСКИВАЕТ к питомцу, а не «нажимает кнопку».
 *
 * Почему так: перетаскивание делает трату телесной. Ребёнок физически берёт
 * яблоко за 6 монет и несёт его питомцу — это ощущается как расставание
 * с ресурсом, чего кнопка «Покормить» не даёт.
 *
 * Если монет не хватает, предмет НЕ поднимается: он дрожит и объясняет причину.
 * Отказ должен быть понятен до попытки, а не после.
 */

export type DraggableItemProps = {
  emoji: string;
  label: string;
  price: number;
  affordable: boolean;
  blockedReason: string;
  /** Экранные координаты цели (центр питомца). */
  target: { x: number; y: number } | null;
  /** Собственные экранные координаты центра предмета. */
  origin: { x: number; y: number } | null;
  onDelivered: () => void;
  onBlocked: (reason: string) => void;
  onLift?: () => void;
};

const HIT_RADIUS = 130;

export function DraggableItem({
  emoji,
  label,
  price,
  affordable,
  blockedReason,
  target,
  origin,
  onDelivered,
  onBlocked,
  onLift,
}: DraggableItemProps) {
  const theme = useTheme();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const lifted = useSharedValue(0);

  /** Предмет ровно возвращается на место: пружина здесь качала его. */
  const settle = () => {
    'worklet';
    const back = { duration: 160, easing: Easing.out(Easing.quad) };
    tx.value = withTiming(0, back);
    ty.value = withTiming(0, back);
    scale.value = withTiming(1, back);
    lifted.value = withTiming(0, { duration: 150 });
  };

  const refuse = () => {
    'worklet';
    shake.value = withTiming(-1, { duration: 50 }, () => {
      shake.value = withTiming(1, { duration: 50 }, () => {
        shake.value = withTiming(0, { duration: 50 });
      });
    });
    runOnJS(onBlocked)(blockedReason);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      if (!affordable) {
        refuse();
        return;
      }
      scale.value = withTiming(1.25, { duration: 120 });
      lifted.value = withTiming(1, { duration: 120 });
      if (onLift) {
        runOnJS(onLift)();
      }
    })
    .onUpdate(e => {
      'worklet';
      if (!affordable) {
        return;
      }
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      if (!affordable || !target || !origin) {
        settle();
        return;
      }
      const dropX = origin.x + tx.value;
      const dropY = origin.y + ty.value;
      const dist = Math.sqrt((dropX - target.x) ** 2 + (dropY - target.y) ** 2);
      if (dist < HIT_RADIUS) {
        // Долетело: предмет исчезает в питомце
        scale.value = withTiming(0, { duration: 160 });
        runOnJS(onDelivered)();
        tx.value = withTiming(0, { duration: 0 });
        ty.value = withTiming(0, { duration: 0 });
        scale.value = withTiming(1, { duration: 220 });
        lifted.value = withTiming(0, { duration: 0 });
      } else {
        settle();
      }
    });

  const itemStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value + shake.value * 8 },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    zIndex: lifted.value > 0 ? 100 : 1,
    elevation: lifted.value > 0 ? 12 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[itemStyle, styles.wrap]}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: theme.radius.xl,
            backgroundColor: theme.color.surface,
            borderWidth: 2,
            borderColor: theme.color.border,
            borderBottomWidth: 5,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: affordable ? 1 : 0.45,
          }}
        >
          <Text variant="display">{emoji}</Text>
        </View>
        <View style={[styles.price, { gap: 4, marginTop: theme.space.xs }]}>
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: affordable
                ? theme.color.coin
                : theme.color.text.muted,
              borderBottomWidth: 2,
              borderBottomColor: affordable
                ? theme.color.coinShadow
                : theme.color.text.muted,
            }}
          />
          <Text variant="caption" tone={affordable ? 'primary' : 'muted'}>
            {price}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  price: { flexDirection: 'row', alignItems: 'center' },
});
