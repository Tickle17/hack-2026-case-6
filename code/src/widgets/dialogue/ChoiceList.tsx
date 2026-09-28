import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { PixelSprite } from '@/shared/ui/PixelSprite';
import { petSprite } from '@/entities/pet/config/sprites';
import { petAnimation } from '@/entities/pet/config/animations';

/**
 * Варианты выбора.
 *
 * Если у вида есть настоящие спрайты — показываем первый кадр покоя.
 * Ребёнок 7 лет выбирает по картинке, а не по слову, поэтому картинка
 * должна быть той же, что он увидит в игре.
 */

export type ChoiceItem = { id: string; label: string; icon?: string };

export type ChoiceListProps = {
  prompt: string;
  options: ChoiceItem[];
  onChoose: (id: string) => void;
};

const TILE = 92;

function PetPreview({ speciesId }: { speciesId: string }) {
  const spec = petAnimation(speciesId, 'idle');

  if (spec) {
    return (
      <Image
        source={spec.frames[0]}
        resizeMode="contain"
        style={{ width: TILE, height: TILE }}
      />
    );
  }
  return <PixelSprite grid={petSprite(speciesId, 'happy')} scale={5} />;
}

export function ChoiceList({ prompt, options, onChoose }: ChoiceListProps) {
  const theme = useTheme();
  const withPets = options.some(o => o.icon);

  return (
    <View style={{ gap: theme.space.md }}>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {prompt}
      </Text>

      <View
        style={{
          flexDirection: withPets ? 'row' : 'column',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: theme.space.sm,
        }}
      >
        {options.map(option => (
          <PixelPanel
            key={option.id}
            onPress={() => onChoose(option.id)}
            style={{
              alignItems: 'center',
              minHeight: theme.touchTarget.min,
              minWidth: withPets ? 150 : undefined,
            }}
          >
            {option.icon ? <PetPreview speciesId={option.icon} /> : null}
            <Text
              variant="button"
              style={{ marginTop: option.icon ? theme.space.xs : 0 }}
            >
              {option.label}
            </Text>
          </PixelPanel>
        ))}
      </View>
    </View>
  );
}
