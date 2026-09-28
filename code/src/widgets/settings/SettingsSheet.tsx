import React, { useState } from 'react';
import { View, Image, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { petAnimation } from '@/entities/pet/config/animations';
import { SPECIES } from '@/entities/pet/config/species';

/**
 * Настройки: сменить питомца и начать заново.
 *
 * Сброс — единственное необратимое действие в игре, поэтому он закрыт
 * подтверждением (docs/ui-kit.md: «ConfirmDialog обязателен перед любым
 * действием, которое ребёнок не сможет отменить»). Смена питомца обратима,
 * её подтверждать не нужно — лишний вопрос учит игнорировать вопросы.
 *
 * Подтверждение построено так, чтобы случайный двойной тап не сбросил
 * прогресс: кнопки разнесены, а опасная не стоит на месте безопасной.
 */

export type SettingsSheetProps = {
  currentSpeciesId: string | null;
  onChangeSpecies: (speciesId: string) => void;
  onReset: () => void;
  onClose: () => void;
};

function PetTile({
  speciesId,
  selected,
  onPress,
}: {
  speciesId: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const spec = petAnimation(speciesId, 'idle');
  const species = SPECIES.find(s => s.id === speciesId);

  return (
    <PixelPanel
      onPress={onPress}
      ledge={selected ? 8 : 5}
      color={selected ? theme.color.brandSoft : theme.color.surface}
      ledgeColor={selected ? theme.color.brandShadow : theme.color.border}
      style={{ alignItems: 'center', padding: theme.space.sm, minWidth: 132 }}
    >
      {spec ? (
        <Image
          source={spec.frames[0]}
          style={{ width: 84, height: 84 }}
          resizeMode="contain"
        />
      ) : null}
      <Text variant="caption">{species?.name ?? speciesId}</Text>
    </PixelPanel>
  );
}

export function SettingsSheet({
  currentSpeciesId,
  onChangeSpecies,
  onReset,
  onClose,
}: SettingsSheetProps) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);

  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.9)"
      style={{ justifyContent: 'center', padding: theme.space.lg }}
    >
      <ScrollView contentContainerStyle={{ gap: theme.space.lg }}>
        <PixelPanel ledge={6}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            НАСТРОЙКИ
          </Text>
        </PixelPanel>

        {/* смена питомца */}
        <PixelPanel ledge={6} style={{ gap: theme.space.md }}>
          <Text variant="body">Питомец</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: theme.space.sm,
            }}
          >
            {SPECIES.map(s => (
              <PetTile
                key={s.id}
                speciesId={s.id}
                selected={s.id === currentSpeciesId}
                onPress={() => onChangeSpecies(s.id)}
              />
            ))}
          </View>
        </PixelPanel>

        {/* сброс */}
        <PixelPanel ledge={6} style={{ gap: theme.space.md }}>
          {confirming ? (
            <>
              <Text variant="body" style={{ textAlign: 'center' }}>
                Вы уверены? Всё начнётся заново.
              </Text>
              <View style={{ gap: theme.space.sm }}>
                <PixelPanel
                  onPress={() => setConfirming(false)}
                  ledge={6}
                  color={theme.color.brand}
                  ledgeColor={theme.color.brandShadow}
                  style={{ alignItems: 'center' }}
                >
                  <Text variant="button" tone="onColor">
                    НЕТ, ОСТАВИТЬ
                  </Text>
                </PixelPanel>
                <PixelPanel
                  onPress={onReset}
                  ledge={6}
                  color={theme.color.red}
                  ledgeColor={theme.color.redShadow}
                  style={{ alignItems: 'center' }}
                >
                  <Text variant="button" tone="onColor">
                    ДА, НАЧАТЬ ЗАНОВО
                  </Text>
                </PixelPanel>
              </View>
            </>
          ) : (
            <PixelPanel
              onPress={() => setConfirming(true)}
              ledge={6}
              color={theme.color.surfaceElevated}
              style={{ alignItems: 'center' }}
            >
              <Text variant="button">СБРОСИТЬ</Text>
            </PixelPanel>
          )}
        </PixelPanel>

        <Pressable onPress={onClose}>
          <PixelPanel ledge={6} style={{ alignItems: 'center' }}>
            <Text variant="button">ЗАКРЫТЬ</Text>
          </PixelPanel>
        </Pressable>
      </ScrollView>
    </ScreenOverlay>
  );
}
