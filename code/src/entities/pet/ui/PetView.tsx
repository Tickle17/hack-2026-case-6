import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useReducedMotion } from '@/shared/ui/motion';
import { runOnJS } from 'react-native-reanimated';
import type { PetEmotion, PetSpecies } from '../model/types';

/**
 * ВРЕМЕННАЯ графика питомца: примитивы в shape language Duolingo —
 * плоско, скруглённо, объём только нижним уступом.
 *
 * Питомец — живой объект, а не картинка:
 *  - ПОГЛАДИТЬ = провести пальцем по телу (Pan). Питомец тянется за рукой.
 *  - ТКНУТЬ = тап. Отдельная короткая реакция удивления.
 *
 * Оба жеста БЕСПЛАТНЫ и не меняют характеристики — ласка не должна
 * конкурировать с экономикой, см. принцип 5 в docs/game-design.md.
 */

const SIZE = {
  round: { w: 156, h: 156, r: 78 },
  tall: { w: 118, h: 178, r: 56 },
  wide: { w: 190, h: 132, r: 62 },
} as const;

function darken(hex: string, amount = 0.18): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const EYE: Record<PetEmotion, { h: number; curve: boolean }> = {
  happy: { h: 10, curve: true },
  celebrating: { h: 10, curve: true },
  content: { h: 18, curve: false },
  sad: { h: 12, curve: false },
  hungry: { h: 20, curve: false },
  dirty: { h: 14, curve: false },
  sleepy: { h: 4, curve: false },
};

const MOUTH: Record<PetEmotion, { w: number; h: number; down: boolean }> = {
  happy: { w: 44, h: 22, down: false },
  celebrating: { w: 52, h: 30, down: false },
  content: { w: 30, h: 12, down: false },
  sad: { w: 34, h: 16, down: true },
  hungry: { w: 26, h: 26, down: false },
  dirty: { w: 30, h: 14, down: true },
  sleepy: { w: 20, h: 10, down: false },
};

export type PetViewProps = {
  species: PetSpecies;
  emotion: PetEmotion;
  color?: string;
  /** Питомца погладили — движением пальца по телу. Реакция без изменения характеристик. */
  onStroke?: () => void;
  /** Питомца ткнули пальцем — короткая реакция удивления. */
  onPoke?: () => void;
  /** Внешний импульс реакции: меняется число — питомец радуется. */
  reactAt?: number;
};

/** Сколько пикселей надо провести пальцем, чтобы это засчиталось за поглаживание. */
const STROKE_STEP = 110;

export function PetView({
  species,
  emotion,
  color,
  onStroke,
  onPoke,
  reactAt = 0,
}: PetViewProps) {
  const size = SIZE[species.shape];
  const body = color ?? species.palette.primary;
  const ledge = darken(body);
  const eye = EYE[emotion];
  const mouth = MOUTH[emotion];

  const bob = useSharedValue(0);
  const squish = useSharedValue(1);
  const wiggle = useSharedValue(0);
  const tilt = useSharedValue(0);
  const lean = useSharedValue(0);
  const strokeAccum = useSharedValue(0);
  const prevX = useSharedValue(0);
  const prevY = useSharedValue(0);

  // Дыхание/покачивание в простое.
  //
  // Подчиняется настройке «меньше движения» (ТЗ 3.6): это украшение,
  // без которого игра работает. Дыхание идёт бесконечно и на всех
  // экранах сразу — питомец виден и за окном плана, — поэтому именно
  // оно не давало экрану успокоиться.
  const still = useReducedMotion();
  useEffect(() => {
    if (still) {
      bob.value = 0;
      return;
    }
    bob.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [bob, still]);

  // Реакция на внешнее событие (покормили, помыли, поиграли)
  useEffect(() => {
    if (reactAt === 0) {
      return;
    }
    squish.value = withSequence(
      withTiming(1.14, { duration: 130 }),
      withSpring(1, { damping: 6, stiffness: 200 }),
    );
    wiggle.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(0, { duration: 80 }),
    );
  }, [reactAt, squish, wiggle]);

  /**
   * Поглаживание — это ДВИЖЕНИЕ пальцем по телу питомца, а не тап.
   * Питомец наклоняется вслед за рукой и слегка приминается под пальцем.
   * Реплика срабатывает не на каждый кадр, а раз в STROKE_STEP пикселей пути —
   * иначе питомец тараторит.
   */
  const stroke = Gesture.Pan()
    .minDistance(4)
    .onBegin(() => {
      'worklet';
      squish.value = withSpring(1.05, { damping: 12, stiffness: 220 });
      prevX.value = 0;
      prevY.value = 0;
      strokeAccum.value = 0;
    })
    .onUpdate(e => {
      'worklet';
      // наклон вслед за пальцем
      tilt.value = Math.max(-12, Math.min(12, e.translationX / 6));
      lean.value = Math.max(-14, Math.min(14, e.translationY / 6));

      // changeX/changeY есть не во всех версиях gesture-handler — считаем дельту сами
      const step =
        Math.abs(e.translationX - prevX.value) +
        Math.abs(e.translationY - prevY.value);
      prevX.value = e.translationX;
      prevY.value = e.translationY;
      strokeAccum.value += step;
    })
    .onFinalize(() => {
      'worklet';
      tilt.value = withSpring(0, { damping: 10, stiffness: 160 });
      lean.value = withSpring(0, { damping: 10, stiffness: 160 });
      squish.value = withSequence(
        withTiming(1.08, { duration: 110 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
      // Колбэк дёргаем ОДИН раз на завершении жеста, а не на каждом кадре
      // onUpdate: частые вызовы runOnJS из update-воркета в Worklets 4
      // не доезжают до RN-рантайма, и питомец молчит.
      const stroked = strokeAccum.value >= STROKE_STEP;
      strokeAccum.value = 0;
      if (stroked && onStroke) {
        runOnJS(onStroke)();
      }
    });

  /** Тап — это ткнуть, а не погладить. Отдельная короткая реакция. */
  const poke = Gesture.Tap().onEnd(() => {
    'worklet';
    squish.value = withSequence(
      withTiming(0.88, { duration: 90 }),
      withSpring(1, { damping: 5, stiffness: 260 }),
    );
    if (onPoke) {
      runOnJS(onPoke)();
    }
  });

  // Race, а НЕ Exclusive: Exclusive заставляет Tap ждать провала Pan и в этой
  // связке глушит поглаживание целиком. Race отдаёт победу тому, кто
  // активировался первым — провёл пальцем значит гладит, коснулся значит ткнул.
  const gesture = Gesture.Race(stroke, poke);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value + lean.value },
      { translateX: tilt.value },
      { scale: squish.value },
      { rotateZ: `${wiggle.value + tilt.value * 0.4}deg` },
    ],
  }));

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[bodyStyle, styles.center]}>
          <View
            style={{
              width: size.w,
              height: size.h,
              borderRadius: size.r,
              backgroundColor: body,
              borderBottomWidth: 8,
              borderBottomColor: ledge,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <View style={[styles.gloss, { width: size.w * 0.42 }]} />
            <View style={styles.eyes}>
              {[0, 1].map(i => (
                <View
                  key={i}
                  style={{
                    width: 16,
                    height: eye.h,
                    borderRadius: 8,
                    backgroundColor: '#3C3C3C',
                    borderBottomLeftRadius: eye.curve ? 0 : 8,
                    borderBottomRightRadius: eye.curve ? 0 : 8,
                  }}
                />
              ))}
            </View>
            <View
              style={{
                width: mouth.w,
                height: mouth.h,
                backgroundColor: '#3C3C3C',
                borderBottomLeftRadius: mouth.down ? 0 : mouth.w,
                borderBottomRightRadius: mouth.down ? 0 : mouth.w,
                borderTopLeftRadius: mouth.down ? mouth.w : 0,
                borderTopRightRadius: mouth.down ? mouth.w : 0,
              }}
            />
          </View>
        </Animated.View>
      </GestureDetector>
      <View style={[styles.shadow, { width: size.w * 0.55 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  center: { alignItems: 'center' },
  eyes: { flexDirection: 'row', gap: 22, alignItems: 'flex-end' },
  gloss: {
    position: 'absolute',
    top: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  shadow: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.10)',
    marginTop: 14,
  },
});
