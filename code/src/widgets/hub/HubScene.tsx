import React from 'react';
import { View, Image, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { DIRECTIONS } from '@/entities/scenario';

/**
 * Узел навигации: всё, куда можно пойти с главного экрана (UC-6).
 *
 * ТЗ 2.5.3 перечисляет шесть разделов, доступных с главного экрана.
 * Плитки крупные и подписаны словом: ребёнок 7–11 лет разбирает
 * подпись быстрее, чем незнакомый значок.
 *
 * Недоступный раздел не прячем, а показываем приглушённым с причиной.
 * Исчезнувшая плитка выглядит как поломка; объяснённая — как правило игры.
 */

export type HubSection =
  | 'plan'
  | 'tasks'
  | 'shop'
  | 'savings'
  | 'ledger'
  | 'howto'
  | 'pet'
  | 'progress'
  | 'adult';

export type HubTile = {
  id: HubSection;
  title: string;
  hint: string;
  image?: ImageSourcePropType;
  emoji?: string;
  /** Почему сейчас нельзя; undefined — можно. */
  disabledReason?: string;
};

export type HubSceneProps = {
  tiles: HubTile[];
  onOpen: (section: HubSection) => void;
  onBack: () => void;
};

function Tile({ tile, onPress }: { tile: HubTile; onPress: () => void }) {
  const theme = useTheme();
  const off = Boolean(tile.disabledReason);

  return (
    <PixelPanel
      ledge={6}
      onPress={off ? undefined : onPress}
      color={off ? theme.color.surfaceElevated : theme.color.surface}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        opacity: off ? 0.6 : 1,
        // Плитка заведомо выше минимума 48 dp из ТЗ 3.6.
        minHeight: 72,
      }}
    >
      {tile.image ? (
        <Image
          source={tile.image}
          style={{ width: 44, height: 44 }}
          resizeMode="contain"
        />
      ) : (
        <Text variant="title">{tile.emoji}</Text>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="button" tone={off ? 'muted' : 'primary'}>
          {tile.title}
        </Text>
        <Text variant="caption" tone={off ? 'muted' : 'secondary'}>
          {tile.disabledReason ?? tile.hint}
        </Text>
      </View>
    </PixelPanel>
  );
}

export function HubScene({ tiles, onOpen, onBack }: HubSceneProps) {
  const theme = useTheme();

  return (
    <SceneFrame
      title="КУДА ПОЙДЁМ"
      subtitle="выбери, что хочешь посмотреть"
      onBack={onBack}
    >
      <View style={{ gap: theme.space.sm }}>
        {tiles.map(t => (
          <Tile key={t.id} tile={t} onPress={() => onOpen(t.id)} />
        ))}
      </View>
    </SceneFrame>
  );
}

/** Значки переиспользуем те же, что в плане: один образ — один смысл. */
export const HUB_ICONS = {
  plan: DIRECTIONS.find(d => d.id === 'must')!.image,
  savings: DIRECTIONS.find(d => d.id === 'save')!.image,
};
