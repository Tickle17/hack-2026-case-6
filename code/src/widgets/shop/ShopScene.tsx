import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  View,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { ScreenOverlay } from '@/shared/ui/ScreenOverlay';
import { Coins } from '@/shared/ui/Coins';
import { HintPaw } from '@/shared/ui/HintPaw';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { sceneImage, ROOM_ASPECT } from '@/entities/room/config/room';
import { actorImage } from '@/entities/characters/config/actor-images';
import {
  ITEMS,
  affordability,
  missingNeeds,
  treatBoughtToday,
  shoppingList,
  shopPhase,
  mustCover,
  priceFor,
  goalById,
  goalProgress,
} from '@/entities/scenario';
import type {
  Affordability,
  CoverOption,
  GameState,
  ItemSpec,
} from '@/entities/scenario';
import { plural } from '@/shared/lib/plural';

/**
 * Магазин в конце прогулки — полноценная сцена, а не панель поверх комнаты.
 *
 * Игра прямолинейная: сначала берём всё нужное, потом продавец предлагает
 * приятное. Ошибиться нельзя — можно только увидеть, что на игрушку
 * не хватило, и уйти копить.
 *
 * Порядок фаз и есть урок «сначала то, без чего не обойтись»: он не
 * написан текстом, а встроен в порядок действий.
 *
 * Поза продавца следует фазе: показывает на полку, когда надо взять
 * нужное; протягивает покупку, когда предлагает приятное.
 */

type Phase = 'needs' | 'treats' | 'done';

export type ShopSceneProps = {
  state: GameState;
  /** На какой элемент показывает подсказка. */
  hintTarget?: string | null;
  /** Провести покупку: списать из направления и выдать товар. */
  onBuy: (item: ItemSpec) => void;
  /** Взять недостающее из копилки и сразу купить обязательный товар. */
  onCover: (item: ItemSpec, option: CoverOption) => void;
  /** Первое знакомство с продавцом закончилось. */
  onGreeted: () => void;
  onClose: () => void;
};

/** Отметка «продавец уже знакомился». */
export const SHOP_GREETED_FLAG = 'shop.greeted';

/**
 * Продавец называет, что именно взять. До первой покупки — «Сначала возьми
 * шампунь и корм для питомца», после — «Осталось купить поводок»: иначе
 * на каждую покупку звучит одно и то же «сначала», как будто ребёнок
 * ничего ещё не взял.
 */
function needsLine(items: readonly ItemSpec[], boughtSome: boolean): string {
  const names = items.map(item => item.title.toLowerCase());
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(', ')} и ${names[names.length - 1]}`
      : names[0];
  return boughtSome
    ? `Осталось купить ${list}.`
    : `Сначала возьми ${list} для питомца.`;
}

/** Первый заход: продавец знакомится и сам советует нужное. */
const GREETING = [
  'Какой у тебя милый питомец!',
  'Вот этот корм и шампунь подойдут ему лучше всего.',
];

const TREATS = ITEMS.filter(i => i.kind === 'treat');

const SAY: Record<Phase, string | null> = {
  needs: null,
  treats: 'Всё нужное есть! Может, порадуешь питомца?',
  done: 'Сегодня не хватает монет. Приходи, когда накопишь.',
};

/** На нужное в кошельке не хватает, но есть копилка: решает ребёнок. */
const COVERABLE_LINE =
  'В кошельке не хватает монет. Можно взять из копилки — или прийти завтра.';

const POSE: Record<Phase, 'point' | 'gift' | 'talk'> = {
  needs: 'point',
  treats: 'gift',
  done: 'talk',
};

/**
 * Карточка товара.
 *
 * Показывает цену, ЯРЛЫК КАТЕГОРИИ и влияние на питомца — всё три
 * требует ТЗ 2.5.6 до покупки, а не после.
 *
 * Недоступность передаётся подписью, а не только прозрачностью: цвет
 * и яркость не должны быть единственным носителем смысла (ТЗ 3.6).
 */
function ItemCard({
  item,
  verdict,
  count,
  bought,
  mustShort,
  price,
  onPress,
}: {
  item: ItemSpec;
  /** Цена сегодня: в день скидки у развлечений она ниже обычной. */
  price: number;
  verdict: Affordability;
  /** Сколько не хватает в «Обязательном» на этот товар; null — хватает. */
  mustShort: number | null;
  /** Лакомство уже куплено сегодня — второй раз не продают. */
  bought: boolean;
  /** Сколько ещё нужно на сегодня и завтра; 0 — у лакомств. */
  count: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  // Обязательное не блокируем: нехватку можно покрыть, окно подскажет чем.
  // Нехватку не прячем серой карточкой: нажатие объясняет, что делать.
  const blocked = bought;

  return (
    <PixelPanel
      ledge={6}
      onPress={blocked ? undefined : onPress}
      color={blocked ? theme.color.surfaceElevated : theme.color.surface}
      style={{ gap: theme.space.xs, opacity: blocked ? 0.65 : 1 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="button" tone={blocked ? 'muted' : 'primary'}>
          {item.title}
        </Text>
        <Coins amount={price} tone={blocked ? 'muted' : 'coin'} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: theme.space.sm,
        }}
      >
        <Text variant="caption" tone="secondary" style={{ flexShrink: 1 }}>
          {mustShort !== null
            ? `обязательное · не хватает ${mustShort} ${plural(
                mustShort,
                'монеты',
                'монет',
                'монет',
              )}`
            : [
                item.category === 'must' ? 'обязательное' : 'развлечения',
                price < item.price ? `скидка, было ${item.price}` : null,
                count > 1 ? `нужно ещё ${count}` : null,
                item.effectHint ?? null,
              ]
                .filter(Boolean)
                .join(' · ')
                // «радость +30» не разрывается переносом строки.
                .replace(/ \+/g, '\u00A0+')}
        </Text>
        {mustShort !== null ? null : bought ? (
          <Text variant="caption" tone="muted">
            уже купил сегодня
          </Text>
        ) : verdict.kind === 'short' ? (
          <Text variant="caption" tone="muted">
            не хватает {verdict.short}
          </Text>
        ) : null}
      </View>
    </PixelPanel>
  );
}

export function ShopScene({
  state,
  hintTarget,
  onBuy,
  onCover,
  onGreeted,
  onClose,
}: ShopSceneProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  /** Товар, по которому спросили подтверждение. */
  const [pending, setPending] = useState<ItemSpec | null>(null);
  const [greetingStep, setGreetingStep] = useState(
    state.flags[SHOP_GREETED_FLAG] ? GREETING.length : 0,
  );
  const greeting =
    greetingStep < GREETING.length ? GREETING[greetingStep] : null;
  const nextGreeting = (): void => {
    if (greetingStep + 1 >= GREETING.length) {
      onGreeted();
    }
    setGreetingStep(step => step + 1);
  };

  /** Чего не хватает из нужного и что сейчас происходит в магазине. */
  const missing = useMemo(() => missingNeeds(state), [state]);
  const phase: Phase = shopPhase(state);
  const counts = useMemo(
    () =>
      Object.fromEntries(shoppingList(state).map(e => [e.item.id, e.count])),
    [state],
  );

  /** Что сейчас на витрине. */
  // Нужное остаётся на витрине и когда в плане на него не хватает:
  // нажатие откроет «Не хватает монет» с вариантами (копилка или завтра).
  const shown = phase === 'treats' ? TREATS : missing;
  /** Есть ли чем покрыть нехватку на нужное (например, из копилки). */
  const coverable = missing.some(
    i => (mustCover(state, i)?.options.length ?? 0) > 0,
  );
  /** Первый товар, который по карману: на него и показывает лапка. */
  const pointAt = shown.find(
    i =>
      !treatBoughtToday(state, i) && affordability(state, i).kind !== 'short',
  )?.id;

  const confirm = (item: ItemSpec): void => {
    onBuy(item);
    setPending(null);
  };

  const sellerHeight = Math.round(height * 0.4);
  const sellerWidth = Math.round(width * 0.42);
  const seller = actorImage('seller', greeting ? 'talk' : POSE[phase]);

  return (
    <ScreenOverlay edgeToEdgeBackground>
      {/* фон магазина уходит под системные панели, содержимое — нет */}
      <Image
        source={sceneImage('shop')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height: Math.max(height, Math.round(width / ROOM_ASPECT)),
        }}
        resizeMode="cover"
      />

      {/* Один кошелёк: план покупки не ограничивает, сравнение — вечером. */}
      <View
        style={{
          paddingTop: theme.space.sm,
          paddingHorizontal: theme.space.md,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: theme.space.xs,
        }}
      >
        {/* Копилка рядом с кошельком: после покупки видно, что стало
            и с кошельком, и с накоплениями (ТЗ 2.5.9). */}
        <PixelPanel
          ledge={5}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.xs,
            paddingVertical: theme.space.xs,
            paddingHorizontal: theme.space.sm,
          }}
        >
          <Text variant="caption">Копилка</Text>
          <Coins
            amount={state.savings}
            variant="caption"
            color={theme.color.text.primary}
          />
        </PixelPanel>
        <PixelPanel
          ledge={5}
          color={theme.color.coin}
          ledgeColor={theme.color.coinShadow}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.xs,
            paddingVertical: theme.space.xs,
            paddingHorizontal: theme.space.sm,
          }}
        >
          <Text variant="caption">Кошелёк</Text>
          <Coins
            amount={state.balance}
            variant="caption"
            color={theme.color.text.primary}
          />
        </PixelPanel>
      </View>

      {/*
        Продавец занимает то, что осталось, и ужимается сам.
        С фиксированной высотой он выталкивал нижний блок за край экрана,
        и кнопка «домой» оказывалась недостижима — из магазина было
        не выйти. Ростом можно пожертвовать, выходом — нет.
      */}
      <View
        pointerEvents="none"
        style={{
          flex: 1,
          minHeight: 0,
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          paddingLeft: theme.space.sm,
        }}
      >
        {seller ? (
          <Image
            source={seller}
            resizeMode="contain"
            style={{ flex: 1, width: sellerWidth, maxHeight: sellerHeight }}
          />
        ) : null}
      </View>

      {/* реплика и товары */}
      <View style={{ padding: theme.space.md, gap: theme.space.sm }}>
        {greeting ? (
          <PixelPanel
            ledge={6}
            onPress={nextGreeting}
            accessibilityRole="button"
          >
            <Text variant="caption" tone="secondary">
              Продавец
            </Text>
            <Text variant="body" style={{ marginTop: theme.space.xs }}>
              {greeting}
            </Text>
            <Text
              variant="caption"
              tone="brand"
              style={{ marginTop: theme.space.xs, textAlign: 'right' }}
            >
              дальше ▸
            </Text>
          </PixelPanel>
        ) : phase === 'needs' || SAY[phase] ? (
          <PixelPanel ledge={6}>
            <Text variant="caption" tone="secondary">
              Продавец
            </Text>
            <Text variant="body" style={{ marginTop: theme.space.xs }}>
              {phase === 'needs'
                ? needsLine(missing, state.spent.must > 0)
                : phase === 'done' && coverable
                ? COVERABLE_LINE
                : SAY[phase]}
            </Text>
          </PixelPanel>
        ) : null}

        {greeting ? null : (
          <>
            <ScrollView style={{ maxHeight: height * 0.26 }}>
              <View style={{ gap: theme.space.sm }}>
                {shown.map(item => (
                  // Указатель — на первый товар, который ПО КАРМАНУ.
                  // Показывать на витрину, где не хватает монет, значит
                  // звать сделать то, что сейчас невозможно.
                  <HintPaw
                    key={item.id}
                    active={hintTarget === 'shop.item' && item.id === pointAt}
                    inside
                  >
                    <ItemCard
                      item={item}
                      verdict={affordability(state, item)}
                      count={counts[item.id] ?? 0}
                      bought={treatBoughtToday(state, item)}
                      mustShort={mustCover(state, item)?.short ?? null}
                      price={priceFor(state, item)}
                      onPress={() => setPending(item)}
                    />
                  </HintPaw>
                ))}
              </View>
            </ScrollView>

            {/* Уйти можно, только когда всё нужное куплено. */}
            {phase !== 'needs' ? (
              <HintPaw active={hintTarget === 'shop.exit'}>
                <PixelPanel
                  ledge={6}
                  onPress={onClose}
                  color={theme.color.brand}
                  ledgeColor={theme.color.brandShadow}
                  style={{ alignItems: 'center' }}
                >
                  <Text variant="button" tone="onColor">
                    {phase === 'treats' ? 'СПАСИБО, ДОМОЙ' : 'ДОМОЙ'}
                  </Text>
                </PixelPanel>
              </HintPaw>
            ) : null}
          </>
        )}
      </View>

      {/* Подтверждение покупки — ТЗ 2.5.6. */}
      {pending &&
      pending.category === 'want' &&
      affordability(state, pending).kind === 'short' ? (
        <TreatShortDialog
          item={pending}
          short={(affordability(state, pending) as { short: number }).short}
          onClose={() => setPending(null)}
        />
      ) : pending && mustCover(state, pending) ? (
        <ShortageDialog
          state={state}
          item={pending}
          onPick={option => {
            onCover(pending, option);
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      ) : pending ? (
        <PurchaseDialog
          item={pending}
          price={priceFor(state, pending)}
          balanceAfter={state.balance - priceFor(state, pending)}
          onCancel={() => setPending(null)}
          onConfirm={() => confirm(pending)}
        />
      ) : null}
    </ScreenOverlay>
  );
}

/** Диалог подтверждения покупки. */
function PurchaseDialog({
  item,
  price,
  balanceAfter,
  onConfirm,
  onCancel,
}: {
  item: ItemSpec;
  price: number;
  balanceAfter: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const row = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: theme.space.xs,
  } as const;

  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.86)"
      style={{ justifyContent: 'center', padding: theme.space.lg }}
    >
      <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
        <View style={row}>
          <Text variant="title">{item.title} за</Text>
          <Coins amount={price} variant="title" tone="primary" />
          <Text variant="title">?</Text>
        </View>
        <View style={row}>
          <Text variant="body">В кошельке останется</Text>
          <Coins
            amount={Math.max(0, balanceAfter)}
            variant="button"
            tone="primary"
          />
        </View>

        <View style={{ gap: theme.space.sm, marginTop: theme.space.xs }}>
          <PixelPanel
            ledge={6}
            onPress={onConfirm}
            color={theme.color.brand}
            ledgeColor={theme.color.brandShadow}
            style={{ alignItems: 'center' }}
          >
            <Text variant="button" tone="onColor">
              КУПИТЬ
            </Text>
          </PixelPanel>
          <PixelPanel
            ledge={6}
            onPress={onCancel}
            color={theme.color.surfaceElevated}
            style={{ alignItems: 'center' }}
          >
            <Text variant="button">ПЕРЕДУМАЛ</Text>
          </PixelPanel>
        </View>
      </PixelPanel>
    </ScreenOverlay>
  );
}

/**
 * «Не хватает монет» на обязательный товар.
 *
 * Коротко: сколько не хватает и что можно взять из копилки. Цена
 * решения — во втором шаге, «Ты уверен?»: взять из копилки — значит
 * не выполнить план дня. Закрыть без покупки — нажатием на фон или
 * кнопкой «Назад».
 */
function ShortageDialog({
  state,
  item,
  onPick,
  onCancel,
}: {
  state: GameState;
  item: ItemSpec;
  onPick: (option: CoverOption) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [asking, setAsking] = useState<CoverOption | null>(null);
  const cover = mustCover(state, item);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (asking) {
        setAsking(null);
      } else {
        onCancel();
      }
      return true;
    });
    return () => sub.remove();
  }, [asking, onCancel]);

  if (!cover) {
    return null;
  }

  const button = (
    text: string,
    onPress: () => void,
    coins: number | null,
    primary = true,
  ) => (
    <PixelPanel
      key={text}
      ledge={6}
      onPress={onPress}
      color={primary ? theme.color.brand : theme.color.surfaceElevated}
      ledgeColor={primary ? theme.color.brandShadow : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space.xs,
      }}
    >
      <Text
        variant="caption"
        tone={primary ? 'onColor' : 'primary'}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ flexShrink: 1 }}
      >
        {text}
      </Text>
      {coins === null ? null : (
        <Coins amount={coins} variant="caption" tone="primary" />
      )}
    </PixelPanel>
  );

  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.86)"
      style={{ justifyContent: 'center', padding: theme.space.lg }}
    >
      {/* Нажатие мимо окна закрывает его без покупки. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        onPress={asking ? () => setAsking(null) : onCancel}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
        {asking ? (
          <>
            <Text variant="title" style={{ textAlign: 'center' }}>
              Ты уверен?
            </Text>
            <Text variant="body" style={{ textAlign: 'center' }}>
              План на сегодня не будет выполнен
            </Text>
            {/* Цена решения до «да»: как изменится копилка и срок (ТЗ 2.5.7). */}
            {savingsAfter(state, asking.fromSavings).map(line => (
              <Text
                key={line}
                variant="caption"
                tone="secondary"
                style={{ textAlign: 'center' }}
              >
                {line}
              </Text>
            ))}
            {button('ДА', () => onPick(asking), null)}
            {button('НЕТ', () => setAsking(null), null, false)}
          </>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: theme.space.xs,
              }}
            >
              <Text variant="body">
                {`На ${accusative(item.title)} не хватает`}
              </Text>
              <Coins amount={cover.short} variant="button" tone="primary" />
            </View>
            {cover.options.length === 0 ? (
              <>
                <Text variant="body" style={{ textAlign: 'center' }}>
                  Взять неоткуда. Приходи завтра.
                </Text>
                {button('ПОНЯТНО', onCancel, null, false)}
              </>
            ) : (
              cover.options.map(option =>
                button(
                  'ВЗЯТЬ ИЗ КОПИЛКИ',
                  () => setAsking(option),
                  option.fromSavings,
                ),
              )
            )}
          </>
        )}
      </PixelPanel>
    </ScreenOverlay>
  );
}

/** Как изменится копилка, если взять из неё `take`: строки для ребёнка. */
function savingsAfter(state: GameState, take: number): string[] {
  const left = state.savings - take;
  const goal = state.goalId ? goalById(state.goalId) : undefined;
  if (!goal) {
    return [`В копилке станет ${left}.`];
  }
  const eta = (savings: number) =>
    goalProgress({ goal, savings, history: state.savingsHistory }).etaDays;
  const before = eta(state.savings);
  const after = eta(left);
  return [
    `В копилке станет ${left} из ${goal.price}.`,
    before != null && after != null
      ? `${goal.title}: было около ${before} дн., станет около ${after} дн.`
      : `${goal.title} отодвинется.`,
  ];
}

/**
 * На развлечение не хватает. Копилку не предлагаем: она для цели,
 * а не для радости сегодня. Объясняем, что можно сделать (ТЗ 2.5.6).
 */
function TreatShortDialog({
  item,
  short,
  onClose,
}: {
  item: ItemSpec;
  short: number;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <ScreenOverlay
      background="rgba(20,12,8,0.86)"
      style={{ justifyContent: 'center', padding: theme.space.lg }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Закрыть"
        onPress={onClose}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <PixelPanel ledge={6} style={{ gap: theme.space.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: theme.space.xs,
          }}
        >
          <Text variant="body">{`На ${accusative(
            item.title,
          )} не хватает`}</Text>
          <Coins amount={short} variant="button" tone="primary" />
        </View>
        <Text variant="body" style={{ textAlign: 'center' }}>
          Выбери что-то дешевле — или накопи: завтра будут новые монеты.
        </Text>
        <PixelPanel
          ledge={6}
          onPress={onClose}
          color={theme.color.surfaceElevated}
          style={{ alignItems: 'center' }}
        >
          <Text variant="button">ПОНЯТНО</Text>
        </PixelPanel>
      </PixelPanel>
    </ScreenOverlay>
  );
}

/** «На игрушку», «на корм»: винительный падеж названия товара. */
function accusative(title: string): string {
  const word = title.toLowerCase();
  if (word.endsWith('а')) return `${word.slice(0, -1)}у`;
  if (word.endsWith('я')) return `${word.slice(0, -1)}ю`;
  return word;
}
