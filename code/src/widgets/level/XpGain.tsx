import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { useReducedMotion } from '@/shared/ui/motion';
import {
  levelFor,
  levelProgress,
  levelStart,
  type XpLine,
} from '@/entities/pet/lib/level';

/**
 * Опыт за день: строки итога перетекают в полосу уровня.
 *
 * Как это выглядит. Строки загораются по одной сверху вниз. Из каждой
 * вылетает звёздочка с числом и по дуге падает в полосу уровня —
 * полоса наполняется ровно на эту строку, счётчик под ней щёлкает.
 * Дошла до конца — вспышка «новый уровень», полоса начинается заново
 * с остатком.
 *
 * Зачем по одной, а не сразу суммой. Суммой ребёнок увидел бы «+28»,
 * но не понял бы, за что. Когда каждая звёздочка вылетает из своей
 * строки, связь «решение → рост» видна глазами: вот за дела, вот за
 * план, вот за бантик.
 *
 * При выключенных анимациях (ТЗ 3.6) полоса сразу стоит в итоговом
 * положении, строки видны все — смысл не зависит от движения.
 */

export type XpGainProps = {
  lines: readonly XpLine[];
  /** Опыт до этого дня — с него полоса начинает наполняться. */
  xpBefore: number;
};

/** Пауза между строками: успеть прочитать строку до следующей. */
const STEP_MS = 750;
/** Полёт звёздочки из строки в полосу. */
const FLY_MS = 480;
/** Сколько держится вспышка нового уровня. */
const FLASH_MS = 900;

type Box = { y: number; h: number; w: number };

function XpRow({
  line,
  lit,
  flying,
  target,
  box,
  onLayout,
  still,
}: {
  line: XpLine;
  lit: boolean;
  flying: boolean;
  target: Box | null;
  box: Box | null;
  onLayout: (b: Box) => void;
  still: boolean;
}) {
  const theme = useTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    if (flying && !still) {
      t.value = 0;
      t.value = withTiming(1, { duration: FLY_MS });
    }
  }, [flying, still, t]);

  // Дуга: по вертикали разгоняется (падает), по горизонтали тормозит.
  // Из этих двух разных плавностей и получается кривая, а не прямая.
  const dy = target && box ? target.y + target.h / 2 - (box.y + box.h / 2) : 0;
  const dx = box ? -box.w * 0.4 : 0;
  const starStyle = useAnimatedStyle(() => {
    const down = Easing.in(Easing.quad)(t.value);
    const side = Easing.out(Easing.quad)(t.value);
    return {
      opacity: t.value === 0 || t.value === 1 ? 0 : 1,
      transform: [
        { translateY: down * dy },
        { translateX: side * dx },
        { scale: 1.3 - 0.6 * t.value },
      ],
    };
  });

  return (
    <View
      onLayout={e => {
        const { y, height, width } = e.nativeEvent.layout;
        onLayout({ y, h: height, w: width });
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        opacity: lit ? 1 : 0.35,
      }}
    >
      <Text variant="caption" tone={lit ? 'brand' : 'muted'}>
        {lit ? '✓' : '·'}
      </Text>
      <Text variant="caption" style={{ flex: 1 }}>
        {line.title}
      </Text>
      <Text variant="button" tone="coin">
        +{line.xp} ⭐
      </Text>
      {/* Летящая копия. Своя строка остаётся на месте: ребёнок видит,
          откуда звезда вылетела, и после полёта. */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', right: 0 }, starStyle]}
      >
        <Text variant="button" tone="coin">
          +{line.xp} ⭐
        </Text>
      </Animated.View>
    </View>
  );
}

function XpBar({
  level,
  fill,
  caption,
  flash,
  onLayout,
}: {
  level: number;
  fill: SharedValue<number>;
  caption: string;
  flash: boolean;
  onLayout: (b: Box) => void;
}) {
  const theme = useTheme();
  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, fill.value)) * 100}%`,
  }));

  return (
    <View
      onLayout={e => {
        const { y, height, width } = e.nativeEvent.layout;
        onLayout({ y, h: height, w: width });
      }}
      style={{ gap: theme.space.xs }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="button">Уровень {level}</Text>
        <Text variant="caption" tone="secondary">
          {caption}
        </Text>
      </View>
      <View
        style={{
          height: 22,
          borderWidth: 3,
          borderColor: theme.color.border,
          backgroundColor: theme.color.surfaceElevated,
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: flash ? theme.color.brand : theme.color.coin,
            },
            barStyle,
          ]}
        />
      </View>
      {flash ? (
        <Text variant="button" tone="brand" style={{ textAlign: 'center' }}>
          НОВЫЙ УРОВЕНЬ!
        </Text>
      ) : null}
    </View>
  );
}

export function XpGain({ lines, xpBefore }: XpGainProps) {
  const theme = useTheme();
  const still = useReducedMotion();
  const total = lines.reduce((s, l) => s + l.xp, 0);
  const xpAfter = xpBefore + total;

  const [lit, setLit] = useState(still ? lines.length : 0);
  const [flying, setFlying] = useState(-1);
  const [shownXp, setShownXp] = useState(still ? xpAfter : xpBefore);
  const [barLevel, setBarLevel] = useState(
    levelFor(still ? xpAfter : xpBefore),
  );
  const [flash, setFlash] = useState(false);
  const fill = useSharedValue(levelProgress(still ? xpAfter : xpBefore).ratio);

  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [barBox, setBarBox] = useState<Box | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (still || lines.length === 0) {
      return;
    }
    // Последовательность разворачивается в JS-таймерах: шагов немного,
    // а зависимость «следующая строка после приземления предыдущей»
    // так читается прямо, без вложенных цепочек анимаций.
    let at = 500;
    let shown = xpBefore;
    const later = (ms: number, fn: () => void) =>
      timers.current.push(setTimeout(fn, ms));

    lines.forEach((line, i) => {
      later(at, () => {
        setLit(i + 1);
        setFlying(i);
      });
      at += FLY_MS;

      const next = shown + line.xp;
      const levelUp = levelFor(next) > levelFor(shown);
      const landedAt = at;
      later(landedAt, () => {
        setShownXp(levelUp ? levelStart(levelFor(next)) : next);
        fill.value = withTiming(levelUp ? 1 : levelProgress(next).ratio, {
          duration: 320,
          easing: Easing.out(Easing.quad),
        });
        if (levelUp) {
          setFlash(true);
        }
      });

      if (levelUp) {
        // Полоса доходит до конца, вспыхивает, и только потом
        // начинается заново — иначе переход уровня пролетает незаметно.
        at += FLASH_MS;
        later(at, () => {
          setFlash(false);
          setBarLevel(levelFor(next));
          setShownXp(next);
          fill.value = withSequence(
            withTiming(0, { duration: 1 }),
            withTiming(levelProgress(next).ratio, { duration: 360 }),
          );
        });
      }
      shown = next;
      at += STEP_MS - FLY_MS;
    });
    later(at, () => setFlying(-1));

    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
    // Анимация идёт один раз на показ итога.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Подпись считаем от уровня, который сейчас на полосе, а не от
  // опыта: во время вспышки опыт уже на новом уровне, а полоса ещё
  // на старом и должна показывать «40 из 40», а не «0 из 60».
  const barStart = levelStart(barLevel);
  const barNeed = levelStart(barLevel + 1) - barStart;
  const caption = `${Math.min(shownXp - barStart, barNeed)} из ${barNeed}`;

  return (
    <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="button">ОПЫТ ПИТОМЦА</Text>
        <Text variant="button" tone="coin">
          +{total} ⭐
        </Text>
      </View>

      {lines.length === 0 ? (
        <Text variant="caption" tone="secondary">
          Сегодня без опыта. Сделай все дела и потрать как задумал — завтра
          питомец подрастёт.
        </Text>
      ) : (
        lines.map((line, i) => (
          <XpRow
            key={line.id}
            line={line}
            lit={i < lit}
            flying={flying === i}
            target={barBox}
            box={boxes[line.id] ?? null}
            onLayout={b => setBoxes(prev => ({ ...prev, [line.id]: b }))}
            still={still}
          />
        ))
      )}

      <XpBar
        level={barLevel}
        fill={fill}
        caption={caption}
        flash={flash}
        onLayout={setBarBox}
      />
    </PixelPanel>
  );
}
