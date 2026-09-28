import React from 'react';
import {
  View,
  Pressable,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/shared/theme';

/**
 * Chunky-карточка Duolingo: заметный бордер + утолщённая нижняя грань.
 * Никаких теней-блюров — объём делает только уступ.
 */
export type CardProps = ViewProps & {
  onPress?: () => void;
  ledge?: number;
  ledgeColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  onPress,
  ledge = 5,
  ledgeColor,
  style,
  ...rest
}: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 2,
    borderColor: theme.color.border,
    borderBottomColor: ledgeColor ?? theme.color.border,
    borderBottomWidth: ledge,
    padding: theme.space.lg,
    gap: theme.space.sm,
  };

  if (!onPress) {
    return <View style={[base, style]} {...rest} />;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        base,
        {
          borderBottomWidth: pressed ? 2 : ledge,
          // Компенсируем уменьшение грани, чтобы соседние карточки не прыгали.
          marginBottom: pressed ? ledge - 2 : 0,
          transform: [{ translateY: pressed ? 3 : 0 }],
        },
        style,
      ]}
      {...rest}
    />
  );
}
