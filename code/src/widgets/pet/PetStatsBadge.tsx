import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';

/**
 * Показатели питомца в шапке главного экрана (ТЗ 2.5.3): сытость,
 * радость и чистота видны одновременно с балансом и копилкой,
 * без нажатия. Значок и число, а не только цвет (ТЗ 3.6); подробные
 * шкалы — во вкладке «ФИННИ», она открывается нажатием.
 */

export type PetStatsBadgeProps = {
  satiety: number;
  mood: number;
  cleanliness: number;
  onPress: () => void;
};

const STATS = [
  { key: 'satiety', icon: '🍖', title: 'сытость' },
  { key: 'mood', icon: '💛', title: 'радость' },
  { key: 'cleanliness', icon: '🫧', title: 'чистота' },
] as const;

export function PetStatsBadge({
  satiety,
  mood,
  cleanliness,
  onPress,
}: PetStatsBadgeProps) {
  const theme = useTheme();
  const values = { satiety, mood, cleanliness };

  return (
    <PixelPanel
      ledge={6}
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        // На 360 dp три значения не помещаются рядом с копилкой и
        // монетами: лишнее переносится строкой ниже, а не обрезается.
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: theme.space.sm,
        rowGap: 2,
        paddingVertical: theme.space.xs,
        paddingHorizontal: theme.space.sm,
      }}
    >
      {STATS.map(stat => (
        <View
          key={stat.key}
          accessible
          accessibilityLabel={`${stat.title} ${values[stat.key]}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        >
          <Text variant="caption">{stat.icon}</Text>
          <Text variant="caption">{String(values[stat.key])}</Text>
        </View>
      ))}
    </PixelPanel>
  );
}
