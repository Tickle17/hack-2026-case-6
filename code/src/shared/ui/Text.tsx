import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/shared/theme';

type Variant = 'display' | 'title' | 'body' | 'caption' | 'button';
type Tone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'onColor'
  | 'coin'
  | 'brand'
  | 'danger';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
};

/** Единственный способ вывести текст. Сырые размеры и цвета запрещены. */
export function Text({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const t = theme.text[variant];

  const color =
    tone === 'coin'
      ? theme.color.coin
      : tone === 'brand'
      ? theme.color.brand
      : tone === 'danger'
      ? theme.color.red
      : theme.color.text[tone];

  return (
    <RNText
      style={[
        {
          // Семейство, а не fontWeight: см. комментарий в ThemeContract.
          fontFamily: t.bold ? theme.font.bold : theme.font.regular,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          color,
        },
        style,
      ]}
      {...rest}
    />
  );
}
