import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/shared/theme';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SpriteAnimation } from '@/shared/ui/SpriteAnimation';
import {
  petAnimation,
  hasOwnAnimation,
} from '@/entities/pet/config/animations';

/**
 * Мини-игра «погладить».
 *
 * Питомец увеличен и зафиксирован — во время ласки он не убегает.
 * Рука-подсказка ездит по нему, пока ребёнок не понял, что делать:
 * объяснять жест текстом семилетке бесполезно, надо показать.
 *
 * Засчитывается ТРИ движения в РАЗНЫЕ стороны: одним рывком дело не
 * закрыть, надо именно погладить — туда-обратно. Направление проверяется
 * прямо во время жеста, палец отрывать не нужно.
 *
 * Проиграть нельзя, застрять нельзя: выход доступен всегда
 * (docs/minigames.md, «Общие правила»).
 */

/** Сколько движений в разные стороны нужно, чтобы дело засчиталось. */
const STROKES_NEEDED = 3;
/** Сколько пройти пальцем в одну сторону, чтобы это засчиталось за движение. */
const STROKE_DISTANCE = 55;
/** Пауза на радость питомца перед закрытием. */
const FINISH_MS = 1200;

export type StrokeGameProps = {
  speciesId: string;
  onDone: () => void;
  onCancel: () => void;
};

export function StrokeGame({ speciesId, onDone, onCancel }: StrokeGameProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();

  const [strokes, setStrokes] = useState(0);
  const [reacting, setReacting] = useState(false);
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Завершение ВЫЧИСЛЯЕТСЯ из числа движений, а не хранится состоянием:
  // отдельный флаг перезапускал эффект, и его же очистка убивала таймер
  // закрытия — игра зависала на «Ему понравилось!».
  const finished = strokes >= STROKES_NEEDED;

  // onDone приходит новой функцией на каждый рендер родителя. Держим её
  // в ref, иначе эффект перезапускается и таймер снова не доживает.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Направление последнего засчитанного движения: 1 — вправо, -1 — влево.
  const lastDir = useSharedValue(0);
  // Направление текущего движения и сколько уже прошли в эту сторону.
  const dir = useSharedValue(0);
  const travel = useSharedValue(0);
  const lastX = useSharedValue(0);

  const squish = useSharedValue(1);
  const hand = useSharedValue(0);

  const petWith = hasOwnAnimation(speciesId, 'play') ? 'play' : 'happy';
  const spec = petAnimation(speciesId, reacting || finished ? petWith : 'idle');

  const petHeight = Math.round(height * 0.42);
  const petWidth = spec ? Math.round(petHeight * spec.aspect) : petHeight;

  // Рука ездит по питомцу, пока ребёнок не погладил ни разу.
  useEffect(() => {
    if (strokes > 0) {
      hand.value = withTiming(0, { duration: 200 });
      return;
    }
    hand.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [strokes, hand]);

  const addStroke = useCallback(() => {
    setStrokes(prev => {
      const next = prev + 1;
      setReacting(true);
      if (reactTimer.current) {
        clearTimeout(reactTimer.current);
      }
      reactTimer.current = setTimeout(() => setReacting(false), 700);
      return next;
    });
  }, []);

  // Три движения набрано — питомец радуется, и игра закрывается.
  useEffect(() => {
    if (!finished) {
      return;
    }
    const timer = setTimeout(() => onDoneRef.current(), FINISH_MS);
    return () => clearTimeout(timer);
  }, [finished]);

  useEffect(
    () => () => {
      if (reactTimer.current) {
        clearTimeout(reactTimer.current);
      }
    },
    [],
  );

  const pan = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      lastX.value = 0;
      travel.value = 0;
      dir.value = 0;
      squish.value = withSpring(1.04, { damping: 12 });
    })
    .onUpdate(e => {
      'worklet';
      if (finished) {
        return;
      }
      const dx = e.translationX - lastX.value;
      lastX.value = e.translationX;
      if (dx === 0) {
        return;
      }
      const currentDir = dx > 0 ? 1 : -1;

      // Сменили направление — начинаем отсчёт заново.
      if (currentDir !== dir.value) {
        dir.value = currentDir;
        travel.value = 0;
      }
      travel.value += Math.abs(dx);

      // Засчитываем, только если сторона отличается от предыдущей:
      // «в разные стороны» — это и есть поглаживание, а не дёрганье.
      if (travel.value >= STROKE_DISTANCE && currentDir !== lastDir.value) {
        lastDir.value = currentDir;
        travel.value = 0;
        squish.value = withSequence(
          withTiming(1.1, { duration: 110 }),
          withSpring(1, { damping: 8 }),
        );
        runOnJS(addStroke)();
      }
    })
    .onFinalize(() => {
      'worklet';
      squish.value = withSpring(1, { damping: 10 });
      travel.value = 0;
      dir.value = 0;
    });

  const petStyle = useAnimatedStyle(() => ({
    transform: [{ scale: squish.value }],
  }));

  const handStyle = useAnimatedStyle(() => ({
    opacity: hand.value === 0 ? 0 : 0.9,
    transform: [{ translateX: (hand.value - 0.5) * petWidth * 0.7 }],
  }));

  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.82)"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space.xl,
      }}
    >
      <Text variant="title" tone="onColor">
        {finished ? 'Ему понравилось!' : 'Погладь питомца'}
      </Text>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[petStyle, { alignItems: 'center', justifyContent: 'center' }]}
        >
          {spec ? (
            <SpriteAnimation
              frames={spec.frames}
              frameMs={spec.frameMs}
              width={petWidth}
              height={petHeight}
            />
          ) : null}

          {/* рука-подсказка: показывает жест, пока его не повторили */}
          <Animated.View
            style={[handStyle, { position: 'absolute' }]}
            pointerEvents="none"
          >
            <Text variant="display" style={{ fontSize: 72 }}>
              👋
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* прогресс: три отметки */}
      <View style={{ flexDirection: 'row', gap: theme.space.md }}>
        {Array.from({ length: STROKES_NEEDED }, (_, i) => (
          <View
            key={i}
            style={{
              width: 26,
              height: 26,
              backgroundColor: i < strokes ? theme.color.brand : 'transparent',
              borderWidth: 4,
              borderColor:
                i < strokes ? theme.color.brandShadow : theme.color.surface,
            }}
          />
        ))}
      </View>

      {!finished ? (
        <Pressable onPress={onCancel} hitSlop={16}>
          <PixelPanel ledge={6} style={{ paddingHorizontal: theme.space.lg }}>
            <Text variant="caption">позже</Text>
          </PixelPanel>
        </Pressable>
      ) : null}
    </ScreenOverlay>
  );
}
