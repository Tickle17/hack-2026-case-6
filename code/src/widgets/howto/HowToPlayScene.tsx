import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { GameButton } from '@/shared/ui/GameButton';
import type { HowToSection } from '@/entities/scenario';

export type HowToPlaySceneProps = {
  sections: HowToSection[];
  hintsOn: boolean;
  onTurnHintsOn: () => void;
  onClose: () => void;
};

export function HowToPlayScene({
  sections,
  hintsOn,
  onTurnHintsOn,
  onClose,
}: HowToPlaySceneProps) {
  const theme = useTheme();

  return (
    <SceneFrame
      title="КАК ИГРАТЬ"
      subtitle="три решения и день"
      onBack={onClose}
    >
      <View style={{ gap: theme.space.sm }}>
        {sections.map(section => (
          <PixelPanel
            key={section.title}
            ledge={6}
            style={{ gap: theme.space.xs }}
          >
            <Text variant="button">{section.title}</Text>
            {section.lines.map(line => (
              <Text key={line} variant="caption" tone="secondary">
                {line}
              </Text>
            ))}
          </PixelPanel>
        ))}

        <GameButton
          label={hintsOn ? 'Подсказки включены' : 'Включить подсказки'}
          variant="outline"
          size="md"
          disabled={hintsOn}
          disabledReason="подсказки уже включены"
          onPress={onTurnHintsOn}
        />
      </View>
    </SceneFrame>
  );
}
