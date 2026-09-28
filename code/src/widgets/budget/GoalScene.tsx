import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { Coins } from '@/shared/ui/Coins';
import { GOALS, goalById, goalProgress } from '@/entities/scenario';
import type { GameState, GoalSpec } from '@/entities/scenario';

/**
 * Копилка: ради чего копим (UC-3).
 *
 * Цели дороже любого дневного дохода — это и есть предел из ТЗ 2.2
 * «за один игровой период нельзя купить все сразу». Игрушка в магазине
 * достижима за день, цель — нет, и разницу видно по полосе.
 *
 * Снятие не запрещаем и не стыдим: показываем, на сколько дней цель
 * отодвинется, и оставляем решение ребёнку (ТЗ 2.5.7).
 */

export type GoalSceneProps = {
  state: GameState;
  onChoose: (goalId: string) => void;
  /** Забрать накопленную цель. */
  onClaim: (goalId: string) => void;
  onWithdraw: (amount: number) => void;
  onClose: () => void;
};

function ProgressBar({ ratio }: { ratio: number }) {
  const theme = useTheme();
  const steps = 14;
  const filled = Math.round(ratio * steps);

  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: steps }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 16,
            backgroundColor: i < filled ? theme.color.coin : theme.color.border,
          }}
        />
      ))}
    </View>
  );
}

function GoalCard({
  goal,
  state,
  selected,
  onPress,
}: {
  goal: GoalSpec;
  state: GameState;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const p = goalProgress({
    goal,
    savings: state.savings,
    history: state.savingsHistory,
  });
  const owned = state.goalsAchieved.includes(goal.id);

  return (
    <PixelPanel
      ledge={selected ? 8 : 6}
      onPress={onPress}
      color={selected ? theme.color.brandSoft : theme.color.surface}
      ledgeColor={selected ? theme.color.brandShadow : theme.color.border}
      style={{ gap: theme.space.xs }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
        }}
      >
        <Image
          source={goal.image}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text variant="button">{goal.title}</Text>
          <Text variant="caption" tone="secondary">
            {goal.why}
          </Text>
        </View>
        {owned ? (
          <Text variant="caption" tone="secondary">
            уже есть
          </Text>
        ) : (
          <Text variant="title" tone="coin">
            {goal.price}
          </Text>
        )}
      </View>

      {selected ? (
        <>
          <ProgressBar ratio={p.ratio} />
          <Text variant="caption" tone="secondary">
            {p.reached
              ? 'накоплено — можно забирать!'
              : `накоплено ${p.saved} из ${goal.price}, осталось ${p.left}`}
          </Text>
          {/* Срок показываем, только когда есть от чего считать. */}
          {!p.reached && p.etaDays !== null ? (
            <Text variant="caption" tone="secondary">
              кладёшь примерно по {Math.max(1, Math.round(p.left / p.etaDays))}{' '}
              в день — это около {p.etaDays} дн.
            </Text>
          ) : null}
          {!p.reached && p.etaDays === null ? (
            <Text variant="caption" tone="muted">
              отложи хоть раз — и я посчитаю, сколько ждать
            </Text>
          ) : null}
        </>
      ) : null}
    </PixelPanel>
  );
}

export function GoalScene({
  state,
  onChoose,
  onClaim,
  onWithdraw,
  onClose,
}: GoalSceneProps) {
  const theme = useTheme();
  const [withdrawing, setWithdrawing] = useState(false);

  const current = state.goalId ? goalById(state.goalId) : undefined;

  /** Срок до цели сейчас и каким он станет, если забрать всё. */
  const beforeWithdraw = current
    ? goalProgress({
        goal: current,
        savings: state.savings,
        history: state.savingsHistory,
      }).etaDays
    : null;
  const afterWithdraw = current
    ? goalProgress({ goal: current, savings: 0, history: state.savingsHistory })
    : { etaDays: null };

  return (
    <SceneFrame title="КОПИЛКА" onBack={onClose}>
      <View style={{ gap: theme.space.sm }}>
        <PixelPanel
          ledge={6}
          color={theme.color.coin}
          ledgeColor={theme.color.coinShadow}
          style={{ alignItems: 'center' }}
        >
          <Coins
            amount={state.savings}
            variant="title"
            color={theme.color.text.primary}
          />
          <Text variant="caption" style={{ color: theme.color.text.primary }}>
            отложено
          </Text>
        </PixelPanel>

        {GOALS.map(g => (
          <GoalCard
            key={g.id}
            goal={g}
            state={state}
            selected={g.id === state.goalId}
            onPress={() => onChoose(g.id)}
          />
        ))}

        {/*
          Ради этой кнопки копилка и существует. Без неё полоса
          заполняется — и ничего не происходит, а накопление остаётся
          абстракцией.
        */}
        {current && state.savings >= current.price ? (
          <PixelPanel
            ledge={8}
            onPress={() => onClaim(current.id)}
            color={theme.color.coin}
            ledgeColor={theme.color.coinShadow}
            style={{ alignItems: 'center', gap: theme.space.xs }}
          >
            <Text variant="button" style={{ color: theme.color.text.primary }}>
              ЗАБРАТЬ: {current.title}
            </Text>
            <Text variant="caption" style={{ color: theme.color.text.primary }}>
              ты копил и накопил — питомец обрадуется
            </Text>
          </PixelPanel>
        ) : null}

        {/* Взять из копилки можно, но с показанной ценой решения. */}
        {state.savings > 0 && current ? (
          withdrawing ? (
            <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
              <Text variant="body">Взять {state.savings} обратно?</Text>
              {/* Числами, а не словами: ТЗ 2.5.7 требует показать ДО
                  подтверждения, какой станет накопленная сумма и как
                  изменится срок. «Копить придётся заново» этого не
                  говорит — ребёнок не видит цену своего решения. */}
              <Text variant="caption" tone="secondary">
                В копилке станет 0 из {current.price} — сейчас {state.savings}.
              </Text>
              {afterWithdraw.etaDays !== null && beforeWithdraw !== null ? (
                <Text variant="caption" tone="secondary">
                  {current.title}: было около {beforeWithdraw} дн., станет около{' '}
                  {afterWithdraw.etaDays} дн.
                </Text>
              ) : (
                <Text variant="caption" tone="secondary">
                  {current.title} отодвинется — копить придётся заново.
                </Text>
              )}
              <PixelPanel
                ledge={6}
                onPress={() => {
                  onWithdraw(state.savings);
                  setWithdrawing(false);
                }}
                color={theme.color.red}
                ledgeColor={theme.color.redShadow}
                style={{ alignItems: 'center' }}
              >
                <Text variant="button" tone="onColor">
                  ДА, ВЗЯТЬ
                </Text>
              </PixelPanel>
              <PixelPanel
                ledge={6}
                onPress={() => setWithdrawing(false)}
                color={theme.color.surfaceElevated}
                style={{ alignItems: 'center' }}
              >
                <Text variant="button">ОСТАВИТЬ В КОПИЛКЕ</Text>
              </PixelPanel>
            </PixelPanel>
          ) : (
            <PixelPanel
              ledge={6}
              onPress={() => setWithdrawing(true)}
              color={theme.color.surfaceElevated}
              style={{ alignItems: 'center' }}
            >
              <Text variant="caption" tone="secondary">
                взять из копилки
              </Text>
            </PixelPanel>
          )
        ) : null}
      </View>
    </SceneFrame>
  );
}
