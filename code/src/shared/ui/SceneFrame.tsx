import React from 'react';
import { View } from 'react-native';
// ScrollView из gesture-handler, а не из react-native: обычный
// перехватывает касание раньше вложенных жестов, и ползунок внутри
// раздела не тянулся — жест не доходил до него вовсе.
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { HintPaw } from '@/shared/ui/HintPaw';

/**
 * Каркас раздела: заголовок сверху, содержимое, возврат внизу.
 *
 * Зачем отдельный компонент. ТЗ 3.6 требует единообразного расположения
 * кнопки возврата: ребёнок не должен искать выход заново в каждом
 * разделе. Раньше каждый экран рисовал свою кнопку где придётся —
 * теперь место одно и оно задаётся здесь.
 *
 * Возврат ВСЕГДА последний элемент и всегда во всю ширину: до него
 * легко дотянуться большим пальцем, и он не путается с действиями.
 */

export type SceneFrameProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Подпись кнопки возврата; по умолчанию — «НАЗАД». */
  backLabel?: string;
  /**
   * Выход пока невозможен. Кнопка остаётся на месте, но выглядит
   * выключенной: кнопка, которая выглядит рабочей и не работает,
   * хуже явно неактивной — ребёнок решит, что игра сломалась.
   */
  backDisabled?: boolean;
  onBack: () => void;
  /** Действия над кнопкой возврата — то, ради чего пришли в раздел. */
  footer?: React.ReactNode;
  /** Подсказка показывает на кнопку возврата. */
  backHint?: boolean;
  /** Панель справа от заголовка, в одну строку с ним. */
  titleAside?: React.ReactNode;
};

export function SceneFrame({
  title,
  subtitle,
  children,
  backLabel = 'НАЗАД',
  backDisabled = false,
  onBack,
  footer,
  backHint = false,
  titleAside,
}: SceneFrameProps) {
  const theme = useTheme();

  return (
    <ScreenOverlay
      background={theme.color.bg}
      style={{ padding: theme.space.md }}
    >
      <ScrollView
        contentContainerStyle={{
          gap: theme.space.sm,
          paddingBottom: theme.space.md,
        }}
      >
        <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
          <PixelPanel ledge={6} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="title">{title}</Text>
            {subtitle ? (
              <Text
                variant="caption"
                tone="secondary"
                style={{ alignSelf: 'stretch', textAlign: 'center' }}
              >
                {subtitle}
              </Text>
            ) : null}
          </PixelPanel>
          {titleAside}
        </View>

        {children}
      </ScrollView>

      {/* Возврат живёт вне прокрутки: он должен быть на месте всегда,
          даже когда содержимое длинное. */}
      <View style={{ gap: theme.space.sm, paddingTop: theme.space.sm }}>
        {footer}
        <HintPaw active={backHint}>
          <PixelPanel
            ledge={6}
            onPress={backDisabled ? undefined : onBack}
            color={
              backDisabled ? theme.color.surfaceElevated : theme.color.brand
            }
            ledgeColor={
              backDisabled ? theme.color.border : theme.color.brandShadow
            }
            style={{ alignItems: 'center' }}
          >
            <Text variant="button" tone={backDisabled ? 'muted' : 'onColor'}>
              {backLabel}
            </Text>
          </PixelPanel>
        </HintPaw>
      </View>
    </ScreenOverlay>
  );
}
