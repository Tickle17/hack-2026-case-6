import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import {
  ACHIEVEMENTS,
  GLOSSARY,
  LESSONS,
  daySummary,
  goalById,
  goalProgress,
} from '@/entities/scenario';
import type { GameState } from '@/entities/scenario';
import { levelFor, levelTitle } from '@/entities/pet/lib/level';

/**
 * «Чему научился» — прогресс и словарь (UC-10).
 *
 * ТЗ 2.5.11 требует показать завершённые задания, прогресс по цели
 * и итоги последнего периода, а также справочный раздел с терминами.
 *
 * Непройденные темы показываем серыми, а не прячем: ребёнок видит,
 * сколько ещё впереди, и это не выглядит как список его пробелов —
 * рядом нет ни оценок, ни «не сделано».
 */

export type ProgressSceneProps = {
  state: GameState;
  onClose: () => void;
};

export function ProgressScene({ state, onClose }: ProgressSceneProps) {
  const theme = useTheme();
  const [openTerm, setOpenTerm] = useState<string | null>(null);

  const goal = state.goalId ? goalById(state.goalId) : undefined;
  const progress = goal
    ? goalProgress({
        goal,
        savings: state.savings,
        history: state.savingsHistory,
      })
    : null;
  const summary = daySummary(state);
  const level = levelFor(state.xp);

  return (
    <SceneFrame
      title="ЧЕМУ НАУЧИЛСЯ"
      subtitle="что уже пройдено"
      onBack={onClose}
    >
      <View style={{ gap: theme.space.sm }}>
        <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
          <Text variant="button">Питомец</Text>
          <Text variant="caption" tone="secondary">
            {state.petName} · уровень {level}, {levelTitle(level).toLowerCase()}{' '}
            · день {state.day}
          </Text>
        </PixelPanel>

        {/* Темы: пройденные отмечены галочкой, остальные просто ждут */}
        <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
          <Text variant="button">
            Темы · {state.lessonsDone.length} из {LESSONS.length}
          </Text>
          {LESSONS.map(l => {
            const done = state.lessonsDone.includes(l.id);
            return (
              <Text
                key={l.id}
                variant="caption"
                tone={done ? 'secondary' : 'muted'}
              >
                {done ? '☑' : '☐'} {l.title}
              </Text>
            );
          })}
        </PixelPanel>

        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">
            Значки · {state.achievements.length} из {ACHIEVEMENTS.length}
          </Text>
          {ACHIEVEMENTS.map(achievement => {
            const earned = state.achievements.includes(achievement.id);
            return (
              <View
                key={achievement.id}
                style={{
                  flexDirection: 'row',
                  gap: theme.space.sm,
                  opacity: earned ? 1 : 0.45,
                }}
              >
                <Text variant="body">{achievement.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="caption">
                    {earned
                      ? achievement.title
                      : `${achievement.title} · ещё впереди`}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {achievement.how}
                  </Text>
                </View>
              </View>
            );
          })}
        </PixelPanel>

        {/* Цель */}
        {goal && progress ? (
          <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.sm,
              }}
            >
              <Image
                source={goal.image}
                style={{ width: 48, height: 48 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text variant="button">{goal.title}</Text>
                <Text variant="caption" tone="secondary">
                  {progress.reached
                    ? 'накоплено!'
                    : `${progress.saved} из ${goal.price}, осталось ${progress.left}`}
                </Text>
              </View>
            </View>
          </PixelPanel>
        ) : (
          <PixelPanel ledge={6}>
            <Text variant="caption" tone="secondary">
              Цель ещё не выбрана — загляни в копилку.
            </Text>
          </PixelPanel>
        )}

        {/* Итог последнего дня */}
        {/* Итог прошлого дня остаётся и после ночи (ТЗ 2.5.11). */}
        {state.yesterday ? (
          <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
            <Text variant="button">{`Вчера, день ${state.yesterday.day}`}</Text>
            {(['must', 'want', 'save'] as const).map(id => (
              <Text key={id} variant="caption" tone="secondary">
                {`${
                  id === 'must'
                    ? 'обязательное'
                    : id === 'want'
                    ? 'развлечения'
                    : 'копилка'
                }: планировал ${state.yesterday![id].planned}, ${
                  id === 'save' ? 'отложил' : 'потратил'
                } ${state.yesterday![id].actual}`}
              </Text>
            ))}
          </PixelPanel>
        ) : null}

        {summary ? (
          <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
            <Text variant="button">Сегодня</Text>
            {summary.lines.map(l => (
              <Text key={l.id} variant="caption" tone="secondary">
                {l.id === 'must'
                  ? 'обязательное'
                  : l.id === 'want'
                  ? 'развлечения'
                  : 'копилка'}
                {`: планировал ${l.planned}, ${
                  l.id === 'save' ? 'отложил' : 'потратил'
                } ${l.actual}`}
              </Text>
            ))}
          </PixelPanel>
        ) : null}

        {/* Словарь: значение раскрывается по нажатию, чтобы список
            оставался обозримым */}
        <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
          <Text variant="button">Что значат слова</Text>
          {GLOSSARY.map(t => {
            const open = openTerm === t.id;
            return (
              <PixelPanel
                key={t.id}
                ledge={4}
                onPress={() => setOpenTerm(open ? null : t.id)}
                color={
                  open ? theme.color.brandSoft : theme.color.surfaceElevated
                }
                style={{
                  gap: theme.space.xs,
                  minHeight: theme.touchTarget.min,
                }}
              >
                <Text variant="caption">{t.title}</Text>
                {open ? (
                  <>
                    <Text variant="caption" tone="secondary">
                      {t.meaning}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {t.example}
                    </Text>
                  </>
                ) : null}
              </PixelPanel>
            );
          })}
        </PixelPanel>
      </View>
    </SceneFrame>
  );
}
