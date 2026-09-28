import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { Coins } from '@/shared/ui/Coins';
import { DIRECTIONS, goalById } from '@/entities/scenario';
import type { GameState } from '@/entities/scenario';

/**
 * Утверждённый план дня — только посмотреть. Менять его днём нельзя:
 * иначе вечером сравнивать было бы не с чем.
 */

export type PlanViewProps = {
  state: GameState;
  onClose: () => void;
};

export function PlanView({ state, onClose }: PlanViewProps) {
  const theme = useTheme();
  const plan = state.planBaseline ?? state.plan;
  const goal = state.goalId ? goalById(state.goalId) : undefined;

  return (
    <SceneFrame
      title="ПЛАН НА ДЕНЬ"
      onBack={onClose}
      footer={
        <PixelPanel ledge={6} color={theme.color.surfaceElevated}>
          <Text
            variant="caption"
            tone="secondary"
            style={{ textAlign: 'center' }}
          >
            План на сегодня уже составлен, завтра можно поставить новый план
          </Text>
        </PixelPanel>
      }
    >
      <View style={{ gap: theme.space.sm }}>
        {plan
          ? DIRECTIONS.map(direction => (
              <PixelPanel
                key={direction.id}
                ledge={6}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space.sm,
                }}
              >
                <Image
                  source={direction.image}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text variant="button">{direction.title}</Text>
                  {direction.id === 'save' ? (
                    <Text variant="caption" tone="secondary">
                      {goal ? `на ${goal.title.toLowerCase()}` : direction.hint}
                    </Text>
                  ) : (
                    <Text variant="caption" tone="secondary">
                      {`планировал ${plan[direction.id]} · потратил ${
                        state.spent[direction.id]
                      }`}
                    </Text>
                  )}
                </View>
                <Coins amount={plan[direction.id]} variant="title" />
              </PixelPanel>
            ))
          : null}
      </View>
    </SceneFrame>
  );
}
