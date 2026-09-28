import React, { useMemo, useState } from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import {
  makeGateProblem,
  checkGate,
  adultSummary,
  PARENT_BONUS,
  parentBonusGivenToday,
} from '@/entities/scenario';
import type { GameState } from '@/entities/scenario';

/**
 * Раздел для взрослого (UC-7).
 *
 * Вход закрыт арифметическим примером — ТЗ 2.5.12 допускает «простой
 * барьер», и умножение двузначного на однозначное как раз не по силам
 * устному счёту ребёнка 7–11 лет, но не мешает взрослому.
 *
 * Внутри — ЧЕМУ учится ребёнок и где он сейчас, без оценок его
 * успеваемости. Отчёт «справляется / не справляется» превратил бы
 * игру в источник давления, что прямо запрещено.
 *
 * Здесь же живут сброс и удаление данных: ТЗ 3.5 требует, чтобы они
 * были доступны взрослому и не требовали обращения к разработчику.
 */

export type AdultSceneProps = {
  state: GameState;
  onReset: () => void;
  /** Включить демонстрационный режим для приёмки (ТЗ 2.5.13). */
  onStartDemo: () => void;
  /** Выключить анимации — требование доступности ТЗ 3.6. */
  onToggleMotion: () => void;
  onGrantBonus: () => void;
  onClose: () => void;
};

function Gate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const theme = useTheme();
  const problem = useMemo(() => makeGateProblem(), []);
  const [given, setGiven] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = (): void => {
    if (checkGate(problem, Number(given))) {
      onPass();
    } else {
      setWrong(true);
    }
  };

  return (
    <SceneFrame
      title="ДЛЯ ВЗРОСЛОГО"
      subtitle="этот раздел не для ребёнка"
      backLabel="ВЕРНУТЬСЯ В ИГРУ"
      onBack={onBack}
    >
      <PixelPanel ledge={6} style={{ gap: theme.space.md }}>
        <Text variant="body">Чтобы войти, решите пример:</Text>
        <Text variant="display" style={{ textAlign: 'center' }}>
          {problem.a} × {problem.b} = ?
        </Text>

        <TextInput
          value={given}
          onChangeText={t => {
            setGiven(t.replace(/[^0-9]/g, ''));
            setWrong(false);
          }}
          keyboardType="number-pad"
          placeholder="ответ"
          placeholderTextColor={theme.color.text.muted}
          style={{
            borderWidth: 3,
            borderColor: wrong ? theme.color.red : theme.color.border,
            backgroundColor: theme.color.surface,
            color: theme.color.text.primary,
            fontSize: 24,
            textAlign: 'center',
            paddingVertical: theme.space.sm,
            minHeight: theme.touchTarget.min,
          }}
        />

        {wrong ? (
          <Text variant="caption" tone="danger">
            Не сходится — попробуйте ещё раз.
          </Text>
        ) : null}

        <PixelPanel
          ledge={6}
          onPress={submit}
          color={theme.color.brand}
          ledgeColor={theme.color.brandShadow}
          style={{ alignItems: 'center' }}
        >
          <Text variant="button" tone="onColor">
            ВОЙТИ
          </Text>
        </PixelPanel>
      </PixelPanel>
    </SceneFrame>
  );
}

function Inside({
  state,
  onReset,
  onStartDemo,
  onToggleMotion,
  onGrantBonus,
  onClose,
}: {
  state: GameState;
  onReset: () => void;
  onStartDemo: () => void;
  onToggleMotion: () => void;
  onGrantBonus: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const summary = adultSummary(state);
  const [confirming, setConfirming] = useState(false);

  return (
    <SceneFrame
      title="ДЛЯ ВЗРОСЛОГО"
      subtitle="чему учит игра"
      onBack={onClose}
    >
      <View style={{ gap: theme.space.sm }}>
        <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
          <Text variant="button">Чему учит игра</Text>
          {summary.goals.map(g => (
            <Text key={g} variant="caption" tone="secondary">
              • {g}
            </Text>
          ))}
        </PixelPanel>

        <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
          <Text variant="button">Пройденные темы</Text>
          {summary.topics.length ? (
            summary.topics.map(t => (
              <Text key={t} variant="caption" tone="secondary">
                • {t}
              </Text>
            ))
          ) : (
            <Text variant="caption" tone="secondary">
              Пока ни одной — они открываются по ходу игры.
            </Text>
          )}
        </PixelPanel>

        <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
          <Text variant="button">Где ребёнок сейчас</Text>
          <Text variant="caption" tone="secondary">
            День {summary.progress.days} · питомец: {summary.progress.stage}
          </Text>
          <Text variant="caption" tone="secondary">
            Отложено {summary.progress.savings} ·{' '}
            {summary.progress.goalChosen
              ? 'цель выбрана'
              : 'цель ещё не выбрана'}
          </Text>
        </PixelPanel>

        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">Бонус за помощь дома</Text>
          <Text variant="caption" tone="secondary">
            Монеты придут в кошелёк с подписью «{PARENT_BONUS.reason}» и будут
            видны в «Истории монет». Не чаще раза в игровой день.
          </Text>
          {parentBonusGivenToday(state) ? (
            <Text variant="caption">Сегодня бонус уже начислен.</Text>
          ) : (
            <PixelPanel
              ledge={6}
              onPress={onGrantBonus}
              color={theme.color.amber}
              ledgeColor={theme.color.amberShadow}
              style={{ alignItems: 'center' }}
            >
              <Text variant="button">{`+${PARENT_BONUS.amount} МОНЕТ`}</Text>
            </PixelPanel>
          )}
        </PixelPanel>

        <PixelPanel ledge={6}>
          <Text variant="caption" tone="secondary">
            {summary.note}
          </Text>
        </PixelPanel>

        {/* Доступность — ТЗ 3.6. */}
        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">Как удобнее ребёнку</Text>
          <Text variant="caption" tone="secondary">
            Движение на экране мешает не всем одинаково. Если ребёнку трудно
            сосредоточиться — выключите анимации.
          </Text>
          <PixelPanel
            ledge={6}
            onPress={onToggleMotion}
            color={
              state.reduceMotion
                ? theme.color.brand
                : theme.color.surfaceElevated
            }
            ledgeColor={
              state.reduceMotion ? theme.color.brandShadow : theme.color.border
            }
            style={{ alignItems: 'center' }}
          >
            <Text
              variant="button"
              tone={state.reduceMotion ? 'onColor' : 'primary'}
            >
              {state.reduceMotion ? 'АНИМАЦИИ ВЫКЛЮЧЕНЫ' : 'ВЫКЛЮЧИТЬ АНИМАЦИИ'}
            </Text>
          </PixelPanel>
        </PixelPanel>

        {/* Демонстрационный режим для экспертной проверки — ТЗ 2.5.13. */}
        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">Демонстрационный режим</Text>
          <Text variant="caption" tone="secondary">
            Для проверки: кнопка «ДЕНЬ ▸» проживает игровой день сразу, без
            ожидания. Здесь дни пролистываются в профиле ребёнка — его прогресс
            продвинется. Чистый тестовый профиль — кнопка «Демо» на главном
            экране.
          </Text>
          <PixelPanel
            ledge={6}
            onPress={onStartDemo}
            color={theme.color.cyan}
            ledgeColor={theme.color.cyanShadow}
            style={{ alignItems: 'center' }}
          >
            <Text variant="button" tone="onColor">
              {state.demoMode ? 'ВЫКЛЮЧИТЬ ДЕМО' : 'ВКЛЮЧИТЬ ДЕМО'}
            </Text>
          </PixelPanel>
        </PixelPanel>

        {/* Сброс и удаление данных — ТЗ 3.5, доступны без разработчика. */}
        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">Данные</Text>
          <Text variant="caption" tone="secondary">
            Игра хранит прогресс только на этом устройстве и не собирает
            персональные данные.
          </Text>
          {confirming ? (
            <>
              <Text variant="body">Удалить прогресс? Всё начнётся заново.</Text>
              <PixelPanel
                ledge={6}
                onPress={() => setConfirming(false)}
                color={theme.color.brand}
                ledgeColor={theme.color.brandShadow}
                style={{ alignItems: 'center' }}
              >
                <Text variant="button" tone="onColor">
                  НЕТ, ОСТАВИТЬ
                </Text>
              </PixelPanel>
              <PixelPanel
                ledge={6}
                onPress={onReset}
                color={theme.color.red}
                ledgeColor={theme.color.redShadow}
                style={{ alignItems: 'center' }}
              >
                <Text variant="button" tone="onColor">
                  ДА, УДАЛИТЬ
                </Text>
              </PixelPanel>
            </>
          ) : (
            <PixelPanel
              ledge={6}
              onPress={() => setConfirming(true)}
              color={theme.color.surfaceElevated}
              style={{ alignItems: 'center' }}
            >
              <Text variant="button">УДАЛИТЬ ПРОГРЕСС</Text>
            </PixelPanel>
          )}
        </PixelPanel>
      </View>
    </SceneFrame>
  );
}

export function AdultScene({
  state,
  onReset,
  onStartDemo,
  onToggleMotion,
  onGrantBonus,
  onClose,
}: AdultSceneProps) {
  const [passed, setPassed] = useState(false);

  return passed ? (
    <Inside
      state={state}
      onReset={onReset}
      onStartDemo={onStartDemo}
      onToggleMotion={onToggleMotion}
      onGrantBonus={onGrantBonus}
      onClose={onClose}
    />
  ) : (
    <Gate onPass={() => setPassed(true)} onBack={onClose} />
  );
}
