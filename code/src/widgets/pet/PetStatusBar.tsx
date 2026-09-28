import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { levelProgress, levelTitle } from '@/entities/pet/lib/level';
import { moodReason } from '@/entities/pet/lib/pet-stats';

/**
 * Показатели питомца и его стадия (UC-5).
 *
 * ТЗ 2.5.3 требует, чтобы основные показатели состояния были видны
 * на главном экране одновременно с балансом и целью.
 *
 * Каждый показатель передан ТРЕМЯ способами: значком, подписью-словом
 * и цифрой. Цвет полосы — четвёртый, вспомогательный. Так требует
 * ТЗ 3.6: цвет не может быть единственным носителем смысла.
 */

export type PetStatusBarProps = {
  satiety: number;
  mood: number;
  cleanliness: number;
  /** Опыт питомца: из него уровень и полоса до следующего. */
  xp: number;
};

const ROWS = [
  { key: 'satiety', icon: '🍖', title: 'сыт' },
  { key: 'mood', icon: '💛', title: 'рад' },
  { key: 'cleanliness', icon: '🫧', title: 'чист' },
] as const;

function Gauge({ value }: { value: number }) {
  const theme = useTheme();
  const steps = 5;
  const filled = Math.round((value / 100) * steps);

  // Деления фиксированной ширины: панель выезжает от края и сама
  // задаёт свой размер по содержимому. Растягивающиеся полосы
  // раздували её за пределы экрана.
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: steps }, (_, i) => (
        <View
          key={i}
          style={{
            width: 12,
            height: 12,
            backgroundColor:
              i < filled ? theme.color.brand : theme.color.border,
          }}
        />
      ))}
    </View>
  );
}

export function PetStatusBar({
  satiety,
  mood,
  cleanliness,
  xp,
}: PetStatusBarProps) {
  const theme = useTheme();
  const values: Record<string, number> = { satiety, mood, cleanliness };
  const level = levelProgress(xp);

  return (
    <PixelPanel
      ledge={5}
      style={{
        paddingVertical: theme.space.xs,
        paddingHorizontal: theme.space.sm,
        gap: theme.space.xs,
      }}
    >
      <Text variant="caption" tone="secondary">
        {`Уровень ${level.level} · ${levelTitle(level.level)}`}
      </Text>
      {/* Опыт числом «сколько из скольких», а не только полосой:
          цвет и длина не единственный носитель смысла (ТЗ 3.6). */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.xs,
        }}
      >
        <Text variant="caption">⭐</Text>
        <Text
          variant="caption"
          tone="secondary"
          style={{ width: 48 }}
          numberOfLines={1}
        >
          опыт
        </Text>
        <Gauge value={level.ratio * 100} />
      </View>
      <Text variant="caption" tone="muted">
        {`${level.into} из ${level.need}`}
      </Text>
      {ROWS.map(r => (
        <View
          key={r.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.xs,
          }}
        >
          <Text variant="caption">{r.icon}</Text>
          <Text
            variant="caption"
            tone="secondary"
            style={{ width: 48 }}
            numberOfLines={1}
          >
            {r.title}
          </Text>
          <Gauge value={values[r.key]} />
        </View>
      ))}
      <Text variant="caption" style={{ maxWidth: 180 }}>
        {moodReason({ satiety, mood, cleanliness })}
      </Text>
    </PixelPanel>
  );
}
