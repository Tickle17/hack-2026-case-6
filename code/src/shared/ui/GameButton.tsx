import React, { useCallback, useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from './Text';

/**
 * Фирменная кнопка в стиле Duolingo: сплошная заливка + нижний тёмный уступ,
 * вдавливание при нажатии.
 *
 * Уступ собран двумя слоями (тёмная подложка + «крышка» с нижним отступом),
 * а НЕ через borderBottomWidth: на Android асимметричный бордер вместе с
 * borderRadius даёт диагональные артефакты по нижним углам.
 *
 * Правило экрана: ровно одна solid-кнопка как главное действие,
 * остальные — outline/ghost.
 */

export type GameButtonProps = {
  label: string;
  emoji?: string;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'lg' | 'md';
  color?: string;
  shadow?: string;
  price?: number;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Обязателен при disabled: ребёнок должен узнать причину, а не упереться. */
  disabledReason?: string;
  onPress: () => void;
  onBlocked?: (reason: string) => void;
};

const DEBOUNCE_MS = 400;

const SIZES = {
  lg: { height: 56, ledge: 4 },
  md: { height: 48, ledge: 4 },
} as const;

export function GameButton({
  label,
  emoji,
  variant = 'solid',
  size = 'lg',
  color,
  shadow,
  price,
  fullWidth = true,
  disabled,
  disabledReason,
  onPress,
  onBlocked,
}: GameButtonProps) {
  const theme = useTheme();
  const lastPress = useRef(0);
  const s = SIZES[size];

  if (disabled && !disabledReason) {
    throw new Error(
      `GameButton "${label}": disabled без disabledReason запрещён`,
    );
  }

  const handlePress = useCallback(() => {
    if (disabled) {
      onBlocked?.(disabledReason ?? '');
      return;
    }
    const now = Date.now();
    if (now - lastPress.current < DEBOUNCE_MS) {
      return;
    }
    lastPress.current = now;
    onPress();
  }, [disabled, disabledReason, onBlocked, onPress]);

  const base = color ?? theme.color.brand;
  const ledgeColor = shadow ?? theme.color.brandShadow;

  const face =
    variant === 'solid'
      ? base
      : variant === 'outline'
      ? theme.color.surface
      : 'transparent';
  const outer =
    variant === 'solid'
      ? ledgeColor
      : variant === 'outline'
      ? theme.color.border
      : 'transparent';
  const fg = variant === 'solid' ? theme.color.text.onColor : base;
  const ledge = variant === 'ghost' ? 0 : s.ledge;
  const frame = variant === 'outline' ? 2 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={handlePress}
      style={[
        styles.outer,
        {
          height: s.height,
          borderRadius: theme.radius.lg,
          backgroundColor: outer,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
    >
      {({ pressed }) => {
        const down = pressed && !disabled;
        return (
          <View
            style={[
              styles.face,
              {
                backgroundColor: face,
                borderRadius: theme.radius.lg,
                paddingTop: down ? frame + 2 : frame,
                paddingHorizontal: frame,
                marginBottom: down ? Math.max(0, ledge - 2) : ledge,
              },
            ]}
          >
            <View
              style={[
                styles.inner,
                { paddingHorizontal: theme.space.lg, gap: theme.space.sm },
              ]}
            >
              {emoji ? (
                <Text variant="button" style={{ color: fg }}>
                  {emoji}
                </Text>
              ) : null}
              <Text
                variant="button"
                style={[styles.label, { color: fg }]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {price !== undefined ? (
                <View style={[styles.price, { gap: 3 }]}>
                  <Text
                    variant="button"
                    style={{
                      color: variant === 'solid' ? fg : theme.color.coin,
                    }}
                  >
                    {price}
                  </Text>
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: theme.color.coin,
                      borderBottomWidth: 2,
                      borderBottomColor: theme.color.coinShadow,
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { overflow: 'hidden' },
  face: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center' },
  label: { letterSpacing: 0.5, textTransform: 'uppercase' },
  price: { flexDirection: 'row', alignItems: 'center' },
});
