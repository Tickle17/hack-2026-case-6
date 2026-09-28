import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSequence,
  runOnJS,
  type SharedValue,
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
import {
  BATH_STEPS,
  TUB_BACK,
  TUB_FRONT,
  TUB_ASPECT,
  type BathStep,
} from '@/entities/pet/config/bath-steps';

/**
 * Мини-игра «искупать».
 *
 * Питомец сидит в ванне: задний слой ванны, поверх него животное, поверх —
 * передний борт с пеной. Поэтому он именно ВНУТРИ, а не перед ней.
 *
 * Предметы стоят колонкой справа и переносятся на питомца
 * перетаскиванием. Порядок важен — это тренировка планирования
 * (docs/minigames.md). Не тот предмет не наказывает: питомец объясняет,
 * что нужно раньше, предмет возвращается на место.
 */

const FINISH_MS = 1400;
const HIT_PADDING = 60;

export type BathGameProps = {
  speciesId: string;
  onDone: () => void;
  onCancel: () => void;
};

type ItemProps = {
  step: BathStep;
  index: number;
  currentIndex: number;
  petX: SharedValue<number>;
  petY: SharedValue<number>;
  petR: SharedValue<number>;
  onDrop: (index: number) => void;
};

function Item({
  step,
  index,
  currentIndex,
  petX,
  petY,
  petR,
  onDrop,
}: ItemProps) {
  const theme = useTheme();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const nodeRef = useRef<any>(null);

  const done = index < currentIndex;
  const isNext = index === currentIndex;

  const pan = Gesture.Pan()
    .enabled(!done)
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(1.25, { duration: 120 });
    })
    .onUpdate(e => {
      'worklet';
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      const dropX = originX.value + tx.value;
      const dropY = originY.value + ty.value;
      const distance = Math.sqrt(
        (dropX - petX.value) ** 2 + (dropY - petY.value) ** 2,
      );
      if (distance < petR.value + HIT_PADDING) {
        runOnJS(onDrop)(index);
      }
      // Предмет просто возвращается на место: пружина качала его
      // из стороны в сторону, и это читалось как поломка, а не
      // как «положил обратно». См. тот же приём в TaskShelf.
      const back = { duration: 160, easing: Easing.out(Easing.quad) };
      tx.value = withTiming(0, back);
      ty.value = withTiming(0, back);
      scale.value = withTiming(1, back);
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    zIndex: scale.value > 1 ? 60 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        ref={nodeRef}
        accessible
        accessibilityRole="button"
        accessibilityLabel={step.label}
        style={style}
        onLayout={() => {
          nodeRef.current?.measureInWindow(
            (x: number, y: number, w: number, h: number) => {
              originX.value = x + w / 2;
              originY.value = y + h / 2;
            },
          );
        }}
      >
        <PixelPanel
          ledge={5}
          color={done ? theme.color.brandSoft : theme.color.surface}
          ledgeColor={isNext ? theme.color.brand : theme.color.border}
          style={{
            alignItems: 'center',
            padding: theme.space.xs,
            opacity: done ? 0.5 : 1,
          }}
        >
          {done ? (
            <Text variant="title">✓</Text>
          ) : (
            <Image
              source={step.image}
              style={{ width: 54, height: 54 }}
              resizeMode="contain"
            />
          )}
        </PixelPanel>
      </Animated.View>
    </GestureDetector>
  );
}

/** На какой высоте ванны стоят лапы питомца (доля высоты). */
const PET_BOTTOM = 0.28;

export function BathGame({ speciesId, onDone, onCancel }: BathGameProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [stepIndex, setStepIndex] = useState(0);
  const [says, setSays] = useState<string | null>(null);
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Завершение вычисляется, а не хранится: отдельный флаг перезапускал бы
  // эффект и его очистка убивала бы таймер закрытия.
  const finished = stepIndex >= BATH_STEPS.length;

  // Колбэк держим в ref — он приходит новой функцией на каждый рендер.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const petX = useSharedValue(0);
  const petY = useSharedValue(0);
  const petR = useSharedValue(0);
  const shake = useSharedValue(0);

  const petRef = useRef<any>(null);

  /**
   * Питомец в ванне показывает СТАДИЮ, а не движение: он заходит
   * грязным и после каждого шага становится чище. Кадр выбирается
   * по числу сделанных шагов, поэтому перебора кадров тут нет.
   *
   * Если стадий для вида нет, откатываемся на обычный покой —
   * купание всё равно проходится.
   */
  const bath = petAnimation(speciesId, 'bath');
  const stages = hasOwnAnimation(speciesId, 'bath') ? bath : undefined;
  const spec = stages ?? petAnimation(speciesId, 'idle');
  const stageFrame = stages
    ? stages.frames[Math.min(stepIndex, stages.frames.length - 1)]
    : undefined;

  const tubWidth = Math.min(
    width - theme.space.xl * 2,
    Math.round(width * 0.72),
  );
  const tubHeight = Math.round(tubWidth / TUB_ASPECT);
  // Питомец сидит в ванне: поднят над её дном и уже её по ширине.
  const petHeight = Math.round(tubHeight * 0.92);

  const onDrop = useCallback(
    (index: number) => {
      setStepIndex(prev => {
        if (index !== prev) {
          // Не тот предмет: объясняем, ничего не отнимая.
          setSays(BATH_STEPS[prev].tooEarly);
          shake.value = withSequence(
            withTiming(-1, { duration: 60 }),
            withTiming(1, { duration: 60 }),
            withTiming(0, { duration: 60 }),
          );
          return prev;
        }
        setSays(null);
        // Отдельной радостной позы больше нет: ответ на шаг — сам
        // питомец, который стал чище. Это и есть обратная связь.
        return prev + 1;
      });
    },
    [shake],
  );

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

  const petStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value * 10 }],
  }));

  const hint = finished
    ? 'Чистый и довольный!'
    : says ?? BATH_STEPS[stepIndex].label;

  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.86)"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* сцена с ванной */}
      <View style={{ flex: 1, alignItems: 'center', gap: theme.space.lg }}>
        {/* Питомец выше края ванны: подсказку поднимаем на этот запас,
            иначе она ложится ему на голову. */}
        <PixelPanel
          ledge={6}
          style={{
            marginHorizontal: theme.space.md,
            marginBottom: Math.max(0, petHeight - tubHeight * (1 - PET_BOTTOM)),
          }}
        >
          <Text variant="body" style={{ textAlign: 'center' }}>
            {hint}
          </Text>
        </PixelPanel>

        <View
          ref={petRef}
          style={{
            width: tubWidth,
            height: tubHeight,
            justifyContent: 'flex-end',
          }}
          onLayout={() => {
            petRef.current?.measureInWindow(
              (x: number, y: number, w: number, h: number) => {
                petX.value = x + w / 2;
                petY.value = y + h / 2;
                petR.value = Math.min(w, h) / 2;
              },
            );
          }}
        >
          <Image
            source={TUB_BACK}
            style={{ position: 'absolute', width: tubWidth, height: tubHeight }}
            resizeMode="contain"
          />

          {/* питомец МЕЖДУ слоями — поэтому он внутри ванны */}
          <Animated.View
            style={[
              petStyle,
              {
                position: 'absolute',
                alignSelf: 'center',
                bottom: tubHeight * PET_BOTTOM,
              },
            ]}
            pointerEvents="none"
          >
            {stageFrame && spec ? (
              <Image
                source={stageFrame as never}
                style={{
                  width: Math.round(petHeight * spec.aspect),
                  height: petHeight,
                }}
                resizeMode="contain"
              />
            ) : spec ? (
              <SpriteAnimation
                frames={spec.frames}
                frameMs={spec.frameMs}
                width={Math.round(petHeight * spec.aspect)}
                height={petHeight}
              />
            ) : null}
          </Animated.View>

          <Image
            source={TUB_FRONT}
            style={{ position: 'absolute', width: tubWidth, height: tubHeight }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* предметы колонкой справа */}
      <View style={{ gap: theme.space.sm, paddingRight: theme.space.md }}>
        {BATH_STEPS.map((step, i) => (
          <Item
            key={step.id}
            step={step}
            index={i}
            currentIndex={stepIndex}
            petX={petX}
            petY={petY}
            petR={petR}
            onDrop={onDrop}
          />
        ))}
        {!finished ? (
          <Pressable onPress={onCancel} hitSlop={12}>
            <PixelPanel
              ledge={4}
              style={{ alignItems: 'center', paddingVertical: theme.space.xs }}
            >
              <Text variant="caption">позже</Text>
            </PixelPanel>
          </Pressable>
        ) : null}
      </View>
    </ScreenOverlay>
  );
}
