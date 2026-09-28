import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';

/**
 * Панель демонстрационного режима.
 *
 * ТЗ 2.5.13 требует проходить периоды без ожидания, поэтому кнопки
 * нужны прямо в игре. Но это ИНСТРУМЕНТ ПРИЁМКИ, а не часть игры:
 * широкая яркая плашка поперёк комнаты резала сцену пополам
 * и закрывала персонажей.
 *
 * Поэтому панель компактная и прижата к краю: заметная настолько,
 * чтобы её не спутать с игровым интерфейсом, и не настолько,
 * чтобы мешать смотреть на происходящее.
 */

export type DemoPanelProps = {
  day: number;
  onSkipDay: () => void;
  onReset: () => void;
  onExit: () => void;
};

function Key({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PixelPanel
      ledge={3}
      onPress={onPress}
      style={{
        paddingVertical: theme.space.xs,
        paddingHorizontal: theme.space.sm,
        minWidth: theme.touchTarget.min,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </PixelPanel>
  );
}

export function DemoPanel({ day, onSkipDay, onReset, onExit }: DemoPanelProps) {
  const theme = useTheme();
  /** Сброс стирает профиль — второе нажатие подтверждает (ТЗ 3.6). */
  const [confirming, setConfirming] = useState(false);

  return (
    <PixelPanel
      ledge={3}
      color={theme.color.cyan}
      ledgeColor={theme.color.cyanShadow}
      style={{
        // Ширина по содержимому, а не во весь экран.
        alignSelf: 'flex-start',
        padding: theme.space.xs,
        gap: theme.space.xs,
      }}
    >
      <Text variant="caption" tone="onColor">
        ДЕМО · {day}
      </Text>
      {/* Столбиком, а не в ряд: три кнопки рядом давали панель шириной
          280 dp — она занимала пол-экрана и не давала поставить обе
          вкладки на один уровень. */}
      <View style={{ gap: theme.space.xs }}>
        <Key label="ДЕНЬ ▸" onPress={onSkipDay} />
        {confirming ? (
          <>
            <Text variant="caption" tone="onColor">
              Стереть всё?
            </Text>
            <Key label="ДА" onPress={onReset} />
            <Key label="НЕТ" onPress={() => setConfirming(false)} />
          </>
        ) : (
          <Key label="СБРОС" onPress={() => setConfirming(true)} />
        )}
        <Key label="ВЫЙТИ" onPress={onExit} />
      </View>
    </PixelPanel>
  );
}
