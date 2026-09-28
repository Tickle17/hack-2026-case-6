import React from 'react';
import {
  View,
  Pressable,
  type AccessibilityRole,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '@/shared/theme';

/**
 * Пиксельная панель: жёсткая рамка без скруглений, объём — нижним уступом.
 * Никаких теней и градиентов (art-style.md).
 */
export type PixelPanelProps = {
  children: React.ReactNode;
  onPress?: () => void;
  color?: string;
  ledgeColor?: string;
  ledge?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Чем эта панель является для того, кто её не видит.
   *
   * Панель — безликая коробка: внутри бывает одна картинка, и тогда
   * ни программа чтения с экрана (ТЗ 3.6), ни автоматический прогон
   * не знают, на что нажимают. Текст внутри подписывать не нужно —
   * его и так прочитают.
   */
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
};

export function PixelPanel({
  children,
  onPress,
  color,
  ledgeColor,
  ledge = 8,
  style,
  accessibilityLabel,
  accessibilityRole,
}: PixelPanelProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: color ?? theme.color.surface,
    borderWidth: 4,
    borderColor: theme.color.border,
    borderBottomWidth: ledge,
    borderBottomColor: ledgeColor ?? theme.color.border,
    padding: theme.space.lg,
  };

  if (!onPress) {
    return (
      <View
        style={[base, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
      >
        {children}
      </View>
    );
  }

  /**
   * Нажимаемая панель не может быть ниже минимума из ТЗ 3.6.
   *
   * Правило живёт здесь, а не в полусотне мест вызова: панели с
   * уменьшенным отступом (кнопки в шапке, счётчики) иначе оказывались
   * бы около 30 dp, и это заметил бы только тот, кто измерил.
   *
   * Минимум и по высоте, и по ширине: узкая кнопка в шапке проходила
   * по высоте, но была 46 dp шириной — это нашлось только замером
   * иерархии через uiautomator, на глаз разницы не видно.
   *
   * Стоит ПОСЛЕ style, поэтому случайно перебить нельзя — только
   * осознанно, передав свой minHeight/minWidth ниже.
   */
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={({ pressed }) => [
        base,
        pressed && {
          borderBottomWidth: 4,
          marginBottom: ledge - 4,
          transform: [{ translateY: 4 }],
        },
        style,
        {
          minHeight: theme.touchTarget.min,
          minWidth: theme.touchTarget.min,
          justifyContent: 'center',
        },
      ]}
    >
      {children}
    </Pressable>
  );
}
