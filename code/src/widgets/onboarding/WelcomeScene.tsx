import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { LetterKeyboard } from '@/shared/ui/LetterKeyboard';
import { validateName } from '@/shared/lib/name';

/**
 * Первый экран игры: как зовут ребёнка.
 *
 * Стоит ДО сюжета, потому что первая же реплика — поздравление
 * с днём рождения, и поздравлять безымянного нельзя.
 *
 * Клавиатура своя, русская: язык системной задаётся настройками
 * телефона, и на чужом устройстве ребёнок упёрся бы в латиницу.
 * Поэтому здесь не поле ввода, а табло — системной клавиатуре
 * просто неоткуда взяться.
 *
 * Ошибку показываем подсветкой табло и одной фразой без разбора
 * причины: семилетнему ребёнку не нужно знать, что именно не прошло
 * проверку, ему нужно понять, что делать дальше.
 */

export type WelcomeSceneProps = {
  onDone: (name: string) => void;
};

const TITLE = 'Добро пожаловать в игру!';
const PROMPT = 'Как тебя зовут или как называют дома родители?';
const PLACEHOLDER = 'Иван';
const BUTTON = 'ПРОДОЛЖИТЬ';

export function WelcomeScene({ onDone }: WelcomeSceneProps) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    // Пустое табло — согласие с именем из подсказки: настоящее имя вводить не обязательно.
    const checked = validateName(value || PLACEHOLDER);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    onDone(checked.name);
  };

  return (
    <ScreenOverlay background="rgba(20,12,8,0.9)">
      {/* Прокрутка: на невысоком экране клавиатура и кнопка вместе
          не помещаются, а обрезать нижнюю кнопку нельзя. */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: theme.space.sm,
          gap: theme.space.sm,
        }}
      >
        <PixelPanel ledge={8} style={{ gap: theme.space.sm }}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            {TITLE}
          </Text>
          <Text variant="body" style={{ textAlign: 'center' }}>
            {PROMPT}
          </Text>

          {/* Табло, а не поле ввода: набирают только нашей клавиатурой. */}
          <View
            style={{
              // Ошибка видна И цветом, И толщиной рамки, И надписью:
              // цвет не может быть единственным носителем смысла (ТЗ 3.6).
              borderWidth: error ? 5 : 3,
              borderColor: error ? theme.color.red : theme.color.border,
              backgroundColor: theme.color.surface,
              minHeight: theme.touchTarget.min,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.space.xs,
            }}
          >
            <Text
              variant="title"
              tone={value ? 'primary' : 'muted'}
              numberOfLines={1}
            >
              {value || PLACEHOLDER}
            </Text>
          </View>

          {error ? (
            <Text
              variant="caption"
              tone="danger"
              style={{ textAlign: 'center' }}
            >
              {error}
            </Text>
          ) : null}

          <LetterKeyboard
            value={value}
            onChange={next => {
              setValue(next);
              // Подсветка снимается, как только ребёнок начал исправлять.
              setError(null);
            }}
          />
        </PixelPanel>

        <PixelPanel
          ledge={6}
          onPress={submit}
          color={theme.color.brand}
          ledgeColor={theme.color.brandShadow}
          style={{ alignItems: 'center' }}
        >
          <Text variant="button" tone="onColor">
            {BUTTON}
          </Text>
        </PixelPanel>
      </ScrollView>
    </ScreenOverlay>
  );
}
