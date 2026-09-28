import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Text } from './Text';

/**
 * Реплика питомца — основной канал обучающей обратной связи.
 *
 * Говорит сам питомец, а не система: ребёнку 7–12 лет обращение от персонажа
 * читается как разговор, а системный тост внизу экрана — как служебное
 * сообщение, которое взгляд пропускает.
 *
 * Тон: объясняет последствие, подсказывает следующий шаг, НИКОГДА не обвиняет
 * (см. docs/brandbook-guide.md).
 */

export type SpeechKind = 'info' | 'warning' | 'reward';

export type SpeechBubbleProps = {
  message: string | null;
  kind?: SpeechKind;
};

export function SpeechBubble({ message, kind = 'info' }: SpeechBubbleProps) {
  const theme = useTheme();
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = message
      ? withSpring(1, { damping: 12, stiffness: 220 })
      : withTiming(0, { duration: 140 });
  }, [message, anim]);

  const style = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [
      { scale: 0.85 + anim.value * 0.15 },
      { translateY: (1 - anim.value) * 10 },
    ],
  }));

  const accent =
    kind === 'warning'
      ? theme.color.red
      : kind === 'reward'
      ? theme.color.brand
      : theme.color.cyan;

  return (
    <Animated.View style={[style, styles.wrap]} pointerEvents="none">
      <View
        style={{
          backgroundColor: theme.color.surface,
          borderWidth: 2,
          borderColor: accent,
          borderBottomWidth: 5,
          borderBottomColor: accent,
          borderRadius: theme.radius.xl,
          paddingVertical: theme.space.md,
          paddingHorizontal: theme.space.lg,
          maxWidth: 280,
        }}
      >
        <Text variant="body" style={{ color: accent, textAlign: 'center' }}>
          {message ?? ''}
        </Text>
      </View>
      {/* хвостик облачка — вниз, к питомцу */}
      <View style={[styles.tail, { borderTopColor: accent }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
