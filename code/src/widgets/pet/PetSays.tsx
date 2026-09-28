import React from 'react';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { SpeechBubble } from '@/shared/ui/SpeechBubble';

/**
 * Реплика питомца над ним самим: ребёнок нажал на питомца и спросил,
 * почему тому так. Следит за питомцем, как и DirtyMark.
 */

export type PetSaysProps = {
  message: string | null;
  petX: SharedValue<number>;
  petY: SharedValue<number>;
  petWidth: SharedValue<number>;
  roomWidth: number;
};

const WIDTH = 280;
/** Сколько облачко занимает над питомцем вместе с хвостиком. */
const LIFT = 96;
/** Отступ от стен комнаты, чтобы облачко не прилипало к краю экрана. */
const EDGE = 8;

export function PetSays({
  message,
  petX,
  petY,
  petWidth,
  roomWidth,
}: PetSaysProps) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: Math.max(
      EDGE,
      Math.min(
        roomWidth - WIDTH - EDGE,
        petX.value + petWidth.value / 2 - WIDTH / 2,
      ),
    ),
    top: petY.value - LIFT,
    width: WIDTH,
    alignItems: 'center',
    zIndex: Math.round(petY.value) + 10_000,
  }));

  return (
    <Animated.View pointerEvents="none" style={style}>
      <SpeechBubble message={message} />
    </Animated.View>
  );
}
