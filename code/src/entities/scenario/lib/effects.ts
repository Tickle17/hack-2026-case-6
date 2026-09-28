import type { Effect, GameState } from '../model/types';
import { LEDGER_LIMIT, MAX_BALANCE, MIN_BALANCE } from './state';
import { goalById } from '../config/goals';
import { applyDecay, FLOOR, MAX_STAT } from '@/entities/pet/lib/pet-stats';
import { sanitizePetName } from '@/entities/pet/lib/appearance';
import { validateName } from '@/shared/lib/name';
import { challengeFlag } from './day-flags';

/**
 * Как начисление называется в истории монет. ТЗ 2.5.4 требует, чтобы
 * у каждого начисления был виден источник, а «задание дня» источником
 * не является: ребёнок не вспомнит, за какое именно.
 */
const CHALLENGE_REASON: Record<string, string> = {
  plan: 'потратил как задумал',
  savings: 'не брал из копилки',
};

/**
 * Насколько радуется питомец полученной цели. Больше любой покупки:
 * ради этого и копили.
 */
const GOAL_JOY = 40;

/** Сутки в миллисекундах — шаг затухания показателей за один игровой день. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Дописывает операцию в историю, обрезая старые. */
function record(
  state: GameState,
  kind: GameState['ledger'][number]['kind'],
  amount: number,
  reason: string,
  category?: 'must' | 'want',
): GameState['ledger'] {
  const entry = category
    ? { day: state.day, kind, amount, reason, category }
    : { day: state.day, kind, amount, reason };
  return [entry, ...state.ledger].slice(0, LEDGER_LIMIT);
}

/** Держит инвариант баланса в одном месте. */
function clampBalance(value: number): number {
  return Math.max(MIN_BALANCE, Math.min(MAX_BALANCE, value));
}

function assertWholePositive(value: number, what: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `${what} должно быть целым неотрицательным, получено: ${value}`,
    );
  }
}

/**
 * Применяет один эффект. Чистая функция: возвращает новое состояние,
 * исходное не мутирует.
 *
 * Инвариант, который держится ЗДЕСЬ, а не в UI:
 * баланс никогда не выходит за [MIN_BALANCE, MAX_BALANCE].
 */
export function applyEffect(state: GameState, effect: Effect): GameState {
  switch (effect.do) {
    case 'grantCoins': {
      assertWholePositive(effect.amount, 'Награда');
      return {
        ...state,
        balance: Math.min(state.balance + effect.amount, MAX_BALANCE),
        ledger: record(state, 'income', effect.amount, effect.reason),
      };
    }

    case 'takeCoins': {
      assertWholePositive(effect.amount, 'Списание');
      // Обрезаем, а не бросаем: покупка невозможна — её не должно быть в сценарии,
      // но состояние обязано остаться корректным при любом наборе эффектов.
      return {
        ...state,
        balance: Math.max(state.balance - effect.amount, MIN_BALANCE),
      };
    }

    case 'giveItem': {
      const count = effect.count ?? 1;
      assertWholePositive(count, 'Количество');
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [effect.itemId]: (state.inventory[effect.itemId] ?? 0) + count,
        },
      };
    }

    case 'consumeItem': {
      const left = Math.max((state.inventory[effect.itemId] ?? 0) - 1, 0);
      return {
        ...state,
        inventory: { ...state.inventory, [effect.itemId]: left },
      };
    }

    case 'setFlag':
      return {
        ...state,
        flags: { ...state.flags, [effect.flag]: effect.value },
      };

    case 'setPetSpecies':
      return { ...state, petSpeciesId: effect.speciesId };

    case 'markTaskDone':
      return {
        ...state,
        tasksToday: {
          ...state.tasksToday,
          [effect.taskId]: (state.tasksToday[effect.taskId] ?? 0) + 1,
        },
      };

    case 'unlockShop':
      return { ...state, shopUnlocked: effect.unlocked };

    case 'unlockTask':
      return state.unlockedTasks.includes(effect.taskId)
        ? state
        : { ...state, unlockedTasks: [...state.unlockedTasks, effect.taskId] };

    case 'unlockCatalog':
      return state.unlockedCatalogs.includes(effect.catalogId)
        ? state
        : {
            ...state,
            unlockedCatalogs: [...state.unlockedCatalogs, effect.catalogId],
          };

    case 'advanceDay':
      // Обнуляются ТОЛЬКО счётчики дел, план и факт за день.
      // Накопленное не сгорает — см. принцип 4 в docs/game-design.md.
      return {
        ...state,
        day: state.day + 1,
        tasksToday: {},
        plan: null,
        planBaseline: null,
        spent: { must: 0, want: 0 },
        leftoverToday: null,
        // Показатели медленно снижаются, но НЕ ниже пола: питомцу
        // может быть скучно, беды с ним не случается (CLAUDE.md).
        stats: applyDecay(state.stats, DAY_MS),
      };

    case 'planBudget': {
      const { must, want, save } = effect;
      const total = must + want + save;

      // План — только намерение: монеты весь день в кошельке, в копилку
      // доля уходит вечером (depositSavings). Поэтому распланировать
      // можно ровно кошелёк — требование ТЗ 2.5.5.
      if (must < 0 || want < 0 || save < 0 || total > state.balance) {
        return state;
      }

      return {
        ...state,
        plan: { must, want, save },
        // Утренний план запоминаем один раз: вечером сравниваем с ним.
        planBaseline:
          state.plan === null ? { must, want, save } : state.planBaseline,
      };
    }

    case 'spendFrom': {
      const { category, amount } = effect;
      if (amount <= 0) {
        return state;
      }
      // План трату не ограничивает — только кошелёк. Перерасход против
      // плана ребёнок увидит вечером в итоге дня, а не запретом в магазине.
      if (amount > state.balance) {
        return state;
      }
      return {
        ...state,
        balance: clampBalance(state.balance - amount),
        spent: { ...state.spent, [category]: state.spent[category] + amount },
        ledger: record(state, 'expense', amount, effect.reason, category),
      };
    }

    case 'depositSavings': {
      // Один раз за день: перезапуск на вечернем экране не удваивает взнос.
      if (state.leftoverToday !== null) {
        return state;
      }
      const planned = (state.planBaseline ?? state.plan)?.save ?? 0;
      const amount = Math.min(planned, state.balance);
      return {
        ...state,
        balance: clampBalance(state.balance - amount),
        savings: state.savings + amount,
        savingsHistory:
          amount > 0 ? [...state.savingsHistory, amount] : state.savingsHistory,
        ledger:
          amount > 0
            ? record(state, 'savings', amount, 'отложено в копилку')
            : state.ledger,
        leftoverToday: state.balance - amount,
      };
    }

    case 'saveExtra': {
      const left = state.leftoverToday ?? 0;
      const amount = Math.min(
        Math.max(0, Math.round(effect.amount)),
        left,
        state.balance,
      );
      if (amount === 0) {
        return state;
      }
      // Одно пополнение за день: докладываем к сегодняшнему взносу,
      // иначе средний вклад занижается и срок до цели врёт.
      const depositedToday = state.ledger.some(
        e => e.day === state.day && e.kind === 'savings',
      );
      const history =
        depositedToday && state.savingsHistory.length > 0
          ? [
              ...state.savingsHistory.slice(0, -1),
              state.savingsHistory[state.savingsHistory.length - 1] + amount,
            ]
          : [...state.savingsHistory, amount];
      return {
        ...state,
        balance: clampBalance(state.balance - amount),
        savings: state.savings + amount,
        savingsHistory: history,
        ledger: record(state, 'savings', amount, 'отложено сверх плана'),
        leftoverToday: left - amount,
      };
    }

    case 'changeStat': {
      const current = state.stats[effect.stat];
      const next = Math.max(FLOOR, Math.min(MAX_STAT, current + effect.amount));
      return { ...state, stats: { ...state.stats, [effect.stat]: next } };
    }

    case 'unlockAchievements': {
      const fresh = effect.ids.filter(id => !state.achievements.includes(id));
      return fresh.length
        ? { ...state, achievements: [...state.achievements, ...fresh] }
        : state;
    }

    case 'recordDay':
      // Идемпотентно: повторный вызов за тот же день ничего не меняет.
      // Перезапуск приложения на конце дня показывает итог заново,
      // и без этой защиты история заботы росла бы вдвое быстрее.
      if (state.lastRecordedDay === state.day) {
        return state;
      }
      return {
        ...state,
        careHistory: [
          ...state.careHistory,
          Math.max(0, Math.min(3, Math.round(effect.score))),
        ],
        // Опыт только прибавляется: пустой день даёт ноль, а не минус.
        xp: state.xp + Math.max(0, Math.round(effect.xp ?? 0)),
        lastRecordedDay: state.day,
      };

    /**
     * Награда за задание дня — один раз за день и за каждое отдельно.
     *
     * Отметка в флагах, а не отдельным полем: перезапуск на итоге дня
     * показывает экран заново, и без защиты награду можно было бы
     * получать сколько угодно.
     */
    case 'rewardChallenge': {
      const flag = challengeFlag(state.day, effect.id);
      if (state.flags[flag]) {
        return state;
      }
      return applyEffect(
        { ...state, flags: { ...state.flags, [flag]: true } },
        {
          do: 'grantCoins',
          amount: effect.amount,
          reason: CHALLENGE_REASON[effect.id] ?? 'задание дня',
        },
      );
    }

    case 'rewardLesson':
      // Только за первое прохождение темы: иначе повторный заход
      // в урок превращался бы в источник дохода.
      return state.lessonsDone.includes(effect.lessonId)
        ? state
        : {
            ...state,
            balance: clampBalance(state.balance + effect.amount),
            ledger: record(state, 'income', effect.amount, 'За урок в школе'),
          };

    case 'claimGoal': {
      const goal = goalById(effect.goalId);
      // Не накопил или уже получал — тихо ничего не делаем: экран
      // такую кнопку не покажет, но состояние обязано остаться целым.
      if (
        !goal ||
        state.goalsAchieved.includes(goal.id) ||
        state.savings < goal.price
      ) {
        return state;
      }
      return {
        ...state,
        savings: state.savings - goal.price,
        goalsAchieved: [...state.goalsAchieved, goal.id],
        // Цель освобождается: можно выбрать следующую.
        goalId: null,
        inventory: {
          ...state.inventory,
          [goal.id]: (state.inventory[goal.id] ?? 0) + 1,
        },
        stats: {
          ...state.stats,
          mood: Math.max(
            FLOOR,
            Math.min(MAX_STAT, state.stats.mood + GOAL_JOY),
          ),
        },
        ledger: record(
          state,
          'expense',
          goal.price,
          `${goal.title} — накопил!`,
        ),
      };
    }

    case 'setHints':
      return { ...state, hintsOn: effect.on };

    case 'markEventSeen':
      return { ...state, lastEventDay: state.day };

    case 'markLessonDone':
      return state.lessonsDone.includes(effect.lessonId)
        ? state
        : { ...state, lessonsDone: [...state.lessonsDone, effect.lessonId] };

    case 'setPetColor':
      return { ...state, petColorId: effect.colorId };

    // Негодное имя не записывается: проверку проходит экран ввода,
    // а здесь последний рубеж — в сохранение не должно попасть то,
    // чего ребёнок не вводил.
    case 'setPlayerName': {
      const checked = validateName(effect.name);
      return checked.ok ? { ...state, playerName: checked.name } : state;
    }

    case 'setPetName':
      return { ...state, petName: sanitizePetName(effect.name) };

    case 'setDemoMode':
      return { ...state, demoMode: effect.on };

    case 'setReduceMotion':
      return { ...state, reduceMotion: effect.on };

    case 'completeAllTasks':
      // Разворачивается в интерпретаторе, где доступен реестр дел.
      // Сюда попасть не должно, но состояние обязано остаться целым.
      return state;

    case 'setGoal':
      return { ...state, goalId: effect.goalId };

    case 'topUpMust': {
      if (!state.plan) {
        return state;
      }
      const fromSavings = Math.min(
        Math.max(0, effect.fromSavings),
        state.savings,
      );
      const fromBalance = Math.max(0, effect.fromBalance);
      if (fromSavings + fromBalance === 0) {
        return state;
      }
      const withSavings: GameState = {
        ...state,
        savings: state.savings - fromSavings,
        balance: clampBalance(state.balance + fromSavings),
        lastWithdrawDay: fromSavings > 0 ? state.day : state.lastWithdrawDay,
        ledger:
          fromSavings > 0
            ? record(
                state,
                'withdraw',
                fromSavings,
                'взял из копилки на нужное',
              )
            : state.ledger,
      };
      return {
        ...withSavings,
        plan: {
          ...state.plan,
          must: state.plan.must + fromBalance + fromSavings,
        },
      };
    }

    case 'withdrawSavings': {
      // Снять можно только то, что лежит: в минус копилка не уходит.
      const taken = Math.min(Math.max(0, effect.amount), state.savings);
      return {
        ...state,
        savings: state.savings - taken,
        balance: clampBalance(state.balance + taken),
        ledger:
          taken > 0
            ? record(state, 'withdraw', taken, effect.reason)
            : state.ledger,
        // Отмечаем день, а не факт: задание «не брать из копилки»
        // даётся на день, и завтра оно снова доступно.
        lastWithdrawDay: state.day,
      };
    }
  }
}

export function applyEffects(
  state: GameState,
  effects: Effect[] = [],
): GameState {
  return effects.reduce(applyEffect, state);
}
