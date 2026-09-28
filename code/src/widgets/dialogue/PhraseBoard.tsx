import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { HintBubble } from '@/shared/ui/HintBubble';
import { phraseWords, shuffleWords } from '@/entities/scenario';

/**
 * Задание «собери фразу»: учитель называет термин, слова лежат
 * вперемешку, ребёнок расставляет их по порядку.
 *
 * Зачем такой вид. ТЗ 2.5.8 прямо требует, чтобы задания не сводились
 * к выбору ответа из предложенных вариантов. Здесь готового ответа нет
 * ни в каком виде: ребёнок составляет фразу сам и проговаривает её
 * про себя — определение запоминается лучше, чем при угадывании.
 *
 * Почему нажатие, а не перетаскивание. Перетащить слово точно между
 * двумя другими на телефоне трудно и взрослому; ребёнок 7 лет промахнётся
 * и решит, что игра сломалась. Нажал на слово внизу — оно встало в строку,
 * нажал на слово в строке — вернулось вниз. Тот же смысл «передвинуть»,
 * но промахнуться нечем.
 *
 * Ошибка ничего не стирает: собранная строка остаётся на месте, чтобы
 * переставить одно слово, а не набирать фразу заново.
 */

export type PhraseBoardProps = {
  /** Верная фраза целиком. Слова для доски берутся из неё. */
  phrase: string;
  /**
   * Зерно перемешивания. Одно и то же задание должно выкладываться
   * одинаково при каждой перерисовке — иначе слово уедет из-под пальца.
   */
  seed: number;
  feedback: string | null;
  correct: boolean;
  onAnswer: (value: string) => void;
  onNext: () => void;
  /** Подсказка первого дня; null — подсказки выключены. */
  hint?: string | null;
};

type Chip = { id: number; word: string };

export function PhraseBoard({
  phrase,
  seed,
  feedback,
  correct,
  onAnswer,
  onNext,
  hint,
}: PhraseBoardProps) {
  const theme = useTheme();

  /**
   * Слова хранятся с номерами, а не строками: во фразе бывают
   * повторы («деньги, которые… — это деньги»), и по одному лишь
   * тексту нельзя понять, какое из двух слов нажали.
   */
  const chips = useMemo<Chip[]>(() => {
    const words = phraseWords(phrase);
    return shuffleWords(words, seed).map((word, id) => ({ id, word }));
  }, [phrase, seed]);

  const [placed, setPlaced] = useState<Chip[]>([]);
  const pool = chips.filter(c => !placed.some(p => p.id === c.id));
  const ready = pool.length === 0 && placed.length > 0;

  const place = (chip: Chip): void => setPlaced(prev => [...prev, chip]);
  const takeBack = (chip: Chip): void =>
    setPlaced(prev => prev.filter(p => p.id !== chip.id));

  /**
   * Плитка слова. Обычная функция, а не вложенный компонент: объявленный
   * внутри рендера компонент — каждый раз новый тип, и React пересоздаёт
   * все плитки при любом касании. Слово мигало бы на каждое нажатие.
   */
  const renderWord = (chip: Chip, inLine: boolean): React.ReactElement => (
    <PixelPanel
      key={chip.id}
      ledge={5}
      onPress={
        correct ? undefined : () => (inLine ? takeBack(chip) : place(chip))
      }
      color={inLine ? theme.color.brandSoft : theme.color.surface}
      accessibilityRole="button"
      accessibilityLabel={
        inLine
          ? `${chip.word}: убрать из строки`
          : `${chip.word}: поставить в строку`
      }
      style={{
        paddingVertical: theme.space.sm,
        paddingHorizontal: theme.space.md,
      }}
    >
      <Text variant="button">{chip.word}</Text>
    </PixelPanel>
  );

  return (
    <View style={{ gap: theme.space.md }}>
      {hint ? <HintBubble text={hint} /> : null}

      {/* Строка ответа. Пустая — с подписью, иначе непонятно, что тут
          вообще место для слов. */}
      <PixelPanel
        ledge={6}
        color={theme.color.surfaceElevated}
        style={{
          minHeight: 72,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.space.xs,
          alignItems: 'center',
        }}
      >
        {placed.length === 0 ? (
          <Text variant="caption" tone="muted">
            нажимай на слова — они встанут сюда
          </Text>
        ) : (
          placed.map(chip => renderWord(chip, true))
        )}
      </PixelPanel>

      {/* Запас слов. */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.space.xs,
          justifyContent: 'center',
        }}
      >
        {pool.map(chip => renderWord(chip, false))}
      </View>

      {/* Проверить можно, только когда слова кончились: наполовину
          собранная фраза — это не ответ, и засчитывать её как ошибку
          нечестно. */}
      {!correct ? (
        <PixelPanel
          ledge={6}
          onPress={
            ready
              ? () => onAnswer(placed.map(c => c.word).join(' '))
              : undefined
          }
          color={ready ? theme.color.brand : theme.color.surfaceElevated}
          ledgeColor={ready ? theme.color.brandShadow : theme.color.border}
          style={{ alignItems: 'center' }}
        >
          <Text variant="button" tone={ready ? 'onColor' : 'muted'}>
            {ready ? 'ПРОВЕРИТЬ' : 'СОБЕРИ ВСЮ ФРАЗУ'}
          </Text>
        </PixelPanel>
      ) : null}

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
