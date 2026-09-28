import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Image,
  Pressable,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withRepeat as repeat,
  runOnJS,
  useAnimatedReaction,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { Text } from '@/shared/ui/Text';
import { HintBubble } from '@/shared/ui/HintBubble';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SpriteAnimation } from '@/shared/ui/SpriteAnimation';
import { petAnimation } from '@/entities/pet/config/animations';
import { ParallaxLayerView as Layer } from '@/entities/walk/ui/ParallaxLayerView';
import {
  LAYER_FAR,
  LAYER_MID,
  LAYER_NEAR,
  OBSTACLES,
  SHOP,
  RUN_CONFIG,
} from '@/entities/walk/config/walk';

/**
 * Мини-игра «выгулять» — раннер с параллаксом.
 *
 * ГЛАВНОЕ ОТЛИЧИЕ от обычного раннера: столкновение НЕ заканчивает игру.
 * Питомец спотыкается, встаёт и бежит дальше; дистанция добегается всегда.
 * Прогулка — обязательное ежедневное дело, и ребёнок, который не умеет
 * играть в раннеры, не должен оставаться без неё (docs/minigames.md).
 *
 * СТОЛКНОВЕНИЕ СЧИТАЕТСЯ ПО ГЕОМЕТРИИ, а не по расписанию. Прямоугольники
 * питомца и препятствия сравниваются по той же анимированной величине,
 * которая рисует картинку. Расписание на JS-таймерах не годилось: анимация
 * стартует на первом кадре после монтирования, а таймеры — в момент
 * выполнения эффекта, и они расходились на сотни миллисекунд. Кот наступал
 * в лужу, а попадание не засчитывалось.
 *
 * Габариты СУЖЕНЫ: у кота в прямоугольник попадает хвост, у лужи — брызги.
 * Без сужения питомец «задевает» то, чего не касается.
 *
 * Масштаб — как у динозаврика Google: невысокая полоса и мелкий персонаж.
 * Если приблизить, препятствие выскакивает из-за края экрана, и прыгнуть
 * физически не успеть.
 */

const FINISH_HOLD_MS = 1600;

export type RunGameProps = {
  speciesId: string;
  /** `leashTorn` — питомец споткнулся, и поводок порвался. */
  onDone: (leashTorn: boolean) => void;
  onCancel: () => void;
};

type Placed = { key: string; index: number; at: number };

function Obstacle({
  at,
  totalDp,
  travel,
  petLeft,
  bottom,
  source,
  width,
  height,
}: {
  at: number;
  totalDp: number;
  travel: SharedValue<number>;
  petLeft: number;
  bottom: number;
  source: ImageSourcePropType;
  width: number;
  height: number;
}) {
  // Препятствие оказывается ровно у питомца, когда пройдено at·total —
  // в тот же момент срабатывает проверка столкновения.
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    bottom,
    transform: [{ translateX: petLeft + (at * totalDp - travel.value) }],
  }));

  return (
    <Animated.View style={style}>
      <Image source={source} style={{ width, height }} resizeMode="contain" />
    </Animated.View>
  );
}

export function RunGame({ speciesId, onDone, onCancel }: RunGameProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  const sceneHeight = Math.round(height * RUN_CONFIG.sceneHeightRatio);
  const groundOffset = Math.round(sceneHeight * RUN_CONFIG.groundRatio);
  const petLeft = Math.round(width * RUN_CONFIG.petLeftRatio);
  const totalDp = (RUN_CONFIG.speedDpPerSecond * RUN_CONFIG.durationMs) / 1000;

  const [progress, setProgress] = useState(0);
  const [stumbled, setStumbled] = useState(false);
  const [finished, setFinished] = useState(false);

  const travel = useSharedValue(0);
  const jump = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  /** Индексы уже задетых препятствий — чтобы не считать одно дважды. */
  const hitFlags = useSharedValue<number[]>([]);

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Дошли — питомец радуется у магазина, а не замирает на кадре бега.
  const spec = petAnimation(speciesId, finished ? 'happy' : 'walk');
  const petHeight = Math.round(sceneHeight * RUN_CONFIG.petHeightRatio);
  const petWidth = spec ? Math.round(petHeight * spec.aspect) : petHeight;
  const obstacleHeight = Math.round(
    sceneHeight * RUN_CONFIG.obstacleHeightRatio,
  );

  const placed = useMemo<Placed[]>(() => {
    const { obstacleCount, firstObstacleAt, lastObstacleAt } = RUN_CONFIG;
    const step =
      (lastObstacleAt - firstObstacleAt) / Math.max(1, obstacleCount - 1);
    return Array.from({ length: obstacleCount }, (_, i) => ({
      key: `o${i}`,
      index: Math.floor(Math.random() * OBSTACLES.length),
      at: firstObstacleAt + step * i,
    }));
  }, []);

  const doJump = useCallback(() => {
    if (finished || jump.value !== 0) {
      return;
    }
    jump.value = withSequence(
      withTiming(-sceneHeight * RUN_CONFIG.jumpHeight, {
        duration: RUN_CONFIG.jumpMs / 2,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, {
        duration: RUN_CONFIG.jumpMs / 2,
        easing: Easing.in(Easing.quad),
      }),
    );
  }, [finished, jump, sceneHeight]);

  /** Спотыкание: видно, но ничего не отнимает. */
  const stumble = useCallback(() => {
    setStumbled(true);
    tilt.value = withSequence(
      withTiming(-20, { duration: 110 }),
      withTiming(12, { duration: 110 }),
      withSpring(0, { damping: 8 }),
    );
    // Мигание: ребёнок должен ЗАМЕТИТЬ, что задел препятствие.
    blink.value = withSequence(
      repeat(
        withSequence(
          withTiming(0.25, { duration: RUN_CONFIG.blinkMs / 8 }),
          withTiming(1, { duration: RUN_CONFIG.blinkMs / 8 }),
        ),
        4,
        false,
      ),
      withTiming(1, { duration: 60 }),
    );
  }, [tilt, blink]);

  useEffect(() => {
    // Мир едет равномерно; и картинка, и столкновения считаются от travel.
    travel.value = 0;
    hitFlags.value = [];
    travel.value = withTiming(totalDp, {
      duration: RUN_CONFIG.durationMs,
      easing: Easing.linear,
    });

    const started = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(1, (Date.now() - started) / RUN_CONFIG.durationMs));
    }, 150);

    const finish = setTimeout(() => {
      setFinished(true);
      setProgress(1);
    }, RUN_CONFIG.durationMs);

    return () => {
      clearInterval(tick);
      clearTimeout(finish);
    };
  }, [travel, hitFlags, totalDp]);

  /**
   * Проверка попадания на КАЖДОМ кадре анимации, по тем же координатам,
   * что рисуют препятствие. Прямоугольники сужены: хвост и брызги
   * не должны считаться касанием.
   */
  const petBox = useMemo(() => {
    const insetX = petWidth * RUN_CONFIG.petHitInset;
    return {
      left: petLeft + insetX,
      right: petLeft + petWidth - insetX,
      height: petHeight,
    };
  }, [petLeft, petWidth, petHeight]);

  const obstacleGeometry = useMemo(
    () =>
      placed.map(p => {
        const o = OBSTACLES[p.index];
        const h = Math.round(obstacleHeight * (o.scale ?? 1));
        const w = Math.round(h * (o.width / o.height));
        return { at: p.at, width: w, inset: w * RUN_CONFIG.obstacleHitInset };
      }),
    [placed, obstacleHeight],
  );

  useAnimatedReaction(
    () => travel.value,
    current => {
      'worklet';
      // Пока питомец в воздухе, задеть нельзя.
      if (jump.value < -petHeight * 0.35) {
        return;
      }
      for (let i = 0; i < obstacleGeometry.length; i++) {
        if (hitFlags.value.indexOf(i) !== -1) {
          continue;
        }
        const g = obstacleGeometry[i];
        const left = petLeft + (g.at * totalDp - current) + g.inset;
        const right = left + g.width - g.inset * 2;
        if (right > petBox.left && left < petBox.right) {
          hitFlags.value = [...hitFlags.value, i];
          runOnJS(stumble)();
        }
      }
    },
    [obstacleGeometry, petBox, totalDp, petLeft, petHeight],
  );

  useEffect(() => {
    if (!finished) {
      return;
    }
    const timer = setTimeout(() => onDoneRef.current(stumbled), FINISH_HOLD_MS);
    return () => clearTimeout(timer);
  }, [finished, stumbled]);

  const petStyle = useAnimatedStyle(() => ({
    opacity: blink.value,
    transform: [{ translateY: jump.value }, { rotateZ: `${tilt.value}deg` }],
  }));

  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.92)"
      style={{ justifyContent: 'center', gap: theme.space.lg }}
    >
      <PixelPanel ledge={6} style={{ marginHorizontal: theme.space.lg }}>
        <Text variant="body" style={{ textAlign: 'center' }}>
          {finished ? 'Дошли до магазина!' : 'Нажимай, чтобы перепрыгнуть'}
        </Text>
      </PixelPanel>

      <Pressable onPress={doJump}>
        <View
          style={{
            width,
            height: sceneHeight,
            overflow: 'hidden',
            borderTopWidth: 4,
            borderBottomWidth: 4,
            borderColor: theme.color.border,
          }}
        >
          <Layer
            layer={LAYER_FAR}
            height={sceneHeight}
            speedDp={RUN_CONFIG.speedDpPerSecond}
            running={!finished}
          />
          <Layer
            layer={LAYER_MID}
            height={sceneHeight}
            speedDp={RUN_CONFIG.speedDpPerSecond}
            running={!finished}
          />
          <Layer
            layer={LAYER_NEAR}
            height={sceneHeight}
            speedDp={RUN_CONFIG.speedDpPerSecond}
            running={!finished}
          />

          {placed.map(p => {
            const o = OBSTACLES[p.index];
            const h = Math.round(obstacleHeight * (o.scale ?? 1));
            return (
              <Obstacle
                key={p.key}
                at={p.at}
                totalDp={totalDp}
                travel={travel}
                petLeft={petLeft}
                bottom={groundOffset}
                source={o.source}
                width={Math.round(h * (o.width / o.height))}
                height={h}
              />
            );
          })}

          {/* магазин стоит чуть дальше финиша: питомец подбегает к нему */}
          <Obstacle
            at={1.04}
            totalDp={totalDp}
            travel={travel}
            petLeft={petLeft}
            bottom={groundOffset}
            source={SHOP.source}
            width={Math.round(sceneHeight * 0.7 * (SHOP.width / SHOP.height))}
            height={Math.round(sceneHeight * 0.7)}
          />

          {/* питомец бежит на месте, мир едет мимо */}
          <Animated.View
            style={[
              petStyle,
              { position: 'absolute', left: petLeft, bottom: groundOffset },
            ]}
          >
            {spec ? (
              <SpriteAnimation
                frames={spec.frames}
                frameMs={spec.frameMs}
                width={petWidth}
                height={petHeight}
              />
            ) : null}
          </Animated.View>
        </View>
      </Pressable>

      {/* путь до магазина */}
      <View style={{ marginHorizontal: theme.space.lg, gap: theme.space.xs }}>
        <View
          style={{
            height: 20,
            backgroundColor: theme.color.surfaceElevated,
            borderWidth: 4,
            borderColor: theme.color.border,
          }}
        >
          <View
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              backgroundColor: theme.color.brand,
            }}
          />
        </View>
        {stumbled ? (
          <HintBubble text="Порвался поводок — нужно купить новый" />
        ) : null}
      </View>

      {!finished ? (
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          style={{ alignSelf: 'center' }}
        >
          <PixelPanel ledge={4} style={{ paddingHorizontal: theme.space.lg }}>
            <Text variant="caption">позже</Text>
          </PixelPanel>
        </Pressable>
      ) : null}
    </ScreenOverlay>
  );
}
