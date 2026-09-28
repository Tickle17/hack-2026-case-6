import React, { useCallback, useRef } from 'react';
import { View, Image, type ImageSourcePropType } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { HintPaw } from '@/shared/ui/HintPaw';
import { Coins } from '@/shared/ui/Coins';
import { HintBubble } from '@/shared/ui/HintBubble';

/**
 * Ползунок одного направления бюджета.
 *
 * Шаг — одна монета, не проценты: ребёнок 7–11 лет считает штуками,
 * а не долями.
 *
 * Два способа ввода намеренно: полосу можно тянуть пальцем — так
 * быстрее и понятнее «сколько», — а кнопки «−» и «+» дают точность
 * до монеты, когда осталось разложить последнюю. Одним перетаскиванием
 * попасть в нужное деление трудно, а промах здесь означает неверный план.
 *
 * Значок слева различает направления ФОРМОЙ, а не только цветом
 * (ТЗ 3.6). Значение продублировано цифрой рядом с полосой.
 */

export type CoinSliderProps = {
  title: string;
  hint: string;
  image: ImageSourcePropType;
  value: number;
  /** Сколько ещё свободно — дальше ползунок не пускает. */
  headroom: number;
  /** Весь доход: общая шкала для всех трёх полос. */
  scale: number;
  /**
   * Сколько монет нужно этому направлению, чтобы всего хватило.
   * Отмечается на полосе СЕРЫМ — это ориентир, а не предел:
   * ползунок дальше пускает, решение остаётся за ребёнком.
   */
  target?: number;
  /** Подпись под полосой: что означает это направление сегодня. */
  note?: string;
  /** Зелёная подпись — когда своего уже достаточно. */
  noteEnough?: boolean;
  /**
   * Показать, как пользоваться полосой. Лапка едет по ней слева
   * направо: полосу тянут, и тычок в неё врал бы о способе.
   */
  showGesture?: boolean;
  /** Подсказка шага внизу блока — рядом с полосой, о которой она. */
  tip?: string;
  onChange: (next: number) => void;
};

/**
 * Делений на полосе. Одно деление — примерно одна монета при типичном
 * дневном доходе; при другом доходе пропорция сохраняется.
 */
const TRACK_STEPS = 12;

/** Знаки нарисованы фигурами, а не символами шрифта: так они крупнее
 *  и одинаково выглядят на любом устройстве. */
function Sign({ kind, color }: { kind: 'plus' | 'minus'; color: string }) {
  const bar = { position: 'absolute', backgroundColor: color } as const;
  return (
    <View
      style={{
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={[bar, { width: 22, height: 5, top: 8.5 }]} />
      {kind === 'plus' ? (
        <View style={[bar, { width: 5, height: 22, left: 8.5 }]} />
      ) : null}
    </View>
  );
}

export function CoinSlider({
  title,
  hint,
  image,
  value,
  headroom,
  scale,
  target,
  note,
  noteEnough = false,
  showGesture = false,
  tip,
  onChange,
}: CoinSliderProps) {
  const theme = useTheme();
  const max = value + headroom;

  // Жест создаётся один раз, а props меняются на каждый рендер.
  // Читаем свежие значения через ref, иначе ползунок будет считать
  // от устаревшего остатка.
  const latest = useRef({ value, max, scale, onChange });
  latest.current = { value, max, scale, onChange };

  const trackWidth = useSharedValue(0);

  /** Перевести положение пальца в количество монет. */
  const applyAt = useCallback((x: number, width: number) => {
    const {
      value: cur,
      max: limit,
      scale: total,
      onChange: emit,
    } = latest.current;
    if (width <= 0) {
      return;
    }
    const ratio = Math.max(0, Math.min(1, x / width));
    const next = Math.max(0, Math.min(limit, Math.round(ratio * total)));
    if (next !== cur) {
      emit(next);
    }
  }, []);

  const drag = Gesture.Pan()
    .minDistance(0)
    .onBegin(e => {
      'worklet';
      runOnJS(applyAt)(e.x, trackWidth.value);
    })
    .onUpdate(e => {
      'worklet';
      runOnJS(applyAt)(e.x, trackWidth.value);
    });

  const step = (delta: number): void => {
    const next = Math.max(0, Math.min(max, value + delta));
    if (next !== value) {
      onChange(next);
    }
  };

  // Шкала — ВЕСЬ доход, а не собственный максимум направления. Иначе,
  // когда свободные монеты кончились, каждая полоса оказывалась бы
  // полной независимо от значения, и сравнить направления было бы нельзя.
  const filled = Math.round((value / Math.max(scale, 1)) * TRACK_STEPS);
  /** Докуда серая отметка «столько нужно». */
  const marked =
    target === undefined
      ? 0
      : Math.round((target / Math.max(scale, 1)) * TRACK_STEPS);

  return (
    <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
        }}
      >
        <Image
          source={image}
          style={{ width: 44, height: 44 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text variant="button">{title}</Text>
          <Text variant="caption" tone="secondary">
            {hint}
          </Text>
        </View>
        {/* Само по себе число ничего не говорит: «6» рядом с «6» из
            другого ползунка не различить ни на слух, ни в разметке.
            Подпись называет, чего именно шесть. */}
        <View accessible accessibilityLabel={`${title}: ${value}`}>
          <Coins amount={value} variant="title" tone="coin" />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
        }}
      >
        <PixelPanel
          ledge={4}
          accessibilityRole="button"
          accessibilityLabel={`${title}: убрать монету`}
          onPress={() => step(-1)}
          color={value > 0 ? theme.color.surface : theme.color.surfaceElevated}
          style={{
            width: theme.touchTarget.min,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sign
            kind="minus"
            color={value > 0 ? theme.color.text.primary : theme.color.border}
          />
        </PixelPanel>

        {/* Полосу можно тянуть пальцем */}
        <HintPaw active={showGesture} gesture="drag" style={{ flex: 1 }}>
          <GestureDetector gesture={drag}>
            <View
              onLayout={e => {
                trackWidth.value = e.nativeEvent.layout.width;
              }}
              // Запас по вертикали: попасть в полосу высотой 18 dp трудно,
              // а прозрачные поля сверху и снизу расширяют зону до нормы.
              style={{ flex: 1, paddingVertical: 15 }}
            >
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: TRACK_STEPS }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 18,
                      backgroundColor:
                        i < filled
                          ? theme.color.coin
                          : i < marked
                          ? // Серым — сколько ещё надо, чтобы хватило.
                            theme.color.text.muted
                          : theme.color.border,
                    }}
                  />
                ))}
              </View>
            </View>
          </GestureDetector>
        </HintPaw>

        <PixelPanel
          ledge={4}
          accessibilityRole="button"
          accessibilityLabel={`${title}: добавить монету`}
          onPress={() => step(1)}
          color={headroom > 0 ? theme.color.brand : theme.color.surfaceElevated}
          ledgeColor={
            headroom > 0 ? theme.color.brandShadow : theme.color.border
          }
          style={{
            width: theme.touchTarget.min,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sign
            kind="plus"
            color={headroom > 0 ? theme.color.text.onColor : theme.color.border}
          />
        </PixelPanel>
      </View>

      {/* Подпись под полосой: зачем это направление и хватает ли уже.
          Смысл несут слова, а не один цвет (ТЗ 3.6). */}
      {note ? (
        <Text
          variant="caption"
          tone={noteEnough ? 'brand' : 'secondary'}
          style={{ textAlign: 'center' }}
        >
          {note}
        </Text>
      ) : null}
      {tip ? <HintBubble text={tip} /> : null}
    </PixelPanel>
  );
}
