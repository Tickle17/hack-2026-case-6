import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { typeInName, eraseInName } from '@/shared/lib/name';

/**
 * Своя русская клавиатура для ввода имени.
 *
 * Зачем не системная. Язык системной клавиатуры — настройка телефона,
 * приложение его не переключает: можно лишь попросить IME о подсказке,
 * и та сработает, только если русский язык в клавиатуре уже включён.
 * На чужом телефоне ребёнок упёрся бы в латиницу и не смог написать
 * своё имя. Собственная клавиатура даёт кириллицу всегда.
 *
 * Заодно исчезает целый класс ошибок: цифр и знаков здесь просто нет,
 * набрать их нечем. Правила ввода встроены в ввод, а не проверяются
 * после — см. `typeInName`.
 *
 * Раскладка алфавитная, а не ЙЦУКЕН: семилетний ребёнок знает порядок
 * букв и не знает расположения клавиш. Сетка 6×6 — это ровно 33 буквы
 * и три служебные клавиши, без пустот и без клавиш мельче пальца.
 */

const ALPHABET = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.split('');

/** Служебные клавиши занимают три последние ячейки сетки. */
const SPACE = ' ';
const HYPHEN = '-';
const ERASE = 'erase';

const COLUMNS = 6;
const ROWS: string[][] = [];
{
  const cells = [...ALPHABET, SPACE, HYPHEN, ERASE];
  for (let i = 0; i < cells.length; i += COLUMNS) {
    ROWS.push(cells.slice(i, i + COLUMNS));
  }
}

/** Что написано на служебной клавише. */
const CAPTION: Record<string, string> = {
  [SPACE]: '␣',
  [HYPHEN]: '–',
  [ERASE]: '⌫',
};

export type LetterKeyboardProps = {
  value: string;
  onChange: (next: string) => void;
};

export function LetterKeyboard({ value, onChange }: LetterKeyboardProps) {
  const theme = useTheme();

  const press = (key: string): void => {
    onChange(key === ERASE ? eraseInName(value) : typeInName(value, key));
  };

  return (
    <View style={{ gap: theme.space.xs }}>
      {ROWS.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: theme.space.xs }}>
          {row.map(key => {
            const service = key in CAPTION;
            return (
              <Pressable
                key={key}
                onPress={() => press(key)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    // Высота не ниже минимального тач-таргета (ТЗ 3.6);
                    // ширина получается делением строки на шесть.
                    height: theme.touchTarget.min + 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 3,
                    borderColor: theme.color.border,
                    borderBottomWidth: 6,
                    backgroundColor: service
                      ? theme.color.surfaceElevated
                      : theme.color.surface,
                  },
                  // Высота клавиши задана жёстко: отступ снизу при нажатии
                  // раздувал строку и дёргал весь экран.
                  pressed && {
                    borderBottomWidth: 3,
                    transform: [{ translateY: 3 }],
                  },
                ]}
              >
                <Text variant="button">
                  {service ? CAPTION[key] : key.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
