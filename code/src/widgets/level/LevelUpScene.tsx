import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { useReducedMotion } from '@/shared/ui/motion';
import { petFrames } from '@/entities/pet/lib/appearance';
import { isGrownUp, levelScale, levelTitle } from '@/entities/pet/lib/level';

/**
 * Новый уровень: питомец вырастает на глазах.
 *
 * Показываем не цифру «уровень 3», а само изменение: питомец стоит в
 * прежнем размере, потом подрастает до нового — с пружинкой, как будто
 * потянулся. Ребёнок видит, что рост настоящий, а не надпись.
 *
 * После третьего уровня размер больше не меняется — питомец взрослеет
 * видом, а не ростом. Тогда вместо «подрос» пишем «повзрослел», и
 * анимация — лёгкий подпрыг без увеличения.
 *
 * Причина — строками опыта этого дня: ТЗ 2.5.10 требует объяснить,
 * ПОЧЕМУ питомец изменился, а не просто сообщить об этом.
 */

export type LevelUpSceneProps = {
  from: number;
  to: number;
  petName: string;
  speciesId: string | null;
  colorId: string;
  /** За что пришёл опыт сегодня — названия строк итога. */
  reasons: string[];
  onClose: () => void;
};

/** Размер питомца на этом экране при первом уровне. */
const BASE = 150;

export function LevelUpScene({
  from,
  to,
  petName,
  speciesId,
  colorId,
  reasons,
  onClose,
}: LevelUpSceneProps) {
  const theme = useTheme();
  const still = useReducedMotion();
  const grew = levelScale(to) > levelScale(from);

  const scale = useSharedValue(still ? levelScale(to) : levelScale(from));
  const lift = useSharedValue(0);

  useEffect(() => {
    if (still) {
      return;
    }
    if (grew) {
      // Пауза, чтобы ребёнок успел увидеть «как было», потом рост
      // с небольшим перелётом — «потянулся».
      scale.value = withDelay(
        600,
        withSequence(
          withTiming(levelScale(to) * 1.12, {
            duration: 420,
            easing: Easing.out(Easing.quad),
          }),
          withSpring(levelScale(to), { damping: 7, stiffness: 140 }),
        ),
      );
    } else {
      lift.value = withDelay(
        500,
        withSequence(
          withTiming(-24, { duration: 220, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
        ),
      );
    }
  }, [still, grew, from, to, scale, lift]);

  const petStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.value },
      // Растём от ног, а не от центра: питомец стоит на полу.
      { translateY: (BASE * (1 - scale.value)) / 2 },
      { scale: scale.value },
    ],
  }));

  // Новый уровень показываем в новом виде: на четвёртом питомец
  // впервые появляется взрослым — если такие картинки уже есть.
  const frame = speciesId
    ? petFrames(speciesId, 'happy', colorId, isGrownUp(to))[0]
    : null;

  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.88)"
      style={{ justifyContent: 'center', padding: theme.space.lg }}
    >
      <View style={{ alignItems: 'center', gap: theme.space.md }}>
        <Text variant="display" tone="coin" style={{ textAlign: 'center' }}>
          УРОВЕНЬ {to}!
        </Text>

        {/* Место под самый большой размер, чтобы рост не толкал
            вёрстку вниз прямо во время анимации. */}
        <View
          style={{
            height: BASE * levelScale(to) + 12,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {frame ? (
            <Animated.View style={petStyle}>
              <Image
                source={frame as never}
                style={{ width: BASE, height: BASE }}
                resizeMode="contain"
              />
            </Animated.View>
          ) : null}
        </View>

        <PixelPanel
          ledge={6}
          style={{ gap: theme.space.sm, alignSelf: 'stretch' }}
        >
          <Text variant="title" style={{ textAlign: 'center' }}>
            {petName} {grew ? 'подрос' : 'повзрослел'}!
          </Text>
          <Text
            variant="caption"
            tone="secondary"
            style={{ textAlign: 'center' }}
          >
            {levelTitle(from) === levelTitle(to)
              ? `${levelTitle(to)}: уровень ${from} → ${to}`
              : `${levelTitle(from)} → ${levelTitle(to)}`}
          </Text>
          {reasons.length ? (
            <View style={{ gap: theme.space.xs }}>
              <Text variant="body">Это благодаря тебе:</Text>
              {reasons.map(r => (
                <Text key={r} variant="caption">
                  ✓ {r}
                </Text>
              ))}
            </View>
          ) : null}
          <PixelPanel
            ledge={6}
            onPress={onClose}
            color={theme.color.brand}
            ledgeColor={theme.color.brandShadow}
            style={{ alignItems: 'center' }}
          >
            <Text variant="button" tone="onColor">
              УРА!
            </Text>
          </PixelPanel>
        </PixelPanel>
      </View>
    </ScreenOverlay>
  );
}
