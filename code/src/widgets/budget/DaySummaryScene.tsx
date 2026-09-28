import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { Coins } from '@/shared/ui/Coins';
import { DIRECTIONS, daySummary, dayChallenges } from '@/entities/scenario';
import type { DayLine, GameState } from '@/entities/scenario';
import { CoinSlider } from './CoinSlider';

/**
 * Вечер: что планировал и что вышло (UC-4).
 *
 * Две полосы на направление — план и факт. Совпадение или расхождение
 * видно глазом, а подпись переводит это в слова (ТЗ 2.5.5 и 2.5.9).
 *
 * Награда начисляется здесь же и с указанием источника: ТЗ 2.5.4
 * запрещает менять баланс без объяснения.
 */

export type DaySummarySceneProps = {
  state: GameState;
  day: number;
  /** Дневная награда за сделанные дела — её уже начислили по сюжету. */
  reward: number;
  /**
   * Блок опыта питомца за день.
   *
   * Слотом, а не данными: сам блок — отдельный виджет, а импортировать
   * виджет из виджета запрещает FSD. Собирает его страница, которая
   * видит оба.
   */
  experience?: React.ReactNode;
  /** Перейти к следующему дню; `extra` — сколько отложить сверх плана. */
  onNext: (extra: number) => void;
  /** Перейти к следующему дню и начать его с нужного. */
  onNextNeedsFirst: () => void;
};

const STEPS = 12;

function Bar({
  value,
  scale,
  dim,
}: {
  value: number;
  scale: number;
  dim?: boolean;
}) {
  const theme = useTheme();
  const filled = Math.round((value / Math.max(scale, 1)) * STEPS);

  return (
    <View style={{ flexDirection: 'row', gap: 2, flex: 1 }}>
      {Array.from({ length: STEPS }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 8,
            backgroundColor:
              i < filled
                ? dim
                  ? theme.color.brandSoft
                  : theme.color.coin
                : dim
                ? theme.color.border
                : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

/**
 * Направление одной строкой: план и факт числами и одной полосой, где
 * факт закрашен поверх плана.
 *
 * Раньше на направление была карточка с двумя полосами. Три карточки
 * занимали полэкрана, а на итоге дня теперь есть ещё опыт питомца —
 * он должен быть виден без прокрутки, иначе анимация проиграется за
 * краем экрана. Сравнение плана с фактом (ТЗ 2.5.5) при этом не
 * пропало: числа рядом, совпадение подписано словом.
 */
function SummaryRow({ line, scale }: { line: DayLine; scale: number }) {
  const theme = useTheme();
  const dir = DIRECTIONS.find(d => d.id === line.id)!;
  const { matched } = line;

  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
        }}
      >
        <Image
          source={dir.image}
          style={{ width: 26, height: 26 }}
          resizeMode="contain"
        />
        <Text variant="caption" style={{ flex: 1 }}>
          {dir.title}
        </Text>
        {/* Совпадение подписано словом, а не только цветом (ТЗ 3.6). */}
        <Text
          variant="caption"
          tone={matched ? 'brand' : 'muted'}
          style={{ minWidth: 26, textAlign: 'right' }}
        >
          {matched && line.actual === line.planned
            ? '✓'
            : line.actual > line.planned
            ? `+${line.actual - line.planned}`
            : `−${line.planned - line.actual}`}
        </Text>
      </View>
      {/* Отдельной строкой: в одну с названием не помещается на 360 dp. */}
      <Text variant="caption" tone="secondary">
        {`планировал ${line.planned} · ${
          line.id === 'save' ? 'отложил' : 'потратил'
        } ${line.actual}`}
      </Text>
      <View style={{ height: 8 }}>
        <Bar value={line.planned} scale={scale} dim />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <Bar value={line.actual} scale={scale} />
        </View>
      </View>
      {line.items.length > 0 ? (
        <Text variant="caption" tone="muted">
          {line.items.join(', ')}
        </Text>
      ) : null}
    </View>
  );
}

export function DaySummaryScene({
  state,
  day,
  reward,
  experience,
  onNext,
  onNextNeedsFirst,
}: DaySummarySceneProps) {
  const theme = useTheme();
  const summary = daySummary(state);
  const challenges = dayChallenges(state);
  /** Сколько отложить сверх плана из остатка дня. */
  const [extra, setExtra] = useState(0);
  const saveDir = DIRECTIONS.find(d => d.id === 'save')!;
  /** Сколько всего пришло за день — с учётом выполненных заданий. */
  const earned =
    reward + challenges.reduce((sum, c) => sum + (c.done ? c.reward : 0), 0);

  if (!summary) {
    return null;
  }

  const scale = Math.max(
    ...summary.lines.map(l => Math.max(l.planned, l.actual)),
    1,
  );

  return (
    <SceneFrame
      title={`ДЕНЬ ${day} ЗАКОНЧЕН`}
      subtitle="что планировал и что вышло"
      backLabel="СЛЕДУЮЩИЙ ДЕНЬ"
      onBack={() => onNext(extra)}
    >
      <View style={{ gap: theme.space.sm }}>
        <PixelPanel
          ledge={6}
          style={{ gap: theme.space.sm, paddingVertical: theme.space.sm }}
        >
          {summary.lines.map(l => (
            <SummaryRow key={l.id} line={l} scale={scale} />
          ))}
          <Text variant="caption" tone="secondary">
            {summary.message}
            {summary.nextStep && !summary.missedNeeds
              ? ` ${summary.nextStep}`
              : ''}
          </Text>
        </PixelPanel>

        {/* Осталось от дня больше плана — можно отложить ещё, тем же
            ползунком, что и утром. Пока нужное не куплено, звать
            откладывать — вредный совет, поэтому тогда его нет. */}
        {summary.leftover > 0 && !summary.missedNeeds ? (
          <PixelPanel ledge={6}>
            <CoinSlider
              title="ОТЛОЖИТЬ ЕЩЁ"
              hint={`осталось от дня: ${summary.leftover}`}
              image={saveDir.image}
              value={extra}
              headroom={summary.leftover - extra}
              scale={summary.leftover}
              onChange={setExtra}
            />
          </PixelPanel>
        ) : null}

        {/* Некупленное нужное — отдельной плашкой сразу под планом: это
            единственная ошибка дня, и рядом с ней стоит, как её исправить. */}
        {summary.missedNeeds ? (
          <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
            <Text variant="button">Что пошло не так</Text>
            <Text variant="caption" tone="secondary">
              {summary.missedNeeds}
            </Text>
            <Text variant="caption">{summary.nextStep}</Text>
            <PixelPanel
              ledge={6}
              onPress={onNextNeedsFirst}
              color={theme.color.brand}
              ledgeColor={theme.color.brandShadow}
              style={{ alignItems: 'center' }}
            >
              <Text variant="button" tone="onColor">
                ЗАВТРА НАЧНУ С НУЖНОГО
              </Text>
            </PixelPanel>
          </PixelPanel>
        ) : null}

        {/* Опыт — сразу под планом: строки опыта во многом повторяют
            его итог («потратил как задумал»), и ребёнок видит, что
            решение, которое он только что сверил, дало питомцу рост. */}
        {experience}

        {/* Всё, что начислено за день, одним блоком и с итогом.

            Источник и сумма каждого начисления — требование ТЗ 2.5.4:
            баланс не меняется без объяснения. Раньше каждое
            начисление жило в своей плашке, и получалось три разных
            числа без ответа на главный детский вопрос — сколько же
            всего. Итог теперь стоит в заголовке блока.

            Заодно это вопрос места: тремя плашками экран перерастал
            себя ровно настолько, что последнее задание срезалось в
            полоску и читалось как поломка. */}
        <PixelPanel
          ledge={6}
          color={theme.color.coin}
          ledgeColor={theme.color.coinShadow}
          style={{ gap: theme.space.xs }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.sm,
            }}
          >
            <Text
              variant="button"
              style={{ flex: 1, color: theme.color.text.primary }}
            >
              ЗАРАБОТАЛ СЕГОДНЯ
            </Text>
            {/* Тёмным: цвет монеты по умолчанию золотой, а плашка
                тоже золотая — число пропадало целиком. */}
            <Coins
              amount={earned}
              variant="button"
              color={theme.color.text.primary}
            />
          </View>

          <Text variant="caption" style={{ color: theme.color.text.primary }}>
            + {reward} за все дела дня
          </Text>

          {/* Задания дня: выполненные с наградой, остальные — просто
              без отметки. Не упрекаем: невыполненное задание не
              ошибка, а то, что можно сделать завтра. Отметка и знак
              «+» несут смысл сами, цвет только помогает (ТЗ 3.6). */}
          {challenges.map(c => (
            <View
              key={c.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.sm,
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: c.done
                    ? theme.color.text.primary
                    : theme.color.text.muted,
                }}
              >
                {c.done ? '☑' : '☐'}
              </Text>
              <Text
                variant="caption"
                style={{
                  flex: 1,
                  color: c.done
                    ? theme.color.text.primary
                    : theme.color.text.muted,
                }}
              >
                {c.title}
              </Text>
              <Text
                variant="caption"
                style={{
                  color: c.done
                    ? theme.color.text.primary
                    : theme.color.text.muted,
                }}
              >
                + {c.reward}
              </Text>
            </View>
          ))}
        </PixelPanel>
      </View>
    </SceneFrame>
  );
}
