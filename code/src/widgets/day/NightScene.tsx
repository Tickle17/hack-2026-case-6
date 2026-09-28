import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { petFrames } from '@/entities/pet/lib/appearance';

/**
 * Ночь между днями.
 *
 * Зачем экран. Узел «спать» вёл прямо на школьный день, и ребёнок
 * из кровати оказывался за партой без единого кадра между. Пропущены
 * были сразу три вещи: что прошла ночь, что настало утро и что день
 * начинается со школы. Этот экран отвечает на первые две, утренняя
 * мысль дома — на третью.
 *
 * Фон не рисуем: сцена комнаты остаётся под наложением и просто
 * темнеет. Отдельная ночная картинка потребовала бы своего ассета
 * на каждую комнату, а смысл «стемнело» читается и так.
 */

export type NightSceneProps = {
  /** Наступивший день — тот, который начинается. */
  day: number;
  speciesId: string | null;
  colorId: string;
  petName: string;
  onMorning: () => void;
};

const TITLE = 'НОЧЬ ПРОШЛА';
const BUTTON = 'ДОБРОЕ УТРО ▸';

export function NightScene({
  day,
  speciesId,
  colorId,
  petName,
  onMorning,
}: NightSceneProps) {
  const theme = useTheme();
  // Питомец спит рядом — тот же кадр покоя, что и в комнате.
  const frame = speciesId ? petFrames(speciesId, 'idle', colorId)[0] : null;

  return (
    <ScreenOverlay
      background="rgba(8,10,28,0.92)"
      style={{ justifyContent: 'center', padding: theme.space.lg }}
    >
      <View style={{ alignItems: 'center', gap: theme.space.md }}>
        <Text variant="display">🌙</Text>

        {frame ? (
          <Image
            source={frame as never}
            // Затемнён вместе со сценой: ночью света нет и на питомце.
            style={{ width: 140, height: 140, opacity: 0.55 }}
            resizeMode="contain"
          />
        ) : null}

        <PixelPanel
          ledge={8}
          style={{ alignItems: 'center', gap: theme.space.xs }}
        >
          <Text variant="caption" tone="secondary">
            {TITLE}
          </Text>
          <Text variant="display">ДЕНЬ {day}</Text>
          <Text variant="caption" tone="secondary">
            {petName} выспался
          </Text>
        </PixelPanel>

        <PixelPanel
          ledge={6}
          onPress={onMorning}
          color={theme.color.brand}
          ledgeColor={theme.color.brandShadow}
          style={{ alignSelf: 'stretch', alignItems: 'center' }}
        >
          <Text variant="button" tone="onColor">
            {BUTTON}
          </Text>
        </PixelPanel>
      </View>
    </ScreenOverlay>
  );
}
