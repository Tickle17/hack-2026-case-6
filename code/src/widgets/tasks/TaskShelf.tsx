import React, { useRef } from 'react';
import { View, Image, type ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { HintPaw } from '@/shared/ui/HintPaw';

/**
 * Полка действий на нижней стенке комнаты.
 *
 * Плитки НЕ исчезают после выполнения: гладить, кормить и мыть питомца
 * можно сколько угодно раз. Прогресс дня показывает список с галочками,
 * а полка — это возможности, а не список задач. Отнимать у ребёнка
 * возможность приласкать питомца, потому что «дело уже сделано», нельзя.
 *
 * Единственное ограничение — занятость: пока миска стоит на полу и
 * питомец к ней идёт, вторую поставить нельзя.
 *
 * Дело выполняется ПЕРЕТАСКИВАНИЕМ предмета, а не нажатием: так действие
 * становится телесным (docs/ui-kit.md, «Модель взаимодействия»).
 */

export type ShelfTask = {
  taskId: string;
  /**
   * Название дела словами. Плитка — картинка без текста, и без подписи
   * её не прочитает ни программа чтения с экрана (ТЗ 3.6), ни
   * автоматический прогон: и тому и другому нужна опора не на пиксели.
   */
  title: string;
  icon: string;
  image?: ImageSourcePropType;
  /**
   * Дело открывается мини-игрой по нажатию, а не перетаскиванием.
   * Поглаживание нельзя «донести» — это отдельная сцена с питомцем.
   */
  opensGame?: boolean;
  /**
   * Предмет ставится в любое место пола, а не подносится к питомцу.
   * Миску не несут животному в зубы — её ставят, и питомец подходит сам.
   */
  dropAnywhere?: boolean;
  /** Действие сейчас занято: предмет уже на полу, питомец идёт к нему. */
  busy?: boolean;
  /**
   * Делать нечем: нужный расходник не куплен. Плитка остаётся на месте
   * и при нажатии объясняет причину — исчезнувшая плитка читалась бы
   * как поломка игры.
   */
  locked?: boolean;
};

export type TaskShelfProps = {
  tasks: ShelfTask[];
  /** Живые экранные координаты питомца (левый верхний угол). */
  petX: SharedValue<number>;
  petY: SharedValue<number>;
  petWidth: SharedValue<number>;
  petHeight: SharedValue<number>;
  /** Пол в экранных координатах — куда можно ставить предметы. */
  floor: { x: number; y: number; w: number; h: number };
  onDelivered: (taskId: string, drop?: { x: number; y: number }) => void;
  onOpenGame: (taskId: string) => void;
  /** Нажали на дело, которое пока делать нечем. */
  onBlocked: (taskId: string) => void;
  /** Дело, на которое сейчас показывает подсказка. */
  highlight?: string | null;
};

/** Насколько близко к питомцу надо донести предмет. */
const HIT_PADDING = 90;

type TileProps = {
  task: ShelfTask;
  petX: SharedValue<number>;
  petY: SharedValue<number>;
  petWidth: SharedValue<number>;
  petHeight: SharedValue<number>;
  floor: { x: number; y: number; w: number; h: number };
  onDelivered: (taskId: string, drop?: { x: number; y: number }) => void;
  onOpenGame: (taskId: string) => void;
  onBlocked: (taskId: string) => void;
  highlighted: boolean;
};

function Tile({
  task,
  petX,
  petY,
  petWidth,
  petHeight,
  floor,
  onDelivered,
  onOpenGame,
  onBlocked,
  highlighted,
}: TileProps) {
  const theme = useTheme();
  // Экранные координаты плитки живут в shared values: воркет читает их
  // во время жеста. Через обычный ref не выйдет — он читается на рендере,
  // а измерение приходит после разметки, и в жест попадал бы null.
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const nodeRef = useRef<any>(null);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const lifted = useSharedValue(0);
  const shake = useSharedValue(0);

  const locked = Boolean(task.locked);
  const blocked = Boolean(task.busy) || locked;

  /**
   * Предмет просто возвращается на место.
   *
   * Раньше здесь была пружина: миска долетала до полки и качалась
   * из стороны в сторону, будто её уронили. Возврат — не событие,
   * о котором надо сообщать, поэтому он ровный и короткий.
   */
  const settle = (): void => {
    'worklet';
    const back = { duration: 160, easing: Easing.out(Easing.quad) };
    tx.value = withTiming(0, back);
    ty.value = withTiming(0, back);
    scale.value = withTiming(1, back);
    lifted.value = withTiming(0, { duration: 120 });
  };

  /** Занятое действие не поднимается: дрожит и остаётся на месте. */
  const refuse = (): void => {
    'worklet';
    shake.value = withSequence(
      withTiming(-1, { duration: 55 }),
      withTiming(1, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
  };

  const tap = Gesture.Tap()
    .enabled(Boolean(task.opensGame))
    .onEnd(() => {
      'worklet';
      if (locked) {
        runOnJS(onBlocked)(task.taskId);
        return;
      }
      if (blocked) {
        refuse();
        return;
      }
      runOnJS(onOpenGame)(task.taskId);
    });

  const pan = Gesture.Pan()
    .enabled(!task.opensGame)
    .onBegin(() => {
      'worklet';
      // Касание по запертому делу — не отказ, а вопрос: пусть персонаж
      // объяснит, чего не хватает.
      if (locked) {
        runOnJS(onBlocked)(task.taskId);
        return;
      }
      if (blocked) {
        refuse();
        return;
      }
      scale.value = withTiming(1.2, { duration: 120 });
      lifted.value = withTiming(1, { duration: 100 });
    })
    .onUpdate(e => {
      'worklet';
      if (blocked) {
        return;
      }
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      if (blocked) {
        return;
      }
      const dropX = originX.value + tx.value;
      const dropY = originY.value + ty.value;

      if (task.dropAnywhere) {
        // Ставим на пол: важно лишь, чтобы место было в комнате.
        const onFloor =
          dropX >= floor.x &&
          dropX <= floor.x + floor.w &&
          dropY >= floor.y &&
          dropY <= floor.y + floor.h;
        if (onFloor) {
          runOnJS(onDelivered)(task.taskId, { x: dropX, y: dropY });
        }
        settle();
        return;
      }

      const petCX = petX.value + petWidth.value / 2;
      const petCY = petY.value + petHeight.value / 2;
      const distance = Math.sqrt((dropX - petCX) ** 2 + (dropY - petCY) ** 2);

      if (
        distance <
        Math.max(petWidth.value, petHeight.value) / 2 + HIT_PADDING
      ) {
        runOnJS(onDelivered)(task.taskId);
      }
      settle();
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value + shake.value * 8 },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    zIndex: lifted.value > 0 ? 50 : 1,
    elevation: lifted.value > 0 ? 12 : 0,
  }));

  return (
    <GestureDetector gesture={Gesture.Race(tap, pan)}>
      <Animated.View
        ref={nodeRef}
        accessible
        accessibilityRole="button"
        accessibilityLabel={task.title}
        accessibilityState={{ disabled: blocked }}
        style={style}
        onLayout={() => {
          nodeRef.current?.measureInWindow(
            (mx: number, my: number, mw: number, mh: number) => {
              originX.value = mx + mw / 2;
              originY.value = my + mh / 2;
            },
          );
        }}
      >
        <HintPaw active={highlighted}>
          <PixelPanel
            ledge={6}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: theme.space.sm,
              paddingHorizontal: theme.space.sm,
              minWidth: 78,
              opacity: blocked ? 0.45 : 1,
            }}
          >
            {task.image ? (
              <Image
                source={task.image}
                style={{ width: 56, height: 48 }}
                resizeMode="contain"
              />
            ) : (
              <Text variant="display">{task.icon}</Text>
            )}
          </PixelPanel>
        </HintPaw>
      </Animated.View>
    </GestureDetector>
  );
}

export function TaskShelf({
  tasks,
  petX,
  petY,
  petWidth,
  petHeight,
  floor,
  onDelivered,
  onOpenGame,
  onBlocked,
  highlight,
}: TaskShelfProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        paddingHorizontal: theme.space.sm,
      }}
    >
      {tasks.map(task => (
        <Tile
          key={task.taskId}
          task={task}
          petX={petX}
          petY={petY}
          petWidth={petWidth}
          petHeight={petHeight}
          floor={floor}
          onDelivered={onDelivered}
          onOpenGame={onOpenGame}
          onBlocked={onBlocked}
          highlighted={task.taskId === highlight}
        />
      ))}
    </View>
  );
}
