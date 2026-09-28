import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';

/**
 * Реплика внизу экрана. Персонаж рисуется отдельно (ActorStage) и стоит
 * над плашкой в полный рост — так его видно целиком, а не бюстом.
 *
 * Тап во время печати мгновенно дописывает текст: ждать анимацию,
 * если уже прочитал, ребёнок не должен.
 */

const SPEAKER_NAMES: Record<string, string> = {
  mother: 'Мама',
  father: 'Папа',
  teacher: 'Учительница',
  hero: 'Ты',
  pet: 'Питомец',
};

const CHAR_MS = 22;

export type DialogueBoxProps = {
  kind: 'dialogue' | 'thought';
  speaker?: string;
  text: string;
  onNext: () => void;
};

export function DialogueBox({ kind, speaker, text, onNext }: DialogueBoxProps) {
  const theme = useTheme();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const timer = setInterval(() => {
      setShown(n => {
        if (n >= text.length) {
          clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, CHAR_MS);
    return () => clearInterval(timer);
  }, [text]);

  const done = shown >= text.length;
  const isThought = kind === 'thought';

  return (
    <Pressable onPress={() => (done ? onNext() : setShown(text.length))}>
      <PixelPanel
        color={isThought ? theme.color.surfaceElevated : theme.color.surface}
      >
        <Text variant="caption" tone={isThought ? 'muted' : 'secondary'}>
          {isThought
            ? 'ты думаешь…'
            : SPEAKER_NAMES[speaker ?? ''] ?? speaker ?? ''}
        </Text>
        <Text variant="body" style={{ marginTop: theme.space.xs }}>
          {text.slice(0, shown)}
        </Text>
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: theme.space.xs,
            minHeight: 24,
          }}
        >
          {done ? (
            <Text variant="caption" tone="muted">
              дальше ▸
            </Text>
          ) : null}
        </View>
      </PixelPanel>
    </Pressable>
  );
}
