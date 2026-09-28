import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { HintBubble } from '@/shared/ui/HintBubble';
import type { RiddleOption } from '@/entities/scenario';

/**
 * Загадка на школьной доске.
 *
 * Неверный ответ НЕ наказывает: нет счётчика ошибок, таймера и запрета
 * повтора. Вариант, на который уже отвечали неверно, помечается, чтобы
 * ребёнок не тыкал по кругу — это подсказка, а не штраф.
 */

export type RiddleBoardProps = {
  /** Сам пример пишется на доске класса — см. BoardText. */
  options: RiddleOption[];
  feedback: string | null;
  correct: boolean;
  onAnswer: (value: number | string) => void;
  onNext: () => void;
  /** Подсказка первого дня; null — подсказки выключены. */
  hint?: string | null;
};

export function RiddleBoard({
  options,
  feedback,
  correct,
  onAnswer,
  onNext,
  hint,
}: RiddleBoardProps) {
  const theme = useTheme();
  const [tried, setTried] = useState<Array<number | string>>([]);

  /**
   * Словесные варианты не помещаются в ряд — раскладка другая.
   *
   * Смотрим на ТИП, а не на длину: «Корм» — короткое слово, но слово,
   * и в один ряд с числами его ставить незачем. Набор всегда однороден,
   * это проверяет тест.
   */
  const wordy = options.some(o => typeof o.value === 'string');

  const answer = (value: number | string): void => {
    setTried(prev => (prev.includes(value) ? prev : [...prev, value]));
    onAnswer(value);
  };

  return (
    <View style={{ gap: theme.space.lg }}>
      {/* Подсказка над вариантами: показывает на них. */}
      {hint ? <HintBubble text={hint} /> : null}
      {/*
        Числа встают в ряд, слова — в столбик.

        Три словесных варианта рядом не помещаются на телефоне:
        «Шапочка для питомца» вытесняла соседей за край экрана,
        и третий ответ становился недоступен. Раскладка выбирается
        по длине самого длинного варианта, а не задаётся в сценарии:
        автору урока не нужно думать о вёрстке.
      */}
      <View
        style={
          wordy
            ? { gap: theme.space.sm }
            : {
                flexDirection: 'row',
                justifyContent: 'center',
                gap: theme.space.md,
              }
        }
      >
        {options.map(option => {
          const wrong = tried.includes(option.value) && !option.correct;
          return (
            <PixelPanel
              key={String(option.value)}
              onPress={() => (correct ? undefined : answer(option.value))}
              color={wrong ? theme.color.surfaceElevated : theme.color.surface}
              style={{ minWidth: 84, alignItems: 'center' }}
            >
              <Text
                variant={wordy ? 'button' : 'display'}
                tone={wrong ? 'muted' : 'primary'}
              >
                {String(option.value)}
              </Text>
            </PixelPanel>
          );
        })}
      </View>

      {feedback ? (
        <PixelPanel
          color={correct ? theme.color.brandSoft : theme.color.surface}
          ledgeColor={correct ? theme.color.brandShadow : theme.color.border}
        >
          <Text variant="body" style={{ textAlign: 'center' }}>
            {feedback}
          </Text>
          {correct ? (
            <View style={{ alignItems: 'center', marginTop: theme.space.md }}>
              <PixelPanel
                onPress={onNext}
                color={theme.color.brand}
                ledgeColor={theme.color.brandShadow}
                style={{ paddingHorizontal: theme.space.xl }}
              >
                <Text variant="button" tone="onColor">
                  ДАЛЬШЕ
                </Text>
              </PixelPanel>
            </View>
          ) : null}
        </PixelPanel>
      ) : null}
    </View>
  );
}
