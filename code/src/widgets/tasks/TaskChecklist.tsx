import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { Coins } from '@/shared/ui/Coins';
import type { Challenge, DayTask } from '@/entities/scenario';

/**
 * Список дел дня под счётчиком дня.
 *
 * Выполненное дело НЕ исчезает, а получает галочку: ребёнок должен видеть,
 * сколько уже сделал. Список, из которого пункты пропадают, показывает
 * только оставшуюся работу и не даёт ощущения продвижения.
 *
 * Дела с нормой больше одного показывают счётчик (2/3): иначе непонятно,
 * почему галочки нет, хотя питомца уже гладили.
 */

export type TaskChecklistProps = {
  tasks: DayTask[];
  titleOf: (taskId: string) => string;
  /** Задания дня за монеты: видны весь день, а не только утром в плане. */
  challenges: Challenge[];
  /** Показать лапкой, куда нажать дальше. Кнопки нет, когда всё сделано. */
  onAskHint?: () => void;
};

export function TaskChecklist({
  tasks,
  titleOf,
  challenges,
  onAskHint,
}: TaskChecklistProps) {
  const theme = useTheme();

  if (tasks.length === 0) {
    return null;
  }

  const doneCount = tasks.filter(task => task.complete).length;

  return (
    <PixelPanel
      ledge={6}
      style={{
        paddingVertical: theme.space.xs,
        paddingHorizontal: theme.space.md,
        gap: 2,
        width: 250,
      }}
    >
      <Text variant="button">
        Задачи {doneCount}/{tasks.length}
      </Text>
      {tasks.map(task => (
        <View
          key={task.taskId}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.xs,
          }}
        >
          <Text variant="caption" tone={task.complete ? 'brand' : 'muted'}>
            {task.complete ? '☑' : '☐'}
          </Text>
          <Text variant="caption" tone={task.complete ? 'muted' : 'primary'}>
            {titleOf(task.taskId)}
            {task.need > 1 ? ` ${task.done}/${task.need}` : ''}
          </Text>
        </View>
      ))}
      {challenges.length > 0 ? (
        <View
          style={{
            marginTop: theme.space.xs,
            paddingTop: theme.space.xs,
            borderTopWidth: 2,
            borderTopColor: theme.color.border,
            gap: 2,
          }}
        >
          <Text variant="caption" tone="secondary">
            Можно заработать
          </Text>
          {challenges.map(challenge => (
            <View
              key={challenge.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.xs,
              }}
            >
              <Text variant="caption" tone={challenge.done ? 'brand' : 'muted'}>
                {challenge.done ? '☑' : '☐'}
              </Text>
              <Text
                variant="caption"
                tone={challenge.done ? 'muted' : 'primary'}
                style={{ flexShrink: 1 }}
              >
                {challenge.title}
              </Text>
              <Coins amount={challenge.reward} variant="caption" />
            </View>
          ))}
        </View>
      ) : null}
      {onAskHint && tasks.some(task => !task.complete) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Подсказать, что делать дальше"
          onPress={onAskHint}
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.xs,
          }}
        >
          <Text variant="caption">💡</Text>
          <Text variant="caption" tone="brand">
            Подсказать
          </Text>
        </Pressable>
      ) : null}
    </PixelPanel>
  );
}
