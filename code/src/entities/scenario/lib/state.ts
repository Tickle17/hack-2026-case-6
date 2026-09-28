import type { GameState, ScenarioId } from '../model/types';
import { DEFAULT_PET_NAME } from '@/entities/pet/lib/appearance';

/** Числа — из docs/game-design.md, раздел «Валюта». Менять только там. */
export const START_BALANCE = 0;
export const MAX_BALANCE = 9999;
export const MIN_BALANCE = 0;
export const DAILY_REWARD = 10;
/**
 * Карманные на первый день. Приложение А, шаг 4 требует стартовый бюджет:
 * без него планировать в первый день нечего.
 *
 * 12 — чтобы хватило на полный набор обязательного (9) и осталось на выбор:
 * отложить или потратить на приятное. Если бы хватало ровно, выбора бы не было.
 */
export const START_BUDGET = 12;

/**
 * Награда за верно решённое учебное задание.
 *
 * Приложение А, шаг 6 требует, чтобы задание начисляло игровую валюту;
 * заказчик уточнил, что одного опыта недостаточно.
 *
 * Сумма намеренно маленькая: урок — не заработок. Она заметна
 * (две монеты — это бантик), но не отменяет необходимость планировать.
 */
export const LESSON_REWARD = 2;

/**
 * Сколько операций хранить. История нужна, чтобы посмотреть недавнее,
 * а не вести бухгалтерию: бесконечный список раздувал бы сохранение
 * и ничего не добавлял ребёнку.
 */
export const LEDGER_LIMIT = 40;
export const INTRO_REWARD = 10;

/**
 * Версия схемы состояния. Растёт при несовместимом изменении.
 * v2: добавлены накопления, план бюджета, цель.
 * v3: история заботы, показатели питомца, окрас и имя.
 * v4: события дня и сохранение сцены.
 * v5: имя игрока.
 * v6: день последнего снятия из копилки.
 * v7: план — только намерение; копилка пополняется вечером (leftoverToday).
 *
 * Сцену пришлось хранить: она объявлена только на первом узле эпизода
 * и наследуется дальше, поэтому из одного `currentNodeId` её
 * не восстановить — после перезапуска класс превращался в комнату.
 */
export const STATE_VERSION = 7;

export function canAfford(balance: number, price: number): boolean {
  return balance >= price;
}

export function createInitialState(startNodeId: ScenarioId): GameState {
  return {
    day: 1,
    // Имени ещё нет: первый экран игры — вопрос, как зовут ребёнка.
    playerName: '',
    balance: START_BALANCE,
    petSpeciesId: null,
    petColorId: 'own',
    petName: DEFAULT_PET_NAME,
    inventory: {},
    tasksToday: {},
    unlockedTasks: [],
    unlockedCatalogs: [],
    lessonsDone: [],
    flags: {},
    currentNodeId: startNodeId,
    shopUnlocked: false,
    savings: 0,
    plan: null,
    planBaseline: null,
    leftoverToday: null,
    hungerSince: null,
    spent: { must: 0, want: 0 },
    goalId: null,
    savingsHistory: [],
    careHistory: [],
    xp: 0,
    lastRecordedDay: 0,
    lastWithdrawDay: 0,
    achievements: [],
    lastEventDay: 0,
    scene: 'home',
    ledger: [],
    hintsOn: true,
    goalsAchieved: [],
    // Питомец приходит в дом здоровым и довольным.
    stats: { satiety: 80, mood: 80, cleanliness: 80 },
    demoMode: false,
    reduceMotion: false,
  };
}
