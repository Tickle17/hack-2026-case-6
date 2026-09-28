import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { PixelSprite } from '@/shared/ui/PixelSprite';
import { SpriteAnimation } from '@/shared/ui/SpriteAnimation';
import { petSprite } from '../config/sprites';
import {
  petAnimation,
  hasAnimations,
  hasOwnAnimation,
  type PetAnimation,
} from '../config/animations';
import { pickTarget, type Point } from '@/entities/room/lib/walkable';
import { thingObstacles, type RoomThing } from '@/entities/room/lib/furniture';
import type { ThingPose } from '@/entities/room/config/furniture';
import { PET_HEIGHT } from '@/entities/room/config/room';
import type { PetEmotion } from '../model/types';

/**
 * Питомец, который живёт в комнате: сам выбирает, куда пойти, идёт туда,
 * останавливается, оглядывается и идёт дальше.
 *
 * Позиция хранится в долях комнаты (0..1) — не зависит от размера экрана.
 * Двигается трансформом в UI-потоке, поэтому фон не пересобирается.
 *
 * Анимация подчинена поведению: идёт — «walk», стоит — «idle»,
 * погладили — «play» у тех, кто умеет, иначе «happy».
 */

/** Долей комнаты в секунду. */
const SPEED = 0.06;
const PAUSE_MS: [number, number] = [900, 2600];
const HAPPY_MS = 1500;
/** Еда дольше радости: столько же, сколько засчитывается дело. */
const EAT_MS = 2600;
/** Сколько питомец остаётся у вещи: поспать, поиграть, посидеть. */
const USE_MS: [number, number] = [3200, 6000];
/**
 * Как часто вместо случайной точки питомец идёт к накопленной вещи.
 *
 * Не всегда: вещь должна оставаться событием, а не единственным
 * местом, где он бывает. И не редко — иначе ребёнок, накопивший на
 * домик, может его ни разу и не увидеть в деле.
 */
const THING_CHANCE = 0.5;

/** Поза у вещи — в анимацию питомца. Слой комнаты про них не знает. */
const POSE: Record<ThingPose, PetAnimation> = {
  sleep: 'sleep',
  ball: 'ball',
  house: 'house',
};

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export type PetActorProps = {
  speciesId: string;
  emotion: PetEmotion;
  /** Размер комнаты на экране в dp. */
  roomWidth: number;
  roomHeight: number;
  /** Питомец стоит на месте (диалог, мини-игра). */
  paused?: boolean;
  /**
   * Живые экранные координаты и размер — их читает полка дел, чтобы
   * понять, донесли ли предмет до питомца. Питомец ходит, поэтому
   * снимок позиции на момент начала перетаскивания не годится.
   */
  xOut?: SharedValue<number>;
  yOut?: SharedValue<number>;
  widthOut?: SharedValue<number>;
  heightOut?: SharedValue<number>;
  /** Разовая реакция: покормили, помыли, поиграли. */
  action?: { name: PetAnimation; at: number } | null;
  /**
   * Цель, к которой питомец должен подойти сам (в долях комнаты).
   * Пока она задана, свободная прогулка отключается.
   */
  goal?: { x: number; y: number } | null;
  /** Питомец дошёл до цели. */
  onArrive?: () => void;
  onPress?: () => void;
  /** Во сколько раз питомец крупнее малыша — по стадии развития. */
  stageScale?: number;
  /**
   * Накопленные вещи, стоящие в комнате.
   *
   * Питомец ходит к ним сам: это и есть награда за накопление —
   * не картинка в меню, а то, чем он пользуется на глазах у ребёнка.
   */
  things?: readonly RoomThing[];
  /**
   * Питомец испачкался. Меняет весь спрайт, а не только значок рядом:
   * грязь должна быть видна на самом питомце, иначе решение «пора
   * в ванну» принимается по подписи, а не по виду.
   */
  dirty?: boolean;
};

export function PetActor({
  stageScale = 1,
  speciesId,
  emotion,
  roomWidth,
  roomHeight,
  paused,
  xOut,
  yOut,
  widthOut,
  heightOut,
  action,
  goal,
  onArrive,
  onPress,
  dirty = false,
  things = [],
}: PetActorProps) {
  const posRef = useRef<Point>({ x: 0.2, y: 0.6 });
  const x = useSharedValue(posRef.current.x * roomWidth);
  const y = useSharedValue(posRef.current.y * roomHeight);
  const [flipped, setFlipped] = useState(false);
  const [moving, setMoving] = useState(false);
  const [celebrating, setCelebrating] = useState<PetAnimation | null>(null);
  /** Вещь, которой питомец сейчас пользуется. */
  const [using, setUsing] = useState<RoomThing | null>(null);

  const animated = hasAnimations(speciesId);
  const petWith: PetAnimation = hasOwnAnimation(speciesId, 'play')
    ? 'play'
    : 'happy';
  /**
   * Грязный лист нарисован как ход, поэтому он заменяет и покой тоже:
   * стоящий чистый питомец рядом с подписью «грязный» противоречил бы
   * сам себе. Радость и еда остаются своими — они короткие.
   */
  const current: PetAnimation =
    celebrating ??
    (using ? POSE[using.pose] : dirty ? 'dirty' : moving ? 'walk' : 'idle');

  // Реакция на дело: покормили — ест, помыли и погуляли — радуется.
  useEffect(() => {
    if (!action) {
      return;
    }
    // Цель ставится слева от миски, а миска нарисована в кадре еды
    // справа от морды: ест питомец всегда лицом вправо.
    if (action.name === 'eat') {
      setFlipped(false);
    }
    setCelebrating(action.name);
    const timer = setTimeout(
      () => setCelebrating(null),
      action.name === 'eat' ? EAT_MS : HAPPY_MS,
    );
    return () => clearTimeout(timer);
  }, [action]);

  const spec = useMemo(
    () => (animated ? petAnimation(speciesId, current) : null),
    [animated, speciesId, current],
  );

  // heightRatio сохраняет разницу поз: сидящий питомец ниже идущего.
  /**
   * Стадия развития меняет РАЗМЕР питомца, а не только подпись.
   * ТЗ 2.5.10 и уточнение заказчика: прогресс от решений должен быть
   * ВИДЕН. Слово «Подросток» в панели этого не даёт.
   */
  /**
   * Высота ЭТАЛОННОЙ позы — по ней стоят ноги и считается место,
   * которое питомец занимает на полу.
   */
  const baseHeightDp = Math.round(PET_HEIGHT * roomHeight * stageScale);
  const heightDp = Math.round(baseHeightDp * (spec?.heightRatio ?? 1));
  /**
   * Насколько поза выше эталона. Спрайт позиционируется верхним краем,
   * поэтому без поправки поза с задранным хвостом росла бы ВНИЗ — и
   * питомец проваливался бы в пол при каждой смене позы.
   */
  const lift = heightDp - baseHeightDp;
  const widthDp = spec ? Math.round(heightDp * spec.aspect) : heightDp;
  // Место на полу — по эталонной позе: поднятый хвост не делает
  // питомца крупнее для карты проходимости.
  const sizeNorm = useMemo(
    () => ({ w: widthDp / roomWidth, h: baseHeightDp / roomHeight }),
    [widthDp, baseHeightDp, roomWidth, roomHeight],
  );
  /**
   * Размер держим в ref, а не в зависимостях блуждания.
   *
   * Он меняется при смене кадра (идущий питомец выше сидящего), а
   * блуждание само эту смену и вызывает. В зависимостях получалась
   * петля: пошёл → сменился кадр → эффект перезапустился → таймер
   * прибытия отменён, и питомец оставался «идущим» навсегда.
   */
  const sizeRef = useRef(sizeNorm);
  useEffect(() => {
    sizeRef.current = sizeNorm;
  }, [sizeNorm]);

  // Вещи — тоже в ref, и по той же причине: получение вещи не должно
  // сбрасывать прогулку, начатую до него.
  const thingsRef = useRef(things);
  const blockedRef = useRef(thingObstacles(things));
  useEffect(() => {
    thingsRef.current = things;
    blockedRef.current = thingObstacles(things);
  }, [things]);

  // Колбэк держим в ref: приходя новой функцией каждый рендер, он
  // перезапускал бы эффект и убивал собственный таймер прибытия.
  const onArriveRef = useRef(onArrive);
  useEffect(() => {
    onArriveRef.current = onArrive;
  }, [onArrive]);

  // Поход к заданной цели: миска, место купания и прочее.
  useEffect(() => {
    if (!goal || paused) {
      return;
    }
    const from = posRef.current;
    const distance = Math.hypot(goal.x - from.x, goal.y - from.y);
    const duration = Math.max(350, (distance / SPEED) * 1000);

    setFlipped(goal.x < from.x);
    setMoving(true);
    posRef.current = goal;

    x.value = withTiming(goal.x * roomWidth, {
      duration,
      easing: Easing.linear,
    });
    y.value = withTiming(goal.y * roomHeight, {
      duration,
      easing: Easing.linear,
    });

    const timer = setTimeout(() => {
      setMoving(false);
      onArriveRef.current?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [goal, paused, roomWidth, roomHeight, x, y]);

  /** Пока питомец ест или радуется, он стоит на месте. */
  const busy = celebrating !== null;

  useEffect(() => {
    if (paused || goal || busy) {
      // Поход к миске сам ведёт «идёт/стоит»: сброс здесь обгонял его,
      // и питомец ехал к миске в позе покоя.
      if (!goal) {
        setMoving(false);
      }
      // Остановился посреди шага — стоит там, где его застали.
      if (busy && !goal) {
        cancelAnimation(x);
        cancelAnimation(y);
        posRef.current = { x: x.value / roomWidth, y: y.value / roomHeight };
      }
      setUsing(null);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const step = (): void => {
      if (!alive) {
        return;
      }
      const from = posRef.current;
      // Иногда питомец идёт не куда попало, а к накопленной вещи.
      // Точка у вещи выбрана человеком и лежит на свободном полу —
      // это проверяет тест в слое комнаты, поэтому здесь никаких
      // исключений из карты проходимости не нужно.
      const thing =
        thingsRef.current.length && Math.random() < THING_CHANCE
          ? thingsRef.current[
              Math.floor(Math.random() * thingsRef.current.length)
            ]
          : null;
      const to = thing
        ? thing.use
        : pickTarget(from, sizeRef.current, Math.random, blockedRef.current);
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const duration = Math.max(500, (distance / SPEED) * 1000);

      // Кадры нарисованы «вправо»; влево — зеркалим.
      setFlipped(to.x < from.x);
      setMoving(true);
      posRef.current = to;

      x.value = withTiming(to.x * roomWidth, {
        duration,
        easing: Easing.linear,
      });
      y.value = withTiming(to.y * roomHeight, {
        duration,
        easing: Easing.linear,
      });

      timer = setTimeout(() => {
        if (!alive) {
          return;
        }
        setMoving(false);
        if (!thing) {
          timer = setTimeout(step, randomInt(...PAUSE_MS));
          return;
        }
        // Пришёл к вещи — пользуется ею, потом идёт дальше.
        setUsing(thing);
        timer = setTimeout(() => {
          if (!alive) {
            return;
          }
          setUsing(null);
          timer = setTimeout(step, randomInt(...PAUSE_MS));
        }, randomInt(...USE_MS));
      }, duration);
    };

    timer = setTimeout(step, randomInt(...PAUSE_MS));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [paused, goal, busy, roomWidth, roomHeight, x, y]);

  const handlePress = useCallback(() => {
    setCelebrating(petWith);
    setTimeout(() => setCelebrating(null), HAPPY_MS);
    onPress?.();
  }, [onPress, petWith]);

  // Отдаём наружу живые координаты и размер.
  useEffect(() => {
    if (widthOut) {
      widthOut.value = widthDp;
    }
    if (heightOut) {
      heightOut.value = heightDp;
    }
  }, [widthDp, heightDp, widthOut, heightOut]);

  /**
   * Живые координаты наружу — отдельной реакцией.
   *
   * Раньше их писали прямо внутри useAnimatedStyle. Так делать нельзя:
   * запись в shared value ломает отслеживание зависимостей стиля, и он
   * перестаёт пересчитываться на каждый кадр. Анимация при этом идёт —
   * просто её никто не показывает: питомец стоял на месте, а в
   * следующий ререндер оказывался уже в конечной точке. Со стороны это
   * читалось как телепортация по комнате.
   */
  useAnimatedReaction(
    () => [x.value, y.value] as const,
    ([nextX, nextY]) => {
      if (xOut) {
        xOut.value = nextX;
      }
      if (yOut) {
        yOut.value = nextY;
      }
    },
  );

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    // Кто ниже по комнате, тот ближе к зрителю. Считаем по линии ног,
    // а не по верхнему краю: иначе высокий питомец оказывался бы
    // «за» вещью, стоя перед ней. Вещи получают тот же порядок из
    // своей нижней кромки, и всё сходится само — без флагов вроде
    // «эту вещь рисовать поверх».
    zIndex: Math.round(y.value + baseHeightDp),
    transform: [{ translateX: x.value }, { translateY: y.value - lift }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={handlePress}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel="Питомец: узнать, как он себя чувствует"
      >
        {spec ? (
          <SpriteAnimation
            frames={spec.frames}
            frameMs={spec.frameMs}
            width={widthDp}
            height={heightDp}
            flipped={flipped}
          />
        ) : (
          <PixelSprite
            grid={petSprite(speciesId, emotion)}
            scale={Math.round(heightDp / 16)}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}
