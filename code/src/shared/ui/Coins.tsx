import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

/**
 * Денежная сумма со значком монеты.
 *
 * Раньше монета рисовалась текстовым символом «●» в пяти разных местах.
 * Символ не читался как деньги, а в шапке магазина, где рядом стоят
 * значки направлений, из-за этого казалось, что валюта — это миска.
 *
 * Один компонент на все суммы: значок везде одинаковый, и смысл
 * «это монеты» не зависит от того, какой ещё значок стоит рядом.
 */

const COIN = require('../../../assets/budget/coin.png');

export type CoinsProps = {
  amount: number;
  /** Размер строки; значок подстраивается под неё. */
  variant?: 'caption' | 'button' | 'title' | 'display';
  tone?: 'primary' | 'secondary' | 'muted' | 'coin' | 'onColor';
  /** Тёмный текст на жёлтой плашке — там свой цвет. */
  color?: string;
};

const ICON: Record<NonNullable<CoinsProps['variant']>, number> = {
  caption: 22,
  button: 26,
  title: 32,
  display: 40,
};

export function Coins({
  amount,
  variant = 'button',
  tone = 'coin',
  color,
}: CoinsProps) {
  const theme = useTheme();
  const size = ICON[variant];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.xs,
      }}
    >
      <Image
        source={COIN}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      <Text
        variant={variant}
        tone={color ? undefined : tone}
        style={color ? { color } : undefined}
      >
        {amount}
      </Text>
    </View>
  );
}
