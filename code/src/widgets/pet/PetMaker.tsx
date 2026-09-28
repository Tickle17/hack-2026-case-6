import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { SPECIES } from '@/entities/pet/config/species';
import {
  COLORS,
  DEFAULT_PET_NAME,
  petFrames,
} from '@/entities/pet/lib/appearance';
import { validateName } from '@/shared/lib/name';
import { LetterKeyboard } from '@/shared/ui/LetterKeyboard';

/**
 * Создание питомца: вид, окрас, имя (UC-9).
 *
 * ТЗ 2.5.2 требует настройку внешнего вида и ввод игрового имени.
 * Четыре вида в трёх окрасах дают двенадцать комбинаций при девяти
 * требуемых (ТЗ 2.6).
 *
 * Крупное превью сверху показывает результат СРАЗУ: ребёнок 7–11 лет
 * выбирает глазами, а не по названиям.
 */

export type PetMakerProps = {
  /** Нынешний питомец — когда его меняют из меню, а не создают. */
  initial?: { speciesId: string; colorId: string; name: string };
  /** Выйти без изменений. Только при смене из меню. */
  onCancel?: () => void;
  onDone: (choice: {
    speciesId: string;
    colorId: string;
    name: string;
  }) => void;
};

export function PetMaker({ initial, onCancel, onDone }: PetMakerProps) {
  const theme = useTheme();
  const [speciesId, setSpeciesId] = useState(
    initial?.speciesId ?? SPECIES[0].id,
  );
  const [colorId, setColorId] = useState(initial?.colorId ?? COLORS[0].id);
  const [name, setName] = useState(initial?.name ?? DEFAULT_PET_NAME);
  const [error, setError] = useState<string | null>(null);

  const preview = petFrames(speciesId, 'idle', colorId)[0];
  /**
   * Имя питомца проходит ту же проверку, что и имя ребёнка.
   *
   * Пустое табло — не ошибка, а согласие с предложенным именем:
   * стереть всё и упереться в красную рамку было бы тупиком.
   */
  const checked = validateName(name || DEFAULT_PET_NAME);

  const done = (): void => {
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    onDone({ speciesId, colorId, name: checked.name });
  };

  return (
    <SceneFrame
      title={initial ? 'МОЙ ПИТОМЕЦ' : 'КТО ЖЕ ТАМ?'}
      subtitle={
        initial
          ? 'можно сменить вид, окрас и имя'
          : 'выбери питомца и придумай имя'
      }
      backLabel={initial ? 'СОХРАНИТЬ' : 'ЭТО МОЙ ПИТОМЕЦ'}
      onBack={done}
      footer={
        onCancel ? (
          <PixelPanel
            ledge={6}
            onPress={onCancel}
            color={theme.color.surfaceElevated}
            style={{ alignItems: 'center' }}
          >
            <Text variant="button">ОТМЕНА</Text>
          </PixelPanel>
        ) : undefined
      }
    >
      <View style={{ gap: theme.space.sm }}>
        {/* Превью: видно сразу, что получится */}
        <PixelPanel
          ledge={6}
          style={{ alignItems: 'center', paddingVertical: theme.space.md }}
        >
          {preview ? (
            <Image
              source={preview as never}
              style={{ width: 160, height: 160 }}
              resizeMode="contain"
            />
          ) : null}
          <Text variant="title">
            {checked.ok ? checked.name : DEFAULT_PET_NAME}
          </Text>
        </PixelPanel>

        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">Кто это?</Text>
          <View style={{ flexDirection: 'row', gap: theme.space.xs }}>
            {SPECIES.map(s => {
              const on = s.id === speciesId;
              const frame = petFrames(s.id, 'idle', colorId)[0];
              return (
                <PixelPanel
                  key={s.id}
                  ledge={on ? 8 : 5}
                  onPress={() => setSpeciesId(s.id)}
                  color={on ? theme.color.brandSoft : theme.color.surface}
                  ledgeColor={on ? theme.color.brandShadow : theme.color.border}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    padding: theme.space.xs,
                  }}
                >
                  {frame ? (
                    <Image
                      source={frame as never}
                      style={{ width: 56, height: 56 }}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {s.name}
                  </Text>
                </PixelPanel>
              );
            })}
          </View>
        </PixelPanel>

        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">Какого цвета?</Text>
          <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
            {COLORS.map(c => {
              const on = c.id === colorId;
              const frame = petFrames(speciesId, 'idle', c.id)[0];
              return (
                <PixelPanel
                  key={c.id}
                  ledge={on ? 8 : 5}
                  onPress={() => setColorId(c.id)}
                  color={on ? theme.color.brandSoft : theme.color.surface}
                  ledgeColor={on ? theme.color.brandShadow : theme.color.border}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    padding: theme.space.xs,
                  }}
                >
                  {frame ? (
                    <Image
                      source={frame as never}
                      style={{ width: 60, height: 60 }}
                      resizeMode="contain"
                    />
                  ) : null}
                  {/* Подпись словом, а не только цвет: ТЗ 3.6. */}
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {c.title}
                  </Text>
                </PixelPanel>
              );
            })}
          </View>
        </PixelPanel>

        <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
          <Text variant="button">Как его зовут?</Text>
          {/* Табло и своя русская клавиатура — как на экране знакомства:
              язык системной задаётся настройками телефона. */}
          <View
            style={{
              // Ошибка видна и цветом, и толщиной рамки, и надписью: ТЗ 3.6.
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
              tone={name ? 'primary' : 'muted'}
              numberOfLines={1}
            >
              {name || DEFAULT_PET_NAME}
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
            value={name}
            onChange={next => {
              setName(next);
              // Подсветка снимается, как только начали исправлять.
              setError(null);
            }}
          />
        </PixelPanel>
      </View>
    </SceneFrame>
  );
}
