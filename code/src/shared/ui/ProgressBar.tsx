import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from './Text';

/**
 * Прогресс в стиле Duolingo: скруглённый трек + сплошная пилюля с узким
 * белым глянцем сверху. Без диагональных полос.
 */
export type ProgressBarProps = {
  value: number;
  max: number;
  color: string;
  label?: string;
  emoji?: string;
  height?: number;
};

export function ProgressBar({
  value,
  max,
  color,
  label,
  emoji,
  height = 18,
}: ProgressBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));

  return (
    <View style={{ gap: theme.space.xs }}>
      {label ? (
        <View style={styles.row}>
          <Text variant="caption" tone="secondary">
            {emoji ? `${emoji}  ` : ''}
            {label}
          </Text>
          <Text variant="caption" tone="secondary">
            {Math.round(value)}
          </Text>
        </View>
      ) : null}
      <View
        style={{
          height,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.surfaceElevated,
          overflow: 'hidden',
        }}
      >
        {pct > 0 ? (
          <View
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: theme.radius.pill,
              backgroundColor: color,
              overflow: 'hidden',
            }}
          >
            <View style={styles.gloss} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Фирменный глянец Duolingo — узкий блик у верхнего края пилюли
  gloss: {
    position: 'absolute',
    top: 3,
    left: 5,
    right: 5,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
