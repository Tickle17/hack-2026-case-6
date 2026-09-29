import React, { useEffect, useMemo, useState } from 'react';
import { View, Image, type ImageSourcePropType } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { SceneFrame } from '@/shared/ui/SceneFrame';
import { Coins } from '@/shared/ui/Coins';
import { HintBubble } from '@/shared/ui/HintBubble';
import { HintPaw } from '@/shared/ui/HintPaw';
import { useReducedMotion } from '@/shared/ui/motion';
import {
  DIRECTIONS,
  GOALS,
  mustShortfall,
  planStepHint,
  SUGGESTED_GOAL,
} from '@/entities/scenario';
import type { GoalSpec } from '@/entities/scenario';
import { CoinSlider } from './CoinSlider';

/**
 * Утро: раскладываем доход по трём направлениям (UC-1).
 *
 * Три механики ТЗ 8.3 начинаются здесь. Ключевое правило 2.5.5:
 * распределить больше, чем есть, невозможно — ползунок упирается там,
 * где кончаются свободные монеты. Ребёнок физически не может ошибиться
 * в арифметике, и остаётся только содержательное решение.
 *
 * Экран идёт тремя шагами: разложить → ради чего копим → проверить
 * и сохранить. Цель выбирается ДО сохранения, потому что без неё
 * «Копилка» — просто полоса, в которую нечего класть.
 *
 * Ползунка у копилки НЕТ: в неё уходит всё, что не разложено, и это
 * написано на главной кнопке — «Отложить N монет». Третий ползунок
 * только дублировал бы вычитание, которое ребёнок и так видит,
 * и заставлял бы «доразложить» остаток вручную.
 *
 * Подсказка про «Нужное» НЕ блокирует: настоять на своём можно,
 * последствие наступит в магазине и будет объяснено (UC-2).
 */

type Step = 'plan' | 'goal' | 'confirm';

export type PlanSceneProps = {
  income: number;
  /** Выбранная цель; null — ещё не выбрана. */
  goal: {
    id: string;
    title: string;
    saved: number;
    price: number;
    image: ImageSourcePropType;
  } | null;
  /** Цели, которые уже получены: их выбирать больше незачем. */
  achievedGoalIds: string[];
  /**
   * Во сколько обойдётся сегодняшний набор обязательного. Считает
   * сущность, а не экран: UI не считает экономику (правила проекта).
   */
  mustCost: number;
  /** Кличка питомца — для предупреждения, если нужное не заложено. */
  petName: string;
  /** С какой суммы в «Нужном» начинается план. */
  initialMust: number;
  /**
   * Что реально придётся покупать сегодня. Направления, в которых
   * покупать нечего, не показываем: планировать вслепую бессмысленно,
   * и в итоге дня такая строка выглядела бы как невыполненный план.
   */
  needsShopping: boolean;
  /**
   * Подсказки включены. Текст экран считает сам: он один знает,
   * что уже разложено, а подсказка первого дня ведёт по шагам.
   */
  hint: string | null;
  onChooseGoal: (goalId: string) => void;
  onConfirm: (plan: { must: number; want: number; save: number }) => void;
};

/** Подпись под «Хочу»: зачем вообще тратить на приятное. */
const WANT_NOTE = 'Нужно для улучшения настроения питомца';

export function PlanScene({
  income,
  goal,
  achievedGoalIds,
  mustCost,
  needsShopping,
  hint,
  initialMust,
  petName,
  onChooseGoal,
  onConfirm,
}: PlanSceneProps) {
  const theme = useTheme();
  const shownIncome = useCountUp(income);
  const [step, setStep] = useState<Step>('plan');

  const [plan, setPlan] = useState<Record<string, number>>({
    must: Math.min(initialMust, income),
    want: 0,
  });

  /**
   * Копилка — это остаток. Ползунки не дают увести сумму за доход,
   * поэтому остаток никогда не уходит в минус, а план всегда сходится
   * ровно на доход.
   */
  const save = Math.max(0, income - plan.must - plan.want);

  /** Сколько ещё не хватает в «Нужном» до полного набора. */
  const short = mustShortfall(plan.must, mustCost);

  /** Цели, которые ещё можно выбрать. */
  const available = GOALS.filter(g => !achievedGoalIds.includes(g.id));
  /**
   * Если получены все цели, выбирать нечего — и требовать выбор
   * нельзя: экран превратился бы в тупик.
   */
  const goalNeeded = goal === null && available.length > 0;

  /**
   * Шаг, на котором сейчас ребёнок: разложить нужное, потом желаемое,
   * выбрать цель, сохранить. Первый день проходится под руку целиком,
   * дальше подсказки выключаются и решает он сам.
   */
  const planStep = hint
    ? planStepHint(
        { must: plan.must, want: plan.want },
        {
          mustCost: needsShopping ? mustCost : 0,
          income,
          goalChosen: goal !== null,
          noGoalsLeft: available.length === 0,
        },
      )
    : null;

  /** Полосы: копилки среди них нет — она собирает остаток. */
  const rows = useMemo(
    () =>
      DIRECTIONS.filter(
        d => d.id !== 'save' && (d.id !== 'must' || needsShopping),
      ).map(d => ({
        ...d,
        value: plan[d.id] ?? 0,
        headroom: save,
      })),
    [plan, save, needsShopping],
  );

  /** Подпись под полосой направления. */
  const noteFor = (id: string): { note?: string; enough?: boolean } => {
    if (id === 'want') {
      return { note: WANT_NOTE };
    }
    if (id !== 'must') {
      return {};
    }
    return short > 0
      ? {
          note: `Нужно ещё минимум ${short}, чтобы питомец чувствовал себя хорошо`,
        }
      : { note: 'Питомцу хватит на всё', enough: true };
  };

  // ------------------------------------------------ шаг 2: ради чего копим
  if (step === 'goal') {
    return (
      <SceneFrame
        title="РАДИ ЧЕГО КОПИМ"
        subtitle="это не купить за один день — на это копят"
        backLabel="НАЗАД"
        onBack={() => setStep('plan')}
      >
        <View style={{ gap: theme.space.sm }}>
          {GOALS.map(g => (
            <GoalOption
              key={g.id}
              goal={g}
              owned={achievedGoalIds.includes(g.id)}
              selected={goal?.id === g.id}
              // Первый день ведём до конца: показываем ту цель,
              // которую назвала подсказка.
              suggested={Boolean(hint) && g.id === SUGGESTED_GOAL && !goal}
              onPress={() => {
                onChooseGoal(g.id);
                setStep('plan');
              }}
            />
          ))}
        </View>
      </SceneFrame>
    );
  }

  // ------------------------------------------------- шаг 3: проверить план
  if (step === 'confirm') {
    return (
      <SceneFrame
        title="ВСЁ ВЕРНО?"
        subtitle="так монеты разойдутся на сегодня"
        backLabel="СОХРАНИТЬ"
        onBack={() => onConfirm({ must: plan.must, want: plan.want, save })}
        footer={
          <PixelPanel
            ledge={6}
            onPress={() => setStep('plan')}
            color={theme.color.surfaceElevated}
            style={{ alignItems: 'center' }}
          >
            <Text variant="button">ИЗМЕНИТЬ</Text>
          </PixelPanel>
        }
      >
        <View style={{ gap: theme.space.sm }}>
          {DIRECTIONS.filter(d => d.id !== 'must' || needsShopping).map(d => (
            <PixelPanel
              key={d.id}
              ledge={6}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.sm,
              }}
            >
              <Image
                source={d.image}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text variant="button">{d.title}</Text>
                <Text variant="caption" tone="secondary">
                  {d.hint}
                </Text>
                {d.id === 'must' && short > 0 ? (
                  <Text variant="caption" tone="danger">
                    {plan.must === 0
                      ? `На завтра ничего не куплено — ${petName} останется без корма и шампуня`
                      : `На завтра куплено не всё — ${petName} может остаться без корма или шампуня`}
                  </Text>
                ) : null}
              </View>
              <Coins
                amount={d.id === 'save' ? save : plan[d.id] ?? 0}
                variant="title"
              />
            </PixelPanel>
          ))}

          {/* Куда пойдут отложенные монеты — здесь же, а не отдельным
              экраном: копилка без цели ничего не объясняет. */}
          {goal ? (
            <PixelPanel ledge={6} style={{ gap: theme.space.xs }}>
              <Text variant="button">КОПИТЬ</Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space.sm,
                }}
              >
                <Image
                  source={goal.image}
                  style={{ width: 56, height: 56 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text variant="button">{goal.title}</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.space.xs,
                    }}
                  >
                    <Text variant="caption" tone="secondary">
                      будет
                    </Text>
                    <Coins
                      amount={Math.min(goal.saved + save, goal.price)}
                      variant="caption"
                      tone="secondary"
                    />
                    <Text variant="caption" tone="secondary">
                      из
                    </Text>
                    <Coins
                      amount={goal.price}
                      variant="caption"
                      tone="secondary"
                    />
                  </View>
                </View>
              </View>
            </PixelPanel>
          ) : null}
        </View>
      </SceneFrame>
    );
  }

  // ------------------------------------------------- шаг 1: разложить
  /**
   * Кнопка не называет откладывание действием.
   *
   * Копилку ребёнок не «раскладывает»: он решает, сколько потратит
   * на нужное и на хочу, а в копилку уходит всё, что осталось.
   * «Отложить N монет» описывало это как ещё один выбор, которого
   * на экране нет; сколько уйдёт — сказано над ползунками.
   */
  const saveLabel = 'ГОТОВО';

  return (
    <SceneFrame
      title="ПЛАН НА ДЕНЬ"
      titleAside={
        <PixelPanel
          ledge={6}
          color={theme.color.coin}
          ledgeColor={theme.color.coinShadow}
          // Ширина по итоговому числу: пока счёт растёт, плашка не дёргается.
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 84 + 20 * String(income).length,
          }}
        >
          <Coins
            amount={shownIncome}
            variant="title"
            color={theme.color.text.primary}
          />
        </PixelPanel>
      }
      backLabel={goalNeeded ? 'ВЫБРАТЬ ЦЕЛЬ' : saveLabel}
      backHint={
        planStep?.target === 'plan.goal' || planStep?.target === 'plan.save'
      }
      // Выключать кнопку больше не за что: остаток всегда уходит
      // в копилку, и план сходится при любом положении ползунков.
      onBack={() => setStep(goalNeeded ? 'goal' : 'confirm')}
    >
      <View style={{ gap: theme.space.sm }}>
        {/* Подсказка стоит НАД ползунками и показывает на них. */}
        {/* Зазор под плашкой — место для лапки над полосой. */}
        {planStep && planStep.target !== 'plan.want' ? (
          <View style={{ marginBottom: theme.space.md }}>
            <HintBubble text={planStep.text} />
          </View>
        ) : null}

        {rows.map(d => {
          const { note, enough } = noteFor(d.id);
          return (
            <CoinSlider
              key={d.id}
              title={d.title}
              hint={d.hint}
              image={d.image}
              value={d.value}
              headroom={d.headroom}
              scale={income}
              // Серая отметка только у «Нужного»: у остальных
              // направлений «достаточно» не существует.
              target={d.id === 'must' ? mustCost : undefined}
              note={note}
              noteEnough={enough}
              // Подсказка показывает жест на самой полосе: её тянут,
              // и лапка, тыкающая в панель, врала бы о способе.
              showGesture={planStep?.target === SLIDER_TARGET[d.id]}
              tip={
                d.id === 'want' && planStep?.target === 'plan.want'
                  ? planStep.text
                  : undefined
              }
              onChange={next => setPlan(p => ({ ...p, [d.id]: next }))}
            />
          );
        })}

        {/* Панель кликабельна: цель можно сменить, не досохраняя план. */}
        <PixelPanel
          ledge={6}
          onPress={available.length > 0 ? () => setStep('goal') : undefined}
          style={{ gap: theme.space.xs }}
        >
          <Text variant="button">КОПИТЬ</Text>
          {goal ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.xs,
              }}
            >
              {/* Картинка выбранного предмета: цель — вещь,
                  а не строчка текста. */}
              <Image
                source={goal.image}
                style={{ width: 44, height: 44 }}
                resizeMode="contain"
              />
              <View style={{ flex: 1 }}>
                <Text variant="caption">{goal.title}</Text>
                {/* С учётом сегодняшнего плана: двигаешь ползунки — видишь, как близко цель. */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.space.xs,
                    flexWrap: 'wrap',
                  }}
                >
                  <Coins
                    amount={Math.min(goal.saved + save, goal.price)}
                    variant="caption"
                    tone="secondary"
                  />
                  <Text variant="caption" tone="secondary">
                    из
                  </Text>
                  <Coins
                    amount={goal.price}
                    variant="caption"
                    tone="secondary"
                  />
                  {save > 0 ? (
                    <Text variant="caption" tone="brand">
                      +{save} вечером
                    </Text>
                  ) : null}
                </View>
              </View>
              {available.length > 0 ? (
                <PixelPanel
                  ledge={5}
                  onPress={() => setStep('goal')}
                  color={theme.color.coin}
                  ledgeColor={theme.color.coinShadow}
                  style={{
                    paddingVertical: theme.space.xs,
                    paddingHorizontal: theme.space.sm,
                  }}
                >
                  <Text variant="caption">ИЗМЕНИТЬ</Text>
                </PixelPanel>
              ) : null}
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.sm,
              }}
            >
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                цель ещё не выбрана
              </Text>
              {available.length > 0 ? (
                <PixelPanel
                  ledge={5}
                  onPress={() => setStep('goal')}
                  color={theme.color.coin}
                  ledgeColor={theme.color.coinShadow}
                  style={{
                    paddingVertical: theme.space.xs,
                    paddingHorizontal: theme.space.md,
                  }}
                >
                  <Text variant="button">ВЫБРАТЬ</Text>
                </PixelPanel>
              ) : null}
            </View>
          )}
        </PixelPanel>
      </View>
    </SceneFrame>
  );
}

/** Сколько места оставить над содержимым карточки под лапку. */
const PAW_ROOM = 34;

/** На какой ползунок показывает шаг подсказки плана. */
const SLIDER_TARGET: Record<string, string> = {
  must: 'plan.needs',
  want: 'plan.want',
};

/** Сколько идёт счёт монет от нуля до дохода дня. */
const COUNT_UP_MS = 900;

/**
 * Монеты дня «насыпаются» от нуля: ребёнок видит, что деньги пришли,
 * а не просто стоят числом. При выключенных анимациях — сразу итог.
 */
function useCountUp(target: number): number {
  const still = useReducedMotion();
  const [value, setValue] = useState(still ? target : 0);

  useEffect(() => {
    if (still) {
      setValue(target);
      return undefined;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
      setValue(Math.round(target * progress));
      if (progress === 1) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [target, still]);

  return value;
}

/** Карточка цели в списке выбора. */
function GoalOption({
  goal,
  owned,
  selected,
  suggested = false,
  onPress,
}: {
  goal: GoalSpec;
  owned: boolean;
  selected: boolean;
  suggested?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <HintPaw active={suggested} inside>
      <PixelPanel
        ledge={selected ? 8 : 6}
        onPress={owned ? undefined : onPress}
        color={selected ? theme.color.brandSoft : theme.color.surface}
        ledgeColor={selected ? theme.color.brandShadow : theme.color.border}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
          opacity: owned ? 0.6 : 1,
          // Место под указатель: иначе лапка ложится прямо на название
          // цели и закрывает его.
          paddingTop: suggested ? PAW_ROOM : undefined,
        }}
      >
        <Image
          source={goal.image}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text variant="button">{goal.title}</Text>
          <Text variant="caption" tone="secondary">
            {goal.why}
          </Text>
          {/* Недоступность объясняется словом, а не только блёклостью. */}
          {owned ? (
            <Text variant="caption" tone="muted">
              уже есть
            </Text>
          ) : null}
        </View>
        <Coins amount={goal.price} variant="button" />
      </PixelPanel>
    </HintPaw>
  );
}
