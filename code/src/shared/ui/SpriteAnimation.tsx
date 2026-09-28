import React, { useEffect, useState } from 'react';
import { View, Image, type ImageSourcePropType } from 'react-native';
import { useReducedMotion } from './motion';

/**
 * Покадровая анимация из PNG.
 *
 * Все кадры смонтированы сразу и переключаются прозрачностью, а не сменой
 * `source`: при смене источника Android заново декодирует картинку, и на
 * первом проходе анимации виден мигающий пропуск кадра.
 *
 * Кадры нарезаны tools/assets/prepare_pets.py с общим выравниванием —
 * поэтому спрайт не «дёргается» при перелистывании.
 */

export type SpriteAnimationProps = {
  frames: ImageSourcePropType[];
  /**
   * Миллисекунд на кадр. Числом — поровну на все; массивом — своя
   * длительность каждому.
   *
   * Разная нужна для морганий: у всех питомцев кадры покоя идут
   * «глаза открыты → прищур → зажмурился → открыты». При равной
   * длительности половина времени проходит с закрытыми глазами,
   * и это читается не как моргание, а как тик.
   */
  frameMs?: number | number[];
  width: number;
  height: number;
  /** Развернуть по горизонтали — питомец идёт влево. */
  flipped?: boolean;
  /** Остановить на первом кадре. */
  paused?: boolean;
  /** Проиграть один раз и остановиться на последнем кадре. */
  once?: boolean;
  onFinish?: () => void;
};

export function SpriteAnimation({
  frames,
  frameMs = 160,
  width,
  height,
  flipped,
  paused,
  once,
  onFinish,
}: SpriteAnimationProps) {
  const [index, setIndex] = useState(0);

  /** Сколько держать кадр под номером i. */
  // При выключенных анимациях спрайт замирает на первом кадре:
  // персонаж остаётся на месте и виден, просто не шевелится.
  const still = useReducedMotion();

  useEffect(() => {
    setIndex(0);
  }, [frames]);

  useEffect(() => {
    if (paused || still || frames.length <= 1) {
      return;
    }
    // Длительность у кадров может быть разной, поэтому не setInterval,
    // а цепочка таймеров: каждый кадр сам назначает следующий.
    let timer: ReturnType<typeof setTimeout>;
    const durationAt = (i: number): number =>
      Array.isArray(frameMs) ? frameMs[i] ?? frameMs[0] ?? 160 : frameMs;

    const schedule = (i: number): void => {
      timer = setTimeout(() => {
        const nextIndex = i + 1;
        if (nextIndex >= frames.length) {
          if (once) {
            onFinish?.();
            setIndex(frames.length - 1);
            return;
          }
          setIndex(0);
          schedule(0);
          return;
        }
        setIndex(nextIndex);
        schedule(nextIndex);
      }, durationAt(i));
    };

    schedule(0);
    return () => clearTimeout(timer);
  }, [frames, frameMs, paused, still, once, onFinish]);

  return (
    <View style={{ width, height, transform: [{ scaleX: flipped ? -1 : 1 }] }}>
      {frames.map((frame, i) => (
        <Image
          key={i}
          source={frame}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width,
            height,
            opacity: i === index ? 1 : 0,
          }}
        />
      ))}
    </View>
  );
}
