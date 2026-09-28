import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { Coins } from '@/shared/ui/Coins';
import type { GameState, LedgerEntry } from '@/entities/scenario';

/**
 * История начислений и трат (ТЗ 2.5.4 и 2.5.6).
 *
 * Показывает, откуда пришли монеты и куда ушли. Раньше видна была
 * только текущая операция — «+10 за заботу о питомце» на итоге дня, —
 * и проверить «а куда делись деньги» было негде.
 *
 * Группировка по дням: ребёнок мыслит днями, а не сплошной лентой.
 * Внутри дня новые операции сверху.
 */

export type LedgerSceneProps = {
  state: GameState;
  onClose: () => void;
};

const SIGN: Record<LedgerEntry['kind'], string> = {
  income: '+',
  expense: '−',
  savings: '→',
  withdraw: '←',
};

/**
 * Цвет знака и суммы: пришло — зелёное, ушло — красное.
 *
 * Цвет ДОБАВЛЯЕТ смысл, а не несёт его один: рядом стоят знак «+» или
 * «−» и слово «пришло»/«потрачено» (ТЗ 3.6). Перевод в копилку
 * не окрашиваем — это не приход и не трата, монеты остаются своими.
 */
function signTone(kind: LedgerEntry['kind']): 'brand' | 'danger' | 'primary' {
  if (kind === 'income') {
    return 'brand';
  }
  return kind === 'expense' ? 'danger' : 'primary';
}

const HINT: Record<LedgerEntry['kind'], string> = {
  income: 'пришло',
  expense: 'потрачено',
  savings: 'в копилку',
  withdraw: 'из копилки',
};

function Row({ entry }: { entry: LedgerEntry }) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        paddingVertical: theme.space.xs,
      }}
    >
      {/* Знак словом и символом, а не только цветом (ТЗ 3.6). */}
      <Text variant="button" tone={signTone(entry.kind)} style={{ width: 22 }}>
        {SIGN[entry.kind]}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="caption">{entry.reason}</Text>
        <Text variant="caption" tone="muted">
          {HINT[entry.kind]}
        </Text>
      </View>
      <Coins
        amount={entry.amount}
        variant="caption"
        color={
          entry.kind === 'income'
            ? theme.color.brand
            : entry.kind === 'expense'
            ? theme.color.red
            : undefined
        }
      />
    </View>
  );
}

export function LedgerScene({ state, onClose }: LedgerSceneProps) {
  const theme = useTheme();

  // Дни сверху вниз: сегодняшний первым.
  const days = [...new Set(state.ledger.map(e => e.day))];

  return (
    <SceneFrame title="ИСТОРИЯ МОНЕТ" onBack={onClose}>
      <View style={{ gap: theme.space.sm }}>
        {days.length === 0 ? (
          <PixelPanel ledge={6}>
            <Text variant="caption" tone="secondary">
              Пока ничего не было. Здесь появится всё, что ты получил и
              потратил.
            </Text>
          </PixelPanel>
        ) : null}

        {days.map(day => {
          const entries = state.ledger.filter(e => e.day === day);
          const income = entries
            .filter(e => e.kind === 'income')
            .reduce((sum, e) => sum + e.amount, 0);
          const spent = entries
            .filter(e => e.kind === 'expense')
            .reduce((sum, e) => sum + e.amount, 0);

          return (
            <PixelPanel key={day} ledge={6} style={{ gap: theme.space.xs }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="button">День {day}</Text>
                <Text variant="caption" tone="secondary">
                  заработал {income} · потратил {spent}
                </Text>
              </View>
              {entries.map((e, i) => (
                <Row key={`${e.day}-${i}-${e.reason}`} entry={e} />
              ))}
            </PixelPanel>
          );
        })}
      </View>
    </SceneFrame>
  );
}
