/**
 * Модель сценария. См. docs/scenario-engine.md.
 *
 * Сюжет, условия и последствия — ДАННЫЕ, не код. Сценарист меняет файл,
 * программист не участвует.
 */

export type ScenarioId = string;

// ---------------------------------------------------------------- состояние

export type GameState = {
  day: number;
  /**
   * Как зовут ребёнка. Пустая строка — имя ещё не спрашивали:
   * с этого начинается игра, и до ответа сюжет не идёт.
   */
  playerName: string;
  balance: number;
  petSpeciesId: string | null;
  /** Окрас питомца — вторая половина «внешнего вида» из ТЗ 2.5.2. */
  petColorId: string;
  /** Игровое имя питомца. */
  petName: string;
  inventory: Record<string, number>;
  /** Сколько раз дело сделано сегодня. */
  tasksToday: Record<string, number>;
  /** Дела, открытые уроками. */
  unlockedTasks: string[];
  /** Каталоги товаров, открытые уроками. */
  unlockedCatalogs: string[];
  lessonsDone: string[];
  flags: Record<string, boolean>;
  currentNodeId: ScenarioId;
  shopUnlocked: boolean;
  /** Отложено на цель. Учитывается отдельно от свободного баланса. */
  savings: number;
  /** План на сегодня; null — ещё не составлен. */
  plan: BudgetPlan | null;
  /**
   * План, каким его утвердили утром. Добор и деньги из копилки меняют
   * лимиты (plan), а сравнивать вечером надо с задуманным.
   */
  planBaseline: BudgetPlan | null;
  /** Сколько фактически потрачено по направлениям за сегодня. */
  spent: Record<SpendCategory, number>;
  /**
   * Сколько монет осталось от дня после вечернего взноса в копилку;
   * null — вечер ещё не наступил. Из этого остатка ребёнок может
   * отложить больше плана. Награда за дела сюда не входит: она
   * приходит после взноса.
   */
  leftoverToday: number | null;
  /** Выбранная финансовая цель. */
  goalId: string | null;
  /** Сколько раз пополняли копилку и на сколько — для расчёта срока. */
  savingsHistory: number[];
  /**
   * Оценка заботы за каждый прожитый день (0–3). По ней считается
   * стадия развития питомца — ТЗ 2.5.10 требует «совокупность решений
   * за несколько периодов», а не последний результат.
   */
  careHistory: number[];
  /**
   * Опыт питомца. Только растёт: уровень и размер выводятся из него
   * (`entities/pet/lib/level.ts`), отдельно не хранятся.
   */
  xp: number;
  /**
   * Последний день, уже записанный в историю заботы. Нужен, чтобы
   * запись была идемпотентной: перезапуск на узле конца дня показывает
   * итог заново, и без этого день считался бы дважды.
   */
  lastRecordedDay: number;
  /**
   * Последний день, когда брали из копилки. 0 — не брали ни разу.
   * По нему считается задание «не брать из копилки».
   */
  lastWithdrawDay: number;
  /** Заработанные значки. Хранятся, а не вычисляются: полученное не отнимают. */
  achievements: string[];
  /** Последний день, событие которого уже показано и применено. */
  lastEventDay: number;
  /**
   * Где сейчас происходит действие. Хранится в состоянии, а не
   * вычисляется: сцена объявлена только на первом узле эпизода
   * и наследуется дальше, поэтому после загрузки сохранения
   * восстановить её из одного `currentNodeId` невозможно.
   */
  scene: 'home' | 'school' | 'shop';
  /**
   * История операций, новые первыми. ТЗ 2.5.4 требует, чтобы у каждого
   * начисления были видны источник и сумма, 2.5.6 — чтобы покупка
   * сохранялась в истории периода.
   */
  ledger: LedgerEntry[];
  /**
   * Показывать ли подсказки. Первый день ведём за руку; дальше ребёнок
   * включает их сам через меню.
   */
  hintsOn: boolean;
  /**
   * Полученные цели. Накопить мало — цель должна превратиться в вещь,
   * иначе копилка остаётся абстракцией: полоса заполнилась, и всё.
   */
  goalsAchieved: string[];
  /** Состояние питомца, видимое на главном экране (ТЗ 2.5.3). */
  stats: { satiety: number; mood: number; cleanliness: number };
  /**
   * Демонстрационный режим для приёмки: этапы проходятся подряд,
   * без ожидания календарных сроков (ТЗ 2.5.13).
   */
  demoMode: boolean;
  /**
   * Анимации выключены. ТЗ 3.6 требует такую возможность: движение
   * мешает части детей сосредоточиться, а кому-то вызывает укачивание.
   */
  reduceMotion: boolean;
};

// ---------------------------------------------------------------- условия

export type Comparison = '<' | '<=' | '=' | '>=' | '>';

/** Где в дне правило урока пригождается. */
export type LessonMoment = 'plan' | 'shop' | 'summary';

export type Condition =
  | { op: 'always' }
  | { op: 'flag'; flag: string; is: boolean }
  | { op: 'balance'; cmp: Comparison; value: number }
  | { op: 'hasItem'; itemId: string; count?: number }
  | { op: 'taskDone'; taskId: string; times?: number }
  | { op: 'allTasksDone' }
  | { op: 'day'; cmp: Comparison; value: number }
  | { op: 'petSpecies'; speciesId: string }
  | { op: 'not'; of: Condition }
  | { op: 'and'; all: Condition[] }
  | { op: 'or'; any: Condition[] };

// ---------------------------------------------------------------- эффекты

export type Effect =
  | { do: 'grantCoins'; amount: number; reason: string }
  | { do: 'takeCoins'; amount: number; reason: string }
  | { do: 'giveItem'; itemId: string; count?: number }
  | { do: 'consumeItem'; itemId: string }
  | { do: 'setFlag'; flag: string; value: boolean }
  | { do: 'setPetSpecies'; speciesId: string }
  | { do: 'markTaskDone'; taskId: string }
  | { do: 'unlockShop'; unlocked: boolean }
  | { do: 'unlockTask'; taskId: string }
  | { do: 'unlockCatalog'; catalogId: string }
  | { do: 'advanceDay' }
  | { do: 'planBudget'; must: number; want: number; save: number }
  /** Вечер: запланированная доля (не больше кошелька) уходит в копилку. */
  | { do: 'depositSavings' }
  /** Вечер: отложить из остатка дня сверх плана. */
  | { do: 'saveExtra'; amount: number }
  | { do: 'spendFrom'; category: SpendCategory; amount: number; reason: string }
  | { do: 'setGoal'; goalId: string }
  | { do: 'withdrawSavings'; amount: number; reason: string }
  /**
   * Долить «Обязательное», чтобы хватило на нужное: сначала свободными
   * монетами вне плана, остальное — из копилки.
   */
  | { do: 'topUpMust'; fromBalance: number; fromSavings: number }
  | { do: 'recordDay'; score: number; xp?: number }
  | {
      do: 'changeStat';
      stat: 'satiety' | 'mood' | 'cleanliness';
      amount: number;
    }
  | { do: 'setDemoMode'; on: boolean }
  | { do: 'setReduceMotion'; on: boolean }
  | { do: 'completeAllTasks' }
  | { do: 'markLessonDone'; lessonId: string }
  | { do: 'rewardLesson'; lessonId: string; amount: number }
  | { do: 'rewardChallenge'; id: string; amount: number }
  | { do: 'markEventSeen' }
  | { do: 'setHints'; on: boolean }
  | { do: 'claimGoal'; goalId: string }
  | { do: 'unlockAchievements'; ids: string[] }
  | { do: 'setPetColor'; colorId: string }
  | { do: 'setPetName'; name: string }
  | { do: 'setPlayerName'; name: string };

// ---------------------------------------------------------------- узлы

type BaseNode = {
  id: ScenarioId;
  next?: ScenarioId;
  when?: Condition;
  /**
   * Где происходит сцена. Наследуется от предыдущего узла, если не задано:
   * сценаристу не нужно помечать каждую реплику подряд.
   */
  scene?: 'home' | 'school';
};

export type DialogueNode = BaseNode & {
  type: 'dialogue';
  speaker: string;
  text: string;
  /** Настроение реплики: выбирает позу персонажа. Данные, не логика. */
  pose?:
    | 'talk'
    | 'point'
    | 'love'
    | 'greet'
    | 'wink'
    | 'gift'
    | 'think'
    | 'cheer'
    | 'book';
};

export type ThoughtNode = BaseNode & { type: 'thought'; text: string };

export type ChoiceOption = {
  id: string;
  label: string;
  icon?: string;
  when?: Condition;
  effects?: Effect[];
  next: ScenarioId;
};

export type ChoiceNode = BaseNode & {
  type: 'choice';
  prompt: string;
  options: ChoiceOption[];
};

export type RiddleOption = { value: number | string; correct?: boolean };

export type RiddleNode = BaseNode & {
  type: 'riddle';
  competencyId: string;
  prompt: string;
  options: RiddleOption[];
  onWrong: string;
  onRight: string;
  /**
   * Ответ СОБИРАЮТ, а не выбирают: слова верной фразы выкладываются
   * вперемешку, ребёнок расставляет их по местам (ТЗ 2.5.8 — задания
   * не ограничиваются выбором из предложенных вариантов).
   *
   * Верная фраза лежит там же, где и всегда, — единственным верным
   * вариантом. Так у задания остаётся один ответ, и страж сценария
   * «из загадки есть выход» продолжает работать.
   */
  assemble?: true;
  /** Единственный допустимый режим для детской игры. */
  retry: 'forever';
};

export type TaskRequirement = { taskId: string; times: number };

export type TaskGateNode = BaseNode & {
  type: 'taskGate';
  require: 'all' | TaskRequirement[];
  hint?: string;
};

export type MinigameNode = BaseNode & {
  type: 'minigame';
  gameId: string;
  countsAsTask?: string;
  onComplete?: Effect[];
};

export type ShopNode = BaseNode & {
  type: 'shop';
  catalogId: string;
  closeWhen?: Condition;
};

export type EffectNode = BaseNode & { type: 'effect'; effects: Effect[] };

export type BranchNode = BaseNode & {
  type: 'branch';
  branches: Array<{ when: Condition; next: ScenarioId }>;
  fallback: ScenarioId;
};

export type EndDayNode = BaseNode & { type: 'endDay'; reward?: Effect[] };

export type Node =
  | DialogueNode
  | ThoughtNode
  | ChoiceNode
  | RiddleNode
  | TaskGateNode
  | MinigameNode
  | ShopNode
  | EffectNode
  | BranchNode
  | EndDayNode;

// ---------------------------------------------------------------- уроки

export type Lesson = {
  id: string;
  /** Название темы для взрослого раздела — ТЗ 2.5.12 «пройденные темы». */
  title: string;
  /**
   * Выводится из порядка задания в пуле, в данных не хранится.
   * См. `config/lessons.ts`.
   */
  day: number;
  competencyId: string;
  /**
   * Вид задания: счёт, вставить слово, выбрать вариант.
   *
   * Виды чередуются от дня ко дню: однообразие утомляет ребёнка
   * быстрее, чем сложность. Вид меняет не логику, а подачу — как
   * задание выглядит на доске.
   */
  kind: 'math' | 'word' | 'choice' | 'order';
  rule: string;
  /**
   * Приглашение к заданию: что именно сейчас предстоит сделать.
   *
   * Между правилом и задачей нужен переход. Без него ребёнок видит
   * пример на доске и не понимает, ждут ли от него ответа. Обращение
   * по имени делает приглашение адресным.
   */
  taskPrompt: string;
  riddle: {
    prompt: string;
    options: RiddleOption[];
    onWrong: string;
    onRight: string;
    /** Ответ собирают из слов, а не выбирают. См. RiddleNode.assemble. */
    assemble?: true;
  };
  explanation: string;
  /**
   * ОБЯЗАТЕЛЬНОЕ. Момент сегодняшнего дня, где правило урока применяется,
   * и короткое напоминание, которое ребёнок увидит в этот момент.
   * Урок, который не пригодится сегодня, — лекция. Страж не пропустит.
   */
  appliesToday: { moment: LessonMoment; reminder: string };
  unlocks?: Effect[];
};

// ---------------------------------------------------------------- реестры

export type TaskSpec = {
  /**
   * Что восполняет это дело. Забота обязана возвращать показатели:
   * иначе питомцу становится хуже независимо от стараний ребёнка,
   * а это ровно тот тёмный паттерн, который запрещает CLAUDE.md.
   */
  restores?: { stat: 'satiety' | 'mood' | 'cleanliness'; amount: number };
  id: string;
  title: string;
  /** Норма в день. */
  perDay: number;
  requiresItem?: string;
  /**
   * Что дело ПОРТИТ. У прогулки это чистота: на улице питомец
   * пачкается, и поэтому купание идёт после прогулки, а не до.
   */
  soils?: { stat: 'satiety' | 'mood' | 'cleanliness'; amount: number };
  consumesItem?: boolean;
  gameId?: string;
  /** Доступно с самого начала или открывается уроком. */
  unlockedFromStart: boolean;
};

/**
 * Направление расхода. Ребёнок видит его ярлыком на карточке товара —
 * ТЗ 2.5.6 требует показывать категорию до покупки.
 */
export type SpendCategory = 'must' | 'want';

/** Одна операция с монетами. */
export type LedgerEntry = {
  day: number;
  kind: 'income' | 'expense' | 'savings' | 'withdraw';
  amount: number;
  /** Откуда пришло или на что ушло — понятной ребёнку фразой. */
  reason: string;
  /**
   * Для трат: нужная вещь или для радости. По ней считается опыт за
   * покупки для настроения питомца.
   */
  category?: 'must' | 'want';
};

export type ItemSpec = {
  id: string;
  title: string;
  price: number;
  kind: 'consumable' | 'treat';
  category: SpendCategory;
  catalogId: string;
  /** Что изменится у питомца — показываем до покупки (ТЗ 2.5.6). */
  effectHint?: string;
  /** То же самое числом — применяется при покупке. */
  effect?: { stat: 'satiety' | 'mood' | 'cleanliness'; amount: number };
};

/** План на игровой период: доход разложен по трём направлениям. */
export type BudgetPlan = { must: number; want: number; save: number };

export type Registries = {
  tasks: TaskSpec[];
  items: ItemSpec[];
  minigames: string[];
  species: string[];
  catalogs: string[];
};

export type Scenario = {
  startNodeId: ScenarioId;
  nodes: Node[];
};
