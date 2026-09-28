import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme';
import { PixelPanel } from './PixelPanel';
import { Text } from './Text';

export type ToastKind = 'info' | 'warning' | 'reward';

export type ToastProps = {
  message: string | null;
  kind?: ToastKind;
};

/**
 * Плашка обратной связи сверху экрана: снизу лежат кнопки, их закрывать нельзя.
 * Объясняет — никогда не обвиняет.
 */
export function Toast({ message, kind = 'info' }: ToastProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: message ? 1 : 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
    }).start();
  }, [message, anim]);

  const accent =
    kind === 'warning'
      ? theme.color.red
      : kind === 'reward'
      ? theme.color.brand
      : theme.color.cyan;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-24, 0],
            }),
          },
        ],
        position: 'absolute',
        left: theme.space.lg,
        right: theme.space.lg,
        top: insets.top + theme.space.sm,
      }}
    >
      <PixelPanel ledge={8} ledgeColor={accent}>
        <Text variant="body">{message ?? ''}</Text>
      </PixelPanel>
    </Animated.View>
  );
}
