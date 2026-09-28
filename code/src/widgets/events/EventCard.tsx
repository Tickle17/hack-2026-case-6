import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import type { DayEvent } from '@/entities/scenario';

/**
 * Событие дня — показывается ПЕРЕД планированием.
 *
 * Порядок важен: если рассказать о происшествии после того, как план
 * составлен, пересматривать будет нечего, и событие станет украшением.
 *
 * Подсказка говорит, что событие значит для бюджета, но НЕ говорит,
 * что делать: решение остаётся за ребёнком (критерий 8.4).
 */

export type EventCardProps = {
  event: DayEvent;
  onAck: () => void;
};

const BADGE: Record<DayEvent['kind'], string> = {
  need: 'понадобится',
  gift: 'приятность',
  discount: 'выгода',
};

export function EventCard({ event, onAck }: EventCardProps) {
  const theme = useTheme();

  return (
    <SceneFrame
      title="ЧТО СЛУЧИЛОСЬ"
      subtitle={`день ${event.day}`}
      backLabel="ПОНЯТНО"
      onBack={onAck}
    >
      <View style={{ gap: theme.space.sm }}>
        <PixelPanel
          ledge={6}
          color={
            event.kind === 'need'
              ? theme.color.surfaceElevated
              : theme.color.brandSoft
          }
          style={{ gap: theme.space.sm }}
        >
          {/* Тип события подписан словом, а не только цветом (ТЗ 3.6). */}
          <Text variant="caption" tone="secondary">
            {BADGE[event.kind]}
          </Text>
          <Text variant="title">{event.title}</Text>
          <Text variant="body">{event.text}</Text>
        </PixelPanel>

        <PixelPanel ledge={6}>
          <Text variant="caption" tone="secondary">
            {event.hint}
          </Text>
        </PixelPanel>
      </View>
    </SceneFrame>
  );
}
