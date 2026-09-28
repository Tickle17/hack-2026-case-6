import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SpriteAnimation } from '@/shared/ui/SpriteAnimation';
import { useScreenInsets } from '@/shared/ui/ScreenOverlay';
import { useReducedMotion } from '@/shared/ui/motion';
import { petAnimation } from '@/entities/pet/config/animations';
import { LAYER_FAR, LAYER_MID, LAYER_NEAR } from '@/entities/walk/config/walk';
import { ParallaxLayerView } from '@/entities/walk/ui/ParallaxLayerView';

/**
 * Главный экран: куда идти — в свою игру или в демо для проверки.
 *
 * Фон — та же прогулка, что в мини-игре: слои едут с разной скоростью,
 * питомец идёт по дорожке. Движение видно сразу, а экран не пустой.
 */

export type HomeScreenProps = {
  /** Есть сохранённая игра — кнопка продолжает её. */
  hasSave: boolean;
  onStart: () => void;
  onDemo: () => void;
};

/** Скорость переднего плана, dp/с: неспешная прогулка, а не бег. */
const WALK_SPEED = 70;

export function HomeScreen({ hasSave, onStart, onDemo }: HomeScreenProps) {
  const theme = useTheme();
  const insets = useScreenInsets();
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const walk = petAnimation('cat', 'walk');
  const petHeight = Math.round(height * 0.16);
  const bob = useSharedValue(0);

  // Заголовок чуть покачивается — экран живой, даже пока ничего не нажали.
  useEffect(() => {
    bob.value = still
      ? 0
      : withRepeat(
          withSequence(
            withTiming(1, {
              duration: 1400,
              easing: Easing.inOut(Easing.quad),
            }),
            withTiming(0, {
              duration: 1400,
              easing: Easing.inOut(Easing.quad),
            }),
          ),
          -1,
          false,
        );
  }, [bob, still]);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * -6 }],
  }));

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.color.bg, overflow: 'hidden' }}
    >
      {[LAYER_FAR, LAYER_MID, LAYER_NEAR].map((layer, index) => (
        <View
          key={index}
          style={{ position: 'absolute', left: 0, bottom: 0, height, width }}
        >
          <ParallaxLayerView
            layer={layer}
            height={height}
            speedDp={WALK_SPEED}
            running
          />
        </View>
      ))}

      {walk ? (
        <View
          style={{
            position: 'absolute',
            bottom: Math.round(height * 0.1),
            left: Math.round(width / 2 - (petHeight * walk.aspect) / 2),
          }}
        >
          <SpriteAnimation
            frames={walk.frames}
            frameMs={walk.frameMs}
            width={Math.round(petHeight * walk.aspect)}
            height={petHeight}
          />
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + theme.space.xl,
          paddingBottom: insets.bottom + theme.space.lg,
          paddingHorizontal: theme.space.lg,
          justifyContent: 'space-between',
        }}
      >
        <Animated.View style={titleStyle}>
          <PixelPanel
            ledge={8}
            style={{ alignItems: 'center', gap: theme.space.xs }}
          >
            <Text variant="title" style={{ textAlign: 'center' }}>
              ПИТОМЕЦ ФИННИ
            </Text>
            <Text
              variant="caption"
              tone="secondary"
              style={{ textAlign: 'center' }}
            >
              заботься о питомце и учись планировать деньги
            </Text>
          </PixelPanel>
        </Animated.View>

        <View
          style={{
            gap: theme.space.sm,
            marginBottom: petHeight + Math.round(height * 0.12),
          }}
        >
          <PixelPanel
            ledge={8}
            onPress={onStart}
            accessibilityRole="button"
            color={theme.color.brand}
            ledgeColor={theme.color.brandShadow}
            style={{ alignItems: 'center' }}
          >
            <Text variant="button" tone="onColor">
              {hasSave ? 'ПРОДОЛЖИТЬ' : 'НАЧАТЬ'}
            </Text>
          </PixelPanel>
          <PixelPanel
            ledge={8}
            onPress={onDemo}
            accessibilityRole="button"
            color={theme.color.coin}
            ledgeColor={theme.color.coinShadow}
            style={{ alignItems: 'center', gap: 2 }}
          >
            <Text variant="button">ДЕМО</Text>
            <Text variant="caption" tone="secondary">
              тестовый профиль для проверки, дни без ожидания
            </Text>
          </PixelPanel>
        </View>
      </View>
    </View>
  );
}
