import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Полноэкранное наложение, не залезающее под системные панели.
 *
 * Почему отдельный компонент, а не отступы на месте. RN 0.87 рисует
 * приложение под строкой состояния и под полосой жестов (edge-to-edge).
 * Каждое наложение обязано это учитывать, и раньше знание жило в одном
 * экране — остальные шесть про него забыли, и содержимое уезжало
 * под часы. Теперь отступ считается в одном месте.
 *
 * `bottom` берётся из вставок, а не из константы: у телефона с полосой
 * жестов и у телефона с кнопками она разная.
 */

export type ScreenOverlayProps = {
  children: React.ReactNode;
  /** Фон наложения; по умолчанию прозрачный. */
  background?: string;
  /**
   * Наложение рисует собственный фон на весь экран (например, картинку
   * комнаты). Тогда красим под системные панели, но содержимое всё равно
   * отступает.
   */
  edgeToEdgeBackground?: boolean;
  style?: ViewStyle;
};

export function ScreenOverlay({
  children,
  background,
  edgeToEdgeBackground = false,
  style,
}: ScreenOverlayProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: background,
        },
        edgeToEdgeBackground
          ? null
          : { paddingTop: insets.top, paddingBottom: insets.bottom },
        style,
      ]}
    >
      {edgeToEdgeBackground ? (
        <>
          {/* Фон уходит под панели, содержимое — нет. */}
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            }}
          >
            {children}
          </View>
        </>
      ) : (
        children
      )}
    </View>
  );
}

/** Отступы для экранов, которые не являются наложением. */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return insets;
}
