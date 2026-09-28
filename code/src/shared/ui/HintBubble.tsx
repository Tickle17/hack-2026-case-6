import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';

/**
 * Плашка подсказки.
 *
 * Указателя здесь нет намеренно: на нужную кнопку показывает лапка
 * (`HintPaw`), которая стоит вплотную к ней. Треугольник у плашки
 * дублировал бы её и показывал бы «куда-то вниз», а не на кнопку.
 *
 * Не перехватывает касания: подсказка не должна мешать сделать то,
 * к чему она зовёт.
 */

export type HintBubbleProps = {
  text: string;
};

export function HintBubble({ text }: HintBubbleProps) {
  const theme = useTheme();

  return (
    <View pointerEvents="none" style={{ alignItems: 'center' }}>
      <PixelPanel
        ledge={5}
        color={theme.color.brandSoft}
        ledgeColor={theme.color.brandShadow}
        style={{
          paddingVertical: theme.space.sm,
          paddingHorizontal: theme.space.md,
        }}
      >
        <Text variant="caption" style={{ textAlign: 'center' }}>
          {text}
        </Text>
      </PixelPanel>
    </View>
  );
}
