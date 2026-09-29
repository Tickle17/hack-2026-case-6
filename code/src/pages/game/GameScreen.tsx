import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Pressable,
  View,
  Image,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { PixelPanel } from '@/shared/ui/PixelPanel';
import { ScreenOverlay, useScreenInsets } from '@/shared/ui/ScreenOverlay';
import { RoomView } from '@/widgets/room/RoomView';
import { RoomThings } from '@/widgets/room/RoomThings';
import { roomThings } from '@/entities/room/lib/furniture';
import { PetActor } from '@/entities/pet/ui/PetActor';
import { DialogueBox } from '@/widgets/dialogue/DialogueBox';
import { ActorStage } from '@/widgets/dialogue/ActorStage';
import { ChoiceList } from '@/widgets/dialogue/ChoiceList';
import { TaskShelf } from '@/widgets/tasks/TaskShelf';
import { TaskChecklist } from '@/widgets/tasks/TaskChecklist';
import { StrokeGame } from '@/widgets/minigames/StrokeGame';
import { BathGame } from '@/widgets/minigames/BathGame';
import { RunGame } from '@/widgets/minigames/RunGame';
import { SettingsSheet } from '@/widgets/settings/SettingsSheet';
import { ShopScene, SHOP_GREETED_FLAG } from '@/widgets/shop/ShopScene';
import { PlanScene } from '@/widgets/budget/PlanScene';
import { GoalScene } from '@/widgets/budget/GoalScene';
import { DaySummaryScene } from '@/widgets/budget/DaySummaryScene';
import { PetStatusBar } from '@/widgets/pet/PetStatusBar';
import { PetStatsBadge } from '@/widgets/pet/PetStatsBadge';
import { EdgePanel } from '@/shared/ui/EdgePanel';
import { setAppIcon } from '@/shared/lib/appIcon';
import { PlanView } from '@/widgets/budget/PlanView';
import { PetMaker } from '@/widgets/pet/PetMaker';
import { petRegistryKey } from '@/entities/pet/lib/appearance';
import { HubScene, HUB_ICONS } from '@/widgets/hub/HubScene';
import { AdultScene } from '@/widgets/adult/AdultScene';
import { ProgressScene } from '@/widgets/progress/ProgressScene';
import { LedgerScene } from '@/widgets/ledger/LedgerScene';
import { HowToPlayScene } from '@/widgets/howto/HowToPlayScene';
import { MotionProvider } from '@/shared/ui/motion';
import { EventCard } from '@/widgets/events/EventCard';
import { HintBubble } from '@/shared/ui/HintBubble';
import { TASK_ICONS } from '@/shared/ui/icons';
import { Coins } from '@/shared/ui/Coins';
import { DemoPanel } from '@/widgets/adult/DemoPanel';
import type { HubTile } from '@/widgets/hub/HubScene';
import { dayCareScore } from '@/entities/pet/lib/growth';
import {
  dayXp,
  isGrownUp,
  levelFor,
  levelScale,
  totalXp,
} from '@/entities/pet/lib/level';
import { LevelUpScene } from '@/widgets/level/LevelUpScene';
import { XpGain } from '@/widgets/level/XpGain';
import { WelcomeScene } from '@/widgets/onboarding/WelcomeScene';
import { NightScene } from '@/widgets/day/NightScene';
import { DirtyMark } from '@/widgets/pet/DirtyMark';
import { PetSays } from '@/widgets/pet/PetSays';
import { emotionFor, petComplaints } from '@/entities/pet/lib/pet-stats';
import {
  DIRECTIONS,
  personalize,
  askedTaskHint,
  currentHint,
  HOW_TO_PLAY,
  type Hint,
  HINTS_OFF_MESSAGE,
  eventForDay,
  mustCost,
  dayChallenges,
  morningFlag,
  taskBlocker,
  shopPhase,
  coverAndBuyEffects,
  savedToday,
  priceFor,
  purchaseEffects,
  DIRTY_BELOW,
  type TaskBlock,
  DAILY_REWARD,
  LESSONS,
  goalById,
  dayXpInput,
  PARENT_BONUS,
  needsFirstFlag,
  newAchievements,
} from '@/entities/scenario';

/** Значок копилки в шапке — тот же, что на экране планирования. */
const SAVINGS_ICON = DIRECTIONS.find(d => d.id === 'save')!.image;
import { RiddleBoard } from '@/widgets/dialogue/RiddleBoard';
import { PhraseBoard } from '@/widgets/dialogue/PhraseBoard';
import { BoardCloseUp } from '@/widgets/dialogue/BoardCloseUp';
import {
  createRun,
  loadState,
  saveState,
  clearState,
  INTRO,
  REGISTRIES,
  type ScenarioRun,
  type StatePort,
} from '@/entities/scenario';
import { SCHOOL_BOARD, ROOM_ASPECT, FLOOR } from '@/entities/room/config/room';
import { petBowl } from '@/entities/pet/config/animations';

/**
 * Экран игры.
 *
 * Комната занимает ВЕСЬ экран и служит фоном всему остальному — пустого
 * фона в игре нет. Диалоги, выбор и загадка ложатся поверх неё.
 *
 * Сюжетных ветвлений здесь нет: что показать, решает тип текущего узла,
 * куда идти — движок (docs/scenario-engine.md).
 */

/**
 * Запасной значок дела, если картинки для него нет. Основные иконки
 * нарисованные — см. `TASK_ICONS`: эмодзи ✋ совпадала с указателем
 * подсказки, и один рисунок означал две разные вещи.
 */
const TASK_FALLBACK = '•';

/** Дела, где предмет ставится на пол, а питомец подходит сам. */
const TASK_PLACED: Record<string, boolean> = {
  feed: true,
};

/** Сколько питомец ест, прежде чем дело засчитается. */
const EAT_MS = 2600;

/** Дела, которые открываются мини-игрой, а не перетаскиванием. */
const TASK_GAMES: Record<string, 'stroke' | 'bath' | 'run'> = {
  pet: 'stroke',
  bath: 'bath',
  walk: 'run',
};

/** Чем питомец отвечает на выполненное дело. */
const TASK_REACTION: Record<string, 'eat' | 'happy' | 'play'> = {
  pet: 'play',
  feed: 'eat',
  bath: 'happy',
  walk: 'happy',
};

export type GameScreenProps = {
  /** Где лежит профиль: ребёнка или тестовый профиль демо. */
  storage: StatePort;
  /** Тестовый профиль демо-режима: дни пролистываются кнопкой. */
  demo: boolean;
  /** Выйти на главный экран — после сброса профиля. */
  onExit: () => void;
};

export function GameScreen({ storage, demo, onExit }: GameScreenProps) {
  const theme = useTheme();
  const insets = useScreenInsets();
  const { width, height } = useWindowDimensions();

  // Ленивый инициализатор useState: React гарантирует ровно один вызов
  // на монтирование. Создавать run прямо в теле рендера нельзя —
  // это побочный эффект, и при повторном рендере игра начиналась не с начала.
  //
  // Сохранение читается синхронно (MMKV), поэтому промежуточный экран
  // загрузки не нужен: игра сразу открывается там, где её закрыли.
  const [run] = useState<ScenarioRun>(() => {
    const created = createRun(
      INTRO,
      REGISTRIES,
      loadState(storage) ?? undefined,
    );
    if (demo && !created.state().demoMode) {
      created.apply([{ do: 'setDemoMode', on: true }]);
    }
    return created;
  });

  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  const [riddleFeedback, setRiddleFeedback] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  // Живые координаты питомца — их читает полка дел при перетаскивании.
  const petX = useSharedValue(0);
  const petY = useSharedValue(0);
  const petW = useSharedValue(0);
  const petH = useSharedValue(0);
  const [petAction, setPetAction] = useState<{
    name: 'eat' | 'happy' | 'play';
    at: number;
  } | null>(null);

  const [activeGame, setActiveGame] = useState<{ taskId: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Смена вида, окраса и имени из меню. */
  const [petEditOpen, setPetEditOpen] = useState(false);
  /** Утверждённый план дня — только посмотреть. */
  const [planViewOpen, setPlanViewOpen] = useState(false);
  /**
   * Магазин в конце прогулки. Игра прямолинейная: с прогулки герой
   * всегда заходит в магазин и сначала берёт всё нужное.
   */
  /**
   * Открыт ли магазин и откуда в него пришли. Откуда — важно:
   * поход с прогулки засчитывается за прогулку, а заход из меню
   * или из реплики «сначала надо купить» — нет. Иначе дело дня
   * закрывалось бы покупкой, а поводок тратился впустую.
   */
  const [shopOpen, setShopOpen] = useState<'walk' | 'errand' | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  /** Итог дня показывается один раз, перед переходом к следующему. */
  const [summaryShown, setSummaryShown] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [adultOpen, setAdultOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  /**
   * Питомец только что перешёл на новую стадию.
   *
   * ТЗ 2.5.10 требует объяснить ПРИЧИНУ изменения. Само взросление
   * видно по размеру, но молча выросший питомец не учит ничему:
   * ребёнок должен связать это со своими решениями за прошлые дни.
   */
  const [levelUp, setLevelUp] = useState<{
    from: number;
    to: number;
    reasons: string[];
  } | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [howtoOpen, setHowtoOpen] = useState(false);
  /** Что питомец говорит сейчас. */
  const [petSays, setPetSays] = useState<string | null>(null);
  /** Что он скажет следом: жалобы идут одна за другой. */
  const [sayQueue, setSayQueue] = useState<string[]>([]);
  /** Можно ли питомцу заговорить самому: он в комнате и ничего не открыто. */
  const canSpeakRef = useRef(false);
  /** Подсказка, которую ребёнок попросил кнопкой в списке дел. */
  const [askedHint, setAskedHint] = useState<Hint | null>(null);
  /**
   * Какая выдвижная панель открыта. Одна на весь экран: две
   * одновременно закрывали бы сцену с обеих сторон.
   */
  const [edgePanel, setEdgePanel] = useState<'demo' | 'pet' | 'tasks' | null>(
    null,
  );
  /**
   * Реплика в ответ на дело, которое пока делать нечем. Герой объясняет,
   * чего не хватает: серая плитка без объяснения читается как поломка.
   */
  const [blockedSay, setBlockedSay] = useState<TaskBlock | null>(null);

  /**
   * Поставленная миска: питомец идёт к ней сам. Пока он в пути, миска
   * видна; как только дошёл — она убирается, потому что в анимации еды
   * миска уже нарисована.
   */
  const [bowl, setBowl] = useState<{
    taskId: string;
    x: number;
    y: number;
  } | null>(null);

  /**
   * Дело уже делается и займёт время: питомец идёт к миске, потом ест.
   *
   * Пока это длится, подсказка молчит и лапка не тычет. Звать сделать
   * то, что уже делается, — значит сбивать: ребёнок тянется нажимать
   * ещё раз. Как только дело засчитано, подсказка называет следующий шаг.
   */
  const [busy, setBusy] = useState(false);

  const completeTask = useCallback(
    (taskId: string) => {
      setBusy(false);
      run.markTaskDone(taskId);
      run.advance();
      setPetAction({ name: TASK_REACTION[taskId] ?? 'happy', at: Date.now() });
      refresh();
    },
    [run, refresh],
  );

  const deliverTask = useCallback(
    (taskId: string, drop?: { x: number; y: number }) => {
      if (TASK_PLACED[taskId] && drop) {
        // Ставим предмет на пол и ждём, пока питомец дойдёт.
        // Дело уже начато — подсказка про него замолкает до конца.
        setBusy(true);
        setBowl({ taskId, x: drop.x, y: drop.y });
        return;
      }
      completeTask(taskId);
    },
    [completeTask],
  );

  /** Начать заново: новый проход сценария и чистая сцена. */
  /** Сброс стирает профиль и возвращает на главный экран. */
  const resetGame = useCallback(() => {
    clearState(storage);
    onExit();
  }, [storage, onExit]);

  /** Смена питомца — обратимое действие, подтверждения не требует. */
  const changeSpecies = useCallback(
    (id: string) => {
      run.apply([{ do: 'setPetSpecies', speciesId: id }]);
      refresh();
    },
    [run, refresh],
  );

  /** Питомец дошёл до миски: убираем её и включаем анимацию еды. */
  const onPetArrived = useCallback(() => {
    if (!bowl) {
      return;
    }
    const { taskId } = bowl;
    setBowl(null);
    setPetAction({ name: 'eat', at: Date.now() });
    setTimeout(() => completeTask(taskId), EAT_MS);
  }, [bowl, completeTask]);

  const node = run.current();
  const state = run.state();

  // Сохраняем после каждого изменения. MMKV пишет синхронно и быстро,
  // отдельный «момент сохранения» не нужен — ребёнок просто закрывает
  // игру, когда захочет, и ничего не теряет.
  useEffect(() => {
    saveState(state, storage);
  }, [state, storage]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dayTasks = useMemo(() => run.dayTasks(), [tick, run]);
  const doneTaskCount = dayTasks.reduce((total, task) => total + task.done, 0);

  useEffect(() => {
    if (!petSays) return undefined;
    const timer = setTimeout(() => {
      // Следующая фраза — после паузы, а не поверх текущей.
      setPetSays(sayQueue[0] ?? null);
      setSayQueue(queue => queue.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [petSays, sayQueue]);

  /** Питомец говорит свои жалобы по очереди; всё хорошо — молчит. */
  const speak = useCallback((lines: string[]) => {
    if (lines.length === 0) return;
    setPetSays(lines[0]);
    setSayQueue(lines.slice(1));
  }, []);

  // Голод идёт по реальным часам — и пока игра закрыта: замер при входе,
  // при возвращении в игру и раз в минуту, пока она открыта.
  useEffect(() => {
    const tickHunger = () => {
      run.apply([{ do: 'hungerTick', now: Date.now() }]);
      refresh();
    };
    tickHunger();
    const timer = setInterval(tickHunger, 60 * 1000);
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') tickHunger();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [run, refresh]);

  // Если питомцу плохо, он говорит об этом сам — время от времени,
  // когда ребёнок в комнате и ничего не открыто.
  useEffect(() => {
    const timer = setInterval(() => {
      if (canSpeakRef.current) {
        speak(petComplaints(run.state().stats));
      }
    }, 25 * 1000);
    return () => clearInterval(timer);
  }, [run, speak]);

  // Шаг сделан — лапка своё отработала; следующую ребёнок попросит сам.
  useEffect(() => {
    setAskedHint(null);
  }, [doneTaskCount, node.id]);

  /**
   * Пропуск дня в демо-режиме: закрываем дела и прокручиваем сценарий
   * до следующего дневного цикла. Загадки решаем верным вариантом —
   * эксперту нужно увидеть переходы, а не считать в уме.
   */
  /**
   * Разумный план за ребёнка — только для демо-режима.
   *
   * Демо убирает ожидание, но НЕ финансовые правила: сначала
   * обязательное, остаток пополам между желаемым и копилкой.
   */
  const autoPlan = useCallback(() => {
    if (run.state().plan !== null) {
      return;
    }
    // Стоимость считает сущность: UI не считает экономику (правила проекта).
    const must = Math.min(mustCost(run.state()), run.state().balance);
    const free = Math.max(0, run.state().balance - must);
    run.apply([
      {
        do: 'planBudget',
        must,
        want: Math.floor(free / 2),
        save: free - Math.floor(free / 2),
      },
    ]);
  }, [run]);

  /**
   * Записать прожитый день в историю заботы и проверить взросление.
   *
   * Одна функция на два пути. Раньше это жило только в обработчике
   * экрана итога — и демонстрационный режим, который двигает сценарий
   * мимо этого экрана, не записывал ничего. Питомец в демо не рос
   * никогда, хотя ТЗ 2.5.13 требует воспроизводить в нём обязательные
   * этапы цикла, а рост — один из них.
   */
  const awardAchievements = useCallback(() => {
    const ids = newAchievements(run.state());
    if (!ids.length) return;
    run.apply([{ do: 'unlockAchievements', ids }]);
  }, [run]);

  const recordDayAndGrow = useCallback(() => {
    const now = run.state();
    // Сравниваем с утренним планом: траты им не ограничены, поэтому
    // и перерасход, и недорасход больше чем на монету — не «по плану».
    const plan = now.planBaseline ?? now.plan;
    const kept =
      plan !== null &&
      Math.abs(plan.must - now.spent.must) <= 1 &&
      Math.abs(plan.want - now.spent.want) <= 1;
    const mustCovered = REGISTRIES.items
      .filter(i => i.category === 'must')
      .every(i => (now.inventory[i.id] ?? 0) > 0);

    const score = dayCareScore({
      mustCovered,
      planKept: kept,
      saved: savedToday(now) > 0,
    });
    // Опыт дня — ровно те строки, что ребёнок видел на итоге.
    const lines = dayXp(
      dayXpInput(
        now,
        run.dayTasks().every(task => task.complete),
      ),
    );
    const gained = totalXp(lines);
    // Уровень до и после: переход бывает раз в несколько дней, и
    // поймать его можно только здесь. День, уже записанный раньше
    // (перезапуск на итоге), опыта второй раз не даёт — и окна тоже.
    const recorded = now.lastRecordedDay === now.day;
    const from = levelFor(now.xp);
    const to = levelFor(now.xp + gained);
    if (!recorded && to > from) {
      setLevelUp({ from, to, reasons: lines.map(l => l.title) });
    }

    run.apply([
      { do: 'recordDay', score, xp: gained },
      // Награды за выполненные задания дня. Эффект сам следит,
      // чтобы за день каждую выдали один раз.
      ...dayChallenges(now)
        .filter(c => c.done)
        .map(c => ({
          do: 'rewardChallenge' as const,
          id: c.id,
          amount: c.reward,
        })),
    ]);
    awardAchievements();
  }, [run, awardAchievements]);

  const skipDayForDemo = useCallback(() => {
    // Демо убирает ожидание, но НЕ финансовые правила (требование
    // заказчика к демо-режиму). Поэтому пропуск дня не только закрывает
    // дела, но и совершает обязательные покупки: иначе награды
    // копились бы без единой траты, и дефицита эксперт не увидел бы.
    autoPlan();

    const missing = REGISTRIES.items.filter(
      i => i.category === 'must' && (run.state().inventory[i.id] ?? 0) === 0,
    );

    missing.forEach(item => {
      run.apply([
        {
          do: 'spendFrom',
          category: 'must',
          amount: item.price,
          reason: item.title,
        },
        { do: 'giveItem', itemId: item.id },
        ...purchaseEffects(item),
      ]);
    });
    // Вечер: доля копилки по плану, как в сценарии перед наградой.
    run.apply([{ do: 'completeAllTasks' }, { do: 'depositSavings' }]);
    // День прожит — записываем его так же, как это делает экран итога.
    recordDayAndGrow();
    const startDay = run.state().day;
    for (let i = 0; i < 60; i++) {
      const n = run.current();
      if (n.type === 'riddle') {
        const right = n.options.find(o => o.correct);
        if (right) {
          run.answer(right.value);
        }
      }
      if (n.type === 'taskGate') {
        run.apply([{ do: 'completeAllTasks' }]);
      }
      if (n.type === 'choice') {
        break;
      }
      const before = n.id;
      run.advance();
      if (run.state().day > startDay) {
        break;
      }
      if (run.current().id === before) {
        break;
      }
    }
    // Новый день тоже планируем сами: иначе экран плана перекрывает
    // демо-панель, и следующий день уже не пропустить — «без ожидания»
    // превращается в ручное заполнение на каждом шаге.
    autoPlan();

    setSummaryShown(false);
    refresh();
  }, [run, refresh, autoPlan, recordDayAndGrow]);

  const next = useCallback(() => {
    // Следующий день — снова будет свой итог.
    setSummaryShown(false);
    run.advance();
    setRiddleFeedback(null);
    refresh();
  }, [run, refresh]);

  /**
   * Ключ для анимаций включает окрас: «cat--black». Всё, что от окраса
   * не зависит, отбрасывает суффикс внутри реестра, поэтому виджетам
   * ничего знать не нужно.
   */
  const speciesId = petRegistryKey(
    state.petSpeciesId ?? 'cat',
    state.petColorId,
    // После третьего уровня — взрослые картинки, если они нарисованы.
    isGrownUp(levelFor(state.xp)),
  );

  // Комната занимает всю ширину; высота — из пропорции исходника,
  // чтобы картинку не растягивало.
  const roomWidth = width;
  const roomHeight = Math.max(height, Math.round(width / ROOM_ASPECT));

  // Миска того же вида, что и питомец — та самая, что в анимации еды.
  const bowlImage = petBowl(speciesId);
  const bowlHeight = Math.round(roomHeight * 0.032);
  const bowlSize = bowlImage
    ? {
        w: Math.round(bowlHeight * (bowlImage.width / bowlImage.height)),
        h: bowlHeight,
      }
    : { w: 0, h: 0 };

  const floorRect = {
    x: FLOOR.x * roomWidth,
    y: FLOOR.y * roomHeight,
    w: FLOOR.w * roomWidth,
    h: FLOOR.h * roomHeight,
  };

  // Питомец идёт к миске: цель — в долях комнаты, как и его позиция.
  const petGoal = bowl
    ? { x: bowl.x / roomWidth - 0.06, y: bowl.y / roomHeight - 0.03 }
    : null;

  /**
   * Поверх сцены открыт магазин, мини-игра или настройки. Тогда нижняя
   * панель комнаты не рисуется: иначе её плитки просвечивают сквозь
   * чужую сцену и перекрывают её кнопки.
   */
  /**
   * Планирование открывается само, когда начались дела дня, а план
   * ещё не составлен. Пропустить его нельзя: это ядро ТЗ, а не опция.
   * Если денег нет — планировать нечего, экран не показываем.
   */
  /**
   * Ночь между днями. Показывается один раз за наступивший день,
   * до всего остального: сначала ребёнок узнаёт, что прошла ночь,
   * и только потом — что сегодня в школе.
   *
   * Первый день исключён: игра с него начинается, и «ночь прошла»
   * было бы неправдой.
   */
  // Иконка догоняет питомца и в старых сохранениях: выбран пёс — на телефоне пёс.
  useEffect(() => {
    // Тестовый профиль демо иконку ребёнка не трогает.
    if (state.petSpeciesId && !demo) setAppIcon(state.petSpeciesId);
  }, [state.petSpeciesId, demo]);

  const nightNeeded =
    state.day > 1 && state.flags[morningFlag(state.day)] !== true;

  /**
   * Событие дня показывается ПЕРЕД планированием: иначе план уже
   * составлен, и пересматривать нечего.
   */
  const todayEvent =
    node.type === 'taskGate' && state.lastEventDay !== state.day
      ? eventForDay(state.day)
      : undefined;

  const planNeeded =
    node.type === 'taskGate' &&
    state.plan === null &&
    state.balance > 0 &&
    todayEvent === undefined;

  /**
   * Итог дня перехватывает узел endDay: сначала показываем, что
   * планировал и что вышло, и только потом даём лечь спать.
   * Без плана сравнивать нечего — тогда идём как раньше.
   */
  const summaryNeeded =
    node.type === 'endDay' && state.plan !== null && !summaryShown;

  /**
   * Прощание с подсказками: один раз, в конце первого дня. Дальше
   * ребёнок играет сам, а вернуть подсказки может через меню.
   */
  const hintsFarewell =
    node.type === 'endDay' && state.day === 1 && state.hintsOn;

  /**
   * Выбор питомца — не список из четырёх кнопок, а экран создания:
   * вид, окрас и имя (ТЗ 2.5.2). Узел сценария остаётся тем же,
   * меняется только его представление.
   */
  const makingPet = node.type === 'choice' && node.id === 'bd.pick';

  /**
   * Имя спрашиваем до сюжета: первая реплика — поздравление
   * с днём рождения, и поздравлять безымянного нельзя.
   */
  const needName = state.playerName === '';

  /**
   * Сцена подарков: пока родители дарят питомца и карманные, счётчик
   * дня и кошелёк прячем. Показывать «0 монет» рядом с «вот тебе
   * карманные» — значит спорить с собственным сюжетом; да и считать
   * ребёнку в этот момент нечего. Меню остаётся: выход нужен всегда.
   */
  const giftScene = state.flags.intro !== true;

  /**
   * Сюжет не начинается, пока не знаем имени.
   *
   * Одного наложения поверх мало: под ним оставались говорящая мама
   * и плашка с репликой, где вместо имени стояло «друг», — игра
   * обращалась к ребёнку раньше, чем он представился, и предлагала
   * листать диалог, который ещё не должен был начаться.
   */
  const storyVisible = state.playerName !== '';

  /** Короткая подстановка имён в реплику сценария. */
  const say = (text: string): string => personalize(text, state);

  const overlayOpen =
    shopOpen !== null ||
    settingsOpen ||
    petEditOpen ||
    planViewOpen ||
    goalOpen ||
    hubOpen ||
    adultOpen ||
    todayEvent !== undefined ||
    hintsFarewell ||
    progressOpen ||
    ledgerOpen ||
    howtoOpen ||
    makingPet ||
    needName ||
    blockedSay !== null ||
    nightNeeded ||
    planNeeded ||
    summaryNeeded ||
    activeGame !== null;
  canSpeakRef.current =
    !overlayOpen &&
    !petSays &&
    state.petSpeciesId !== null &&
    run.scene() === 'home';

  /**
   * Разделы главного экрана (ТЗ 2.5.3). Недоступные не прячем,
   * а объясняем причину: исчезнувшая плитка читается как поломка.
   */
  const hubTiles: HubTile[] = [
    {
      id: 'plan',
      title: 'План на день',
      hint: state.plan
        ? `обязательное ${state.plan.must} · развлечения ${state.plan.want} · копилка ${state.plan.save}`
        : 'ещё не составлен',
      image: HUB_ICONS.plan,
      disabledReason: state.plan
        ? undefined
        : 'откроется сам, когда начнутся дела дня',
    },
    {
      id: 'tasks',
      title: 'Дела',
      hint: `сделано ${dayTasks.filter(t => t.complete).length} из ${
        dayTasks.length
      }`,
      emoji: '📋',
      disabledReason:
        node.type === 'taskGate' ? undefined : 'появятся, когда начнётся день',
    },
    {
      id: 'shop',
      title: 'Магазин',
      hint: 'обязательное и развлечения',
      emoji: '🛒',
      disabledReason: state.plan ? undefined : 'сначала составь план',
    },
    {
      id: 'savings',
      title: 'Копилка',
      hint: state.goalId ? `отложено ${state.savings}` : 'выбрать цель',
      image: HUB_ICONS.savings,
    },
    {
      id: 'ledger',
      title: 'История монет',
      hint:
        state.ledger.length > 0
          ? `операций: ${state.ledger.length}`
          : 'пока ничего не было',
      emoji: '🧾',
    },
    {
      id: 'pet',
      title: 'Мой питомец',
      hint: 'сменить вид, окрас или имя',
      emoji: '🐾',
      disabledReason: state.petSpeciesId ? undefined : 'питомца ещё нет',
    },
    {
      id: 'howto',
      title: 'Как играть',
      hint: 'три решения и порядок дня',
      emoji: '💡',
    },
    {
      id: 'progress',
      title: 'Чему научился',
      hint: `тем пройдено ${state.lessonsDone.length} из ${LESSONS.length}`,
      emoji: '⭐',
    },
    {
      id: 'adult',
      title: 'Для взрослого',
      hint: 'настройки и прогресс',
      emoji: '🚪',
    },
  ];

  /**
   * Что стоит в комнате: вещи за накопленные цели.
   *
   * Мемоизируем по списку полученных целей: массив, пересобранный на
   * каждый кадр, перезапускал бы прогулку питомца.
   */
  const things = useMemo(
    () => roomThings(state.goalsAchieved),
    [state.goalsAchieved],
  );

  /** Цель для шапки: копилка показывает, ради чего копим. */
  const headerGoal = state.goalId ? goalById(state.goalId) : undefined;

  /** Цель для экрана плана: её надо видеть в момент распределения. */
  const planGoal = state.goalId ? goalById(state.goalId) : undefined;

  /** Подсказка выбирается по тому, что сейчас на экране. */
  const hint = currentHint(state, {
    planning: planNeeded,
    riddle: node.type === 'riddle',
    // Какая фаза магазина — считает он сам; здесь достаточно знать,
    // осталось ли непокупленное обязательное.
    // Какая фаза магазина — решает сущность по списку покупок.
    shopNeeds: shopOpen !== null && shopPhase(state) === 'needs',
    shopTreats: shopOpen !== null && shopPhase(state) === 'treats',
    shopDone: shopOpen !== null && shopPhase(state) === 'done',
    tasksLeft: dayTasks.filter(t => !t.complete).length,
  });
  const hintText = hint?.text ?? null;
  /** Дело, на плитку которого показывает подсказка. */
  const hintTask = hint?.target?.startsWith('task.')
    ? hint.target.slice('task.'.length)
    : null;

  /**
   * Показывать ли подсказку про дела прямо на сцене.
   *
   * Только на узле дел: во время сюжета звать кормить питомца
   * бессмысленно — полки ещё нет, а лапка у меню показывала бы
   * на кнопку, которая сейчас ни при чём.
   *
   * И только пока ничего не делается: питомец, идущий к миске,
   * уже выполняет то, к чему зовёт подсказка.
   */
  const hintOnScene =
    hintText !== null && !overlayOpen && !busy && node.type === 'taskGate';

  /** Подсказка по кнопке — когда автоподсказок на сцене нет. */
  const askedOnScene =
    !hintOnScene &&
    askedHint !== null &&
    !overlayOpen &&
    !busy &&
    node.type === 'taskGate';
  const askedTask = askedHint?.target?.startsWith('task.')
    ? askedHint.target.slice('task.'.length)
    : null;
  const sceneHintText = hintOnScene
    ? hintText
    : askedOnScene
    ? askedHint?.text ?? null
    : null;

  const isDialogue = node.type === 'dialogue' || node.type === 'thought';
  const actorHeight = Math.round(height * 0.42);
  const actorWidth = Math.round(width * 0.42);

  return (
    <MotionProvider reduced={state.reduceMotion}>
      <View style={{ flex: 1, backgroundColor: theme.color.border }}>
        <StatusBar barStyle="dark-content" />

        {/* Комната — фон всего экрана, голубой подложки нет нигде */}
        <View
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        >
          <RoomView width={roomWidth} height={roomHeight} scene={run.scene()}>
            {/*
            Миска рисуется ДО питомца: она лежит на полу, и подошедшее
            животное должно оказаться перед ней, а не за ней.
          */}
            {bowl && bowlImage ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: bowl.x - bowlSize.w / 2,
                  top: bowl.y - bowlSize.h / 2,
                }}
              >
                <Image
                  source={bowlImage.source}
                  style={{ width: bowlSize.w, height: bowlSize.h }}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            {/* Накопленные вещи стоят в комнате всегда, а не только
                когда питомец рядом: ребёнок должен видеть, что копил
                не зря, каждый раз, когда заходит домой. */}
            {run.scene() === 'home' ? (
              <RoomThings
                things={things}
                width={roomWidth}
                height={roomHeight}
              />
            ) : null}

            {state.petSpeciesId && run.scene() === 'home' ? (
              <PetActor
                speciesId={speciesId}
                emotion={emotionFor(state.stats)}
                roomWidth={roomWidth}
                roomHeight={roomHeight}
                paused={(isDialogue || node.type === 'choice') && !bowl}
                xOut={petX}
                yOut={petY}
                widthOut={petW}
                heightOut={petH}
                stageScale={levelScale(levelFor(state.xp))}
                things={things}
                dirty={state.stats.cleanliness < DIRTY_BELOW}
                action={petAction}
                goal={petGoal}
                onArrive={onPetArrived}
                onPress={() => {
                  speak(petComplaints(state.stats));
                  refresh();
                }}
              />
            ) : null}

            {/* Грязь видно на питомце, а не только в панели показателей:
                решение «пора в ванну» принимается, глядя на него. */}
            {state.petSpeciesId &&
            run.scene() === 'home' &&
            state.stats.cleanliness < DIRTY_BELOW &&
            !petSays ? (
              <DirtyMark petX={petX} petY={petY} petWidth={petW} />
            ) : null}

            {state.petSpeciesId && run.scene() === 'home' ? (
              <PetSays
                message={petSays}
                petX={petX}
                petY={petY}
                petWidth={petW}
                roomWidth={roomWidth}
              />
            ) : null}
          </RoomView>
        </View>

        {/* Шапка: показатели питомца, копилка и монеты видны всегда */}
        <View
          style={{
            // Вставки берём из safe-area, а не из StatusBar: снизу
            // есть ещё полоса жестов, и на разных телефонах она разная.
            paddingTop: insets.top + theme.space.sm,
            paddingHorizontal: theme.space.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {/* Левая колонка уступает место первой: на экране 360 dp
              (нижняя граница по ТЗ 3.1) шапка не помещалась, и правая
              группа уезжала за край вместе с кнопкой меню — а через
              неё единственный путь в магазин, копилку и раздел для
              взрослого. */}
          <View style={{ gap: theme.space.sm, flexShrink: 1, minWidth: 0 }}>
            {/* Показатели питомца вместо номера дня: ТЗ 2.5.3 требует
                видеть их одновременно с балансом, без нажатия. День
                виден на экранах ночи, плана и итога. */}
            {!giftScene && state.petSpeciesId ? (
              <View style={{ alignSelf: 'flex-start', flexShrink: 1 }}>
                <PetStatsBadge
                  satiety={state.stats.satiety}
                  mood={state.stats.mood}
                  cleanliness={state.stats.cleanliness}
                  onPress={() => setEdgePanel('pet')}
                />
              </View>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: theme.space.xs,
              flexShrink: 0,
            }}
          >
            {/* Копилка рядом с балансом: ТЗ 2.5.3 требует, чтобы баланс,
              накопления и цель были видны одновременно. Открывается
              только когда есть что показывать. */}
            {!giftScene && (state.savings > 0 || state.goalId) ? (
              <PixelPanel
                ledge={6}
                onPress={() => setGoalOpen(true)}
                color={theme.color.surface}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space.xs,
                  paddingVertical: theme.space.xs,
                  paddingHorizontal: theme.space.sm,
                }}
              >
                {/* Картинка выбранной цели, а не общая копилка: ТЗ
                    2.5.3 требует видеть на главном экране и накопления,
                    И текущую цель. Вместе с «сколько из скольких» это
                    отвечает на оба вопроса одной плашкой — лишней
                    ширины в шапке нет. */}
                <Image
                  source={headerGoal ? headerGoal.image : SAVINGS_ICON}
                  style={{ width: 26, height: 26 }}
                  resizeMode="contain"
                />
                <Text variant="caption">
                  {headerGoal
                    ? `${state.savings} / ${headerGoal.price}`
                    : state.savings}
                </Text>
              </PixelPanel>
            ) : null}
            {!giftScene ? (
              <PixelPanel
                ledge={6}
                color={theme.color.coin}
                ledgeColor={theme.color.coinShadow}
                style={{
                  paddingVertical: theme.space.xs,
                  paddingHorizontal: theme.space.sm,
                }}
              >
                <Coins
                  amount={state.balance}
                  variant="caption"
                  color={theme.color.text.primary}
                />
              </PixelPanel>
            ) : null}
            {/* Указателя здесь нет намеренно: лапка нарисована тычущей
              вниз, а над кнопкой шапки места нет. Дорогу в магазин
              подсказка называет словами — «меню ☰». */}
            <PixelPanel
              ledge={6}
              onPress={() => setHubOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Меню"
              style={{
                paddingVertical: theme.space.xs,
                paddingHorizontal: theme.space.sm,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Кнопка ведёт в узел разделов, а не в настройки, поэтому
                значок меню, а не шестерёнка. Полоски нарисованы, а не
                символом шрифта: у шрифта «☰» сидит выше центра строки. */}
              <View style={{ gap: 4 }}>
                {[0, 1, 2].map(bar => (
                  <View
                    key={bar}
                    style={{
                      width: 20,
                      height: 3,
                      backgroundColor: theme.color.text.primary,
                    }}
                  />
                ))}
              </View>
            </PixelPanel>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Говорящий в полный рост стоит над плашкой и перекрывает комнату */}
        {isDialogue && storyVisible ? (
          <ActorStage
            speaker={node.type === 'dialogue' ? node.speaker : undefined}
            pose={node.type === 'dialogue' ? node.pose : undefined}
            kind={node.type === 'thought' ? 'thought' : 'dialogue'}
            petSpeciesId={state.petSpeciesId}
            maxHeight={actorHeight}
            maxWidth={actorWidth}
          />
        ) : null}

        {/* Управление демо-режимом — только когда он включён.
          Стоит ПОД шапкой, а не внизу: внизу живёт полка дел,
          и две панели там перекрывали друг друга. */}
        {/*
          Служебные панели выезжают от краёв и по умолчанию спрятаны.

          Постоянно висящие плашки занимали середину экрана и закрывали
          сцену — комнату, персонажей, пример на доске. Теперь у края
          видна только узкая вкладка: нажал — выехало, нажал — уехало.

          Показатели питомца справа, управление приёмкой слева: они
          не мешают друг другу, потому что физически с разных сторон.
        */}
        {/*
          Пример выносится на доску КРУПНЫМ ПЛАНОМ, а не пишется мелко
          на доске в глубине кадра. Ребёнок читает по слогам: условие,
          которое не разобрать, делает задачу нерешаемой независимо
          от её сложности.
        */}
        {node.type === 'riddle' && storyVisible ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: insets.top + 96,
            }}
          >
            <BoardCloseUp text={say(node.prompt)} />
          </View>
        ) : null}

        {/* Нажатие по сцене убирает выдвинутую панель. Слой появляется
            только когда есть что закрывать, иначе он перехватывал бы
            касания по комнате и питомцу. */}
        {edgePanel !== null && !overlayOpen ? (
          <Pressable
            onPress={() => setEdgePanel(null)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
        ) : null}

        {!overlayOpen ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              // В классе наверху доска с примером — панели ниже её края.
              // Граница берётся из данных фона, а не подбирается числом.
              top:
                run.scene() === 'school'
                  ? (SCHOOL_BOARD.y + SCHOOL_BOARD.h) * roomHeight +
                    theme.space.sm
                  : insets.top + 96,
              // Обе вкладки на одном уровне: ряд, прижатый к краям.
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            {/* Колонки прибиты к краям абсолютно: закрытая панель уезжает
                трансформом, но место в ряду занимает — широкий список дел
                выталкивал вкладку питомца за правый край. */}
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                gap: theme.space.sm,
              }}
            >
              {/* Дела — выдвижной вкладкой, как показатели питомца: список
                открытым закрывал полкомнаты. */}
              {node.type === 'taskGate' ? (
                <EdgePanel
                  side="left"
                  label="ЗАДАЧИ"
                  open={edgePanel === 'tasks'}
                  onToggle={() =>
                    setEdgePanel(p => (p === 'tasks' ? null : 'tasks'))
                  }
                >
                  <TaskChecklist
                    tasks={dayTasks}
                    titleOf={taskTitle}
                    challenges={state.plan ? dayChallenges(state) : []}
                    onAskHint={
                      hintOnScene
                        ? undefined
                        : () => setAskedHint(askedTaskHint(state))
                    }
                  />
                </EdgePanel>
              ) : null}
              {state.demoMode ? (
                <EdgePanel
                  side="left"
                  label="ДЕМО"
                  open={edgePanel === 'demo'}
                  onToggle={() =>
                    setEdgePanel(p => (p === 'demo' ? null : 'demo'))
                  }
                >
                  <DemoPanel
                    day={state.day}
                    onSkipDay={skipDayForDemo}
                    onReset={resetGame}
                    onExit={() => {
                      // Тестовый профиль демо — выходим на главный экран;
                      // в профиле ребёнка просто выключаем режим.
                      if (demo) {
                        onExit();
                        return;
                      }
                      run.apply([{ do: 'setDemoMode', on: false }]);
                      setEdgePanel(null);
                      refresh();
                    }}
                  />
                </EdgePanel>
              ) : null}
            </View>

            {/* ТЗ 2.5.3: показатели доступны с главного экрана. */}
            {state.petSpeciesId ? (
              <View
                pointerEvents="box-none"
                style={{ position: 'absolute', right: 0, top: 0 }}
              >
                <EdgePanel
                  side="right"
                  label={state.petName.toUpperCase()}
                  open={edgePanel === 'pet'}
                  onToggle={() =>
                    setEdgePanel(p => (p === 'pet' ? null : 'pet'))
                  }
                >
                  <PetStatusBar
                    satiety={state.stats.satiety}
                    mood={state.stats.mood}
                    cleanliness={state.stats.cleanliness}
                    xp={state.xp}
                  />
                </EdgePanel>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Подсказка стоит НАД полкой дел и показывает на неё. */}
        {sceneHintText !== null ? (
          <View
            pointerEvents="none"
            style={{
              paddingHorizontal: theme.space.md,
              // Зазор под плашкой — место для лапки, которая стоит
              // над кнопкой: иначе она налезает на подсказку.
              paddingBottom: theme.space.lg,
            }}
          >
            <HintBubble text={sceneHintText} />
          </View>
        ) : null}

        {/* Нижняя панель: лежит на нижней стенке комнаты */}
        <View
          // Пока имени нет, сюжет не показываем вовсе: иначе реплика
          // видна и нажимаема из-под экрана знакомства.
          pointerEvents={storyVisible ? 'auto' : 'none'}
          style={{
            opacity: storyVisible ? 1 : 0,
            paddingHorizontal: theme.space.md,
            // Полка стоит НА нижней стенке комнаты — это визуальная привязка
            // к фону. Но она обязана ещё и расчищать полосу жестов, которая
            // на разных телефонах разной высоты, поэтому берём большее из двух.
            paddingBottom: Math.max(
              Math.round(height * 0.055),
              insets.bottom + theme.space.xs,
            ),
            gap: theme.space.md,
          }}
        >
          {node.type === 'dialogue' ? (
            <DialogueBox
              kind="dialogue"
              speaker={node.speaker}
              text={say(node.text)}
              onNext={next}
            />
          ) : null}

          {node.type === 'thought' ? (
            <DialogueBox kind="thought" text={say(node.text)} onNext={next} />
          ) : null}

          {node.type === 'choice' ? (
            <ChoiceList
              prompt={say(node.prompt)}
              options={node.options}
              onChoose={id => {
                run.choose(id);
                refresh();
              }}
            />
          ) : null}

          {/* Два вида задания на доске: выбрать вариант и собрать
              фразу из слов. Выбор по признаку узла, а не по виду урока:
              экран знает про сценарий, а не про пул заданий. */}
          {node.type === 'riddle' && node.assemble ? (
            <PhraseBoard
              phrase={String(node.options.find(o => o.correct)?.value ?? '')}
              // Зерно от дня: одно задание — одна раскладка, но у
              // разных заданий она разная.
              seed={state.day}
              feedback={riddleFeedback?.text ?? null}
              correct={riddleFeedback?.ok ?? false}
              onAnswer={value => {
                const res = run.answer(value);
                setRiddleFeedback({ text: say(res.message), ok: res.correct });
                refresh();
              }}
              onNext={next}
            />
          ) : null}

          {node.type === 'riddle' && !node.assemble ? (
            <RiddleBoard
              options={node.options}
              feedback={riddleFeedback?.text ?? null}
              correct={riddleFeedback?.ok ?? false}
              onAnswer={value => {
                const res = run.answer(value);
                setRiddleFeedback({ text: say(res.message), ok: res.correct });
                refresh();
              }}
              onNext={next}
            />
          ) : null}

          {node.type === 'taskGate' && !overlayOpen ? (
            <View style={{ gap: theme.space.xs }}>
              <TaskShelf
                // Все действия дня, включая выполненные: полка — это
                // возможности, а не список задач. Прогресс показывает
                // чек-лист под счётчиком дня.
                tasks={dayTasks.map(t => ({
                  taskId: t.taskId,
                  title: taskTitle(t.taskId),
                  icon: TASK_FALLBACK,
                  opensGame: Boolean(TASK_GAMES[t.taskId]),
                  dropAnywhere: Boolean(TASK_PLACED[t.taskId]),
                  // Миска — кадр из анимации питомца, остальные дела
                  // берут иконку из общего листа.
                  image:
                    t.taskId === 'feed'
                      ? bowlImage?.source
                      : TASK_ICONS[t.taskId],
                  // Пока миска на полу, вторую поставить нельзя.
                  busy: t.taskId === 'feed' && bowl !== null,
                  // Кормить нечем и мыть нечем, пока не куплено.
                  locked: taskBlocker(state, t.taskId) !== null,
                }))}
                highlight={
                  hintOnScene ? hintTask : askedOnScene ? askedTask : null
                }
                petX={petX}
                petY={petY}
                petWidth={petW}
                petHeight={petH}
                floor={floorRect}
                onDelivered={deliverTask}
                onOpenGame={taskId => setActiveGame({ taskId })}
                onBlocked={taskId => {
                  const block = taskBlocker(state, taskId);
                  if (block) {
                    setBlockedSay(block);
                  }
                }}
              />
            </View>
          ) : null}

          {node.type === 'shop' ? (
            <ScrollView style={{ maxHeight: height * 0.5 }}>
              <View style={{ gap: theme.space.sm }}>
                <Text variant="title" style={{ textAlign: 'center' }}>
                  МАГАЗИН
                </Text>
                {REGISTRIES.items.map(item => {
                  const affordable = state.balance >= item.price;
                  return (
                    <PixelPanel
                      key={item.id}
                      onPress={() => {
                        if (!affordable) {
                          return;
                        }
                        run.apply([
                          {
                            do: 'takeCoins',
                            amount: item.price,
                            reason: item.title,
                          },
                          { do: 'giveItem', itemId: item.id },
                        ]);
                        refresh();
                      }}
                      color={
                        affordable
                          ? theme.color.surface
                          : theme.color.surfaceElevated
                      }
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        variant="button"
                        tone={affordable ? 'primary' : 'muted'}
                      >
                        {item.title}
                      </Text>
                      <Coins
                        amount={item.price}
                        tone={affordable ? 'coin' : 'muted'}
                      />
                    </PixelPanel>
                  );
                })}
                <PixelPanel
                  onPress={next}
                  color={theme.color.brand}
                  ledgeColor={theme.color.brandShadow}
                  style={{ alignItems: 'center' }}
                >
                  <Text variant="button" tone="onColor">
                    ДОМОЙ
                  </Text>
                </PixelPanel>
              </View>
            </ScrollView>
          ) : null}

          {node.type === 'endDay' ? (
            <PixelPanel
              onPress={next}
              color={theme.color.brand}
              ledgeColor={theme.color.brandShadow}
              style={{ alignItems: 'center' }}
            >
              <Text variant="button" tone="onColor">
                СПАТЬ ▸
              </Text>
            </PixelPanel>
          ) : null}
        </View>

        {/* Дело делать нечем — герой говорит, чего не хватает.
            Выглядит как обычный диалог, потому что это он и есть. */}
        {blockedSay ? (
          <ScreenOverlay
            background="rgba(20,12,8,0.55)"
            style={{ justifyContent: 'flex-end' }}
          >
            <ActorStage
              speaker="hero"
              kind="dialogue"
              pose="think"
              petSpeciesId={state.petSpeciesId}
              maxHeight={actorHeight}
              maxWidth={actorWidth}
            />
            <View
              style={{
                paddingHorizontal: theme.space.md,
                paddingBottom: Math.max(
                  Math.round(height * 0.055),
                  insets.bottom + theme.space.xs,
                ),
              }}
            >
              <DialogueBox
                kind="dialogue"
                speaker="hero"
                text={blockedSay.message}
                onNext={() => setBlockedSay(null)}
              />
              {/* Дорога в магазин — только когда мешает нехватка.
                  Без неё день, в котором расходники кончились, стал бы
                  тупиком. А если дело просто ждёт очереди, звать
                  в магазин незачем: покупка там ничего не изменит. */}
              {blockedSay.kind === 'item' ? (
                <PixelPanel
                  ledge={6}
                  onPress={() => {
                    setBlockedSay(null);
                    setShopOpen('errand');
                  }}
                  color={theme.color.brand}
                  ledgeColor={theme.color.brandShadow}
                  style={{
                    alignItems: 'center',
                    marginTop: theme.space.sm,
                  }}
                >
                  <Text variant="button" tone="onColor">
                    В МАГАЗИН ▸
                  </Text>
                </PixelPanel>
              ) : null}
            </View>
          </ScreenOverlay>
        ) : null}

        {/* Ночь прошла — новый день начинается с этого кадра. */}
        {nightNeeded ? (
          <NightScene
            day={state.day}
            speciesId={state.petSpeciesId}
            colorId={state.petColorId}
            petName={state.petName}
            onMorning={() => {
              run.apply([
                { do: 'setFlag', flag: morningFlag(state.day), value: true },
              ]);
              refresh();
            }}
          />
        ) : null}

        {needName ? (
          <WelcomeScene
            onDone={name => {
              run.apply([{ do: 'setPlayerName', name }]);
              refresh();
            }}
          />
        ) : null}

        {makingPet ? (
          <PetMaker
            onDone={({ speciesId, colorId, name }) => {
              run.choose(speciesId);
              run.apply([
                { do: 'setPetColor', colorId },
                { do: 'setPetName', name },
              ]);
              if (!demo) setAppIcon(speciesId);
              refresh();
            }}
          />
        ) : null}

        {planViewOpen ? (
          <PlanView state={state} onClose={() => setPlanViewOpen(false)} />
        ) : null}

        {petEditOpen && state.petSpeciesId ? (
          <PetMaker
            initial={{
              speciesId: state.petSpeciesId,
              colorId: state.petColorId,
              name: state.petName,
            }}
            onCancel={() => setPetEditOpen(false)}
            onDone={({ speciesId: nextSpecies, colorId, name }) => {
              run.apply([
                { do: 'setPetSpecies', speciesId: nextSpecies },
                { do: 'setPetColor', colorId },
                { do: 'setPetName', name },
              ]);
              if (!demo) setAppIcon(nextSpecies);
              setPetEditOpen(false);
              refresh();
            }}
          />
        ) : null}

        {ledgerOpen ? (
          <LedgerScene state={state} onClose={() => setLedgerOpen(false)} />
        ) : null}

        {progressOpen ? (
          <ProgressScene state={state} onClose={() => setProgressOpen(false)} />
        ) : null}

        {adultOpen ? (
          <AdultScene
            state={state}
            onReset={() => {
              setAdultOpen(false);
              resetGame();
            }}
            onToggleMotion={() => {
              run.apply([{ do: 'setReduceMotion', on: !state.reduceMotion }]);
              refresh();
            }}
            onStartDemo={() => {
              run.apply([{ do: 'setDemoMode', on: !state.demoMode }]);
              setAdultOpen(false);
              refresh();
            }}
            onGrantBonus={() => {
              run.apply([{ do: 'grantCoins', ...PARENT_BONUS }]);
              refresh();
            }}
            onClose={() => setAdultOpen(false)}
          />
        ) : null}

        {hubOpen ? (
          <HubScene
            tiles={hubTiles}
            onOpen={section => {
              setHubOpen(false);
              if (section === 'tasks') {
                setEdgePanel('tasks');
              } else if (section === 'plan') {
                setPlanViewOpen(true);
              } else if (section === 'pet') {
                setPetEditOpen(true);
              } else if (section === 'savings') {
                setGoalOpen(true);
              } else if (section === 'shop') {
                setShopOpen('errand');
              } else if (section === 'adult') {
                setAdultOpen(true);
              } else if (section === 'progress') {
                setProgressOpen(true);
              } else if (section === 'ledger') {
                setLedgerOpen(true);
              } else if (section === 'howto') {
                setHowtoOpen(true);
              }
            }}
            onBack={() => setHubOpen(false)}
          />
        ) : null}

        {summaryNeeded && node.type === 'endDay' ? (
          <DaySummaryScene
            state={state}
            day={state.day}
            reward={DAILY_REWARD}
            experience={(() => {
              const lines = dayXp(
                dayXpInput(
                  state,
                  dayTasks.every(task => task.complete),
                ),
              );
              // Если день уже записан (перезапуск на итоге), опыт в
              // состоянии его включает — полоса начинается с «до».
              const recorded = state.lastRecordedDay === state.day;
              const before = recorded ? state.xp - totalXp(lines) : state.xp;
              return <XpGain lines={lines} xpBefore={Math.max(0, before)} />;
            })()}
            onNext={extra => {
              // Отложенное сверх плана — до записи дня: опыт за копилку
              // и значки считаются по тому, что реально легло в копилку.
              if (extra > 0) {
                run.apply([{ do: 'saveExtra', amount: extra }]);
              }
              recordDayAndGrow();
              setSummaryShown(true);
              refresh();
            }}
            onNextNeedsFirst={() => {
              run.apply([
                {
                  do: 'setFlag',
                  flag: needsFirstFlag(state.day + 1),
                  value: true,
                },
              ]);
              recordDayAndGrow();
              setSummaryShown(true);
              refresh();
            }}
          />
        ) : null}

        {goalOpen ? (
          <GoalScene
            state={state}
            onChoose={goalId => {
              run.apply([{ do: 'setGoal', goalId }]);
              refresh();
            }}
            onClaim={goalId => {
              run.apply([{ do: 'claimGoal', goalId }]);
              awardAchievements();
              refresh();
            }}
            onWithdraw={amount => {
              run.apply([
                { do: 'withdrawSavings', amount, reason: 'взял из копилки' },
              ]);
              refresh();
            }}
            onClose={() => setGoalOpen(false)}
          />
        ) : null}

        {hintsFarewell ? (
          <ScreenOverlay
            background="rgba(20,12,8,0.86)"
            style={{ justifyContent: 'center', padding: theme.space.lg }}
          >
            <PixelPanel ledge={6} style={{ gap: theme.space.md }}>
              <Text variant="title" style={{ textAlign: 'center' }}>
                ПЕРВЫЙ ДЕНЬ ПРОЙДЕН
              </Text>
              <Text variant="body">{HINTS_OFF_MESSAGE}</Text>
              <PixelPanel
                ledge={6}
                onPress={() => {
                  run.apply([{ do: 'setHints', on: false }]);
                  refresh();
                }}
                color={theme.color.brand}
                ledgeColor={theme.color.brandShadow}
                style={{ alignItems: 'center' }}
              >
                <Text variant="button" tone="onColor">
                  ПОНЯТНО
                </Text>
              </PixelPanel>
            </PixelPanel>
          </ScreenOverlay>
        ) : null}

        {/* Новый уровень — событие, которое нельзя пропустить мимо
            глаз. Показываем сам рост и за что он пришёл, а не цифру. */}
        {levelUp && !summaryNeeded ? (
          <LevelUpScene
            from={levelUp.from}
            to={levelUp.to}
            petName={state.petName}
            speciesId={state.petSpeciesId}
            colorId={state.petColorId}
            reasons={levelUp.reasons}
            onClose={() => setLevelUp(null)}
          />
        ) : null}

        {todayEvent ? (
          <EventCard
            event={{ ...todayEvent, text: personalize(todayEvent.text, state) }}
            onAck={() => {
              run.apply([...todayEvent.effects, { do: 'markEventSeen' }]);
              refresh();
            }}
          />
        ) : null}

        {planNeeded ? (
          <PlanScene
            income={state.balance}
            petName={state.petName}
            goal={
              planGoal
                ? {
                    id: planGoal.id,
                    title: planGoal.title,
                    saved: state.savings,
                    price: planGoal.price,
                    image: planGoal.image,
                  }
                : null
            }
            achievedGoalIds={state.goalsAchieved}
            mustCost={mustCost(state)}
            initialMust={
              state.flags[needsFirstFlag(state.day)] ? mustCost(state) : 0
            }
            onChooseGoal={goalId => {
              run.apply([{ do: 'setGoal', goalId }]);
              refresh();
            }}
            // Если все расходники на руках, покупать сегодня нечего,
            // и направление «Нужное» в плане только мешает.
            hint={hintText}
            // Покупать сегодня есть что, если список покупок не пуст:
            // набор на завтра берут сегодня, даже когда дома всё есть.
            needsShopping={mustCost(state) > 0}
            onConfirm={plan => {
              run.apply([{ do: 'planBudget', ...plan }]);
              refresh();
              if (state.flags[needsFirstFlag(state.day)] && plan.must > 0) {
                setShopOpen('errand');
              }
            }}
          />
        ) : null}

        {shopOpen !== null ? (
          <ShopScene
            state={state}
            hintTarget={hint?.target ?? null}
            onBuy={item => {
              // Трата записывается в своё направление: вечером план
              // сравнивается с фактом (UC-4). Цена — сегодняшняя, со скидкой.
              run.apply([
                {
                  do: 'spendFrom',
                  category: item.category,
                  amount: priceFor(state, item),
                  reason: item.title,
                },
                { do: 'giveItem', itemId: item.id },
                // Лакомство радует сразу, расходник — когда им
                // воспользуются: шампунь в пакете питомца не моет.
                ...purchaseEffects(item),
              ]);
              refresh();
            }}
            onCover={(item, option) => {
              run.apply(coverAndBuyEffects(state, item, option));
              refresh();
            }}
            onGreeted={() => {
              run.apply([
                { do: 'setFlag', flag: SHOP_GREETED_FLAG, value: true },
              ]);
              refresh();
            }}
            onClose={() => {
              const cameFromWalk = shopOpen === 'walk';
              setShopOpen(null);
              // За прогулку засчитывается только поход С прогулки.
              if (cameFromWalk) {
                completeTask('walk');
              }
            }}
          />
        ) : null}

        {settingsOpen ? (
          <SettingsSheet
            currentSpeciesId={state.petSpeciesId}
            onChangeSpecies={changeSpecies}
            onReset={resetGame}
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}

        {/* Мини-игра поверх сцены: питомец увеличен и не убегает */}
        {activeGame && state.petSpeciesId ? (
          TASK_GAMES[activeGame.taskId] === 'run' ? (
            <RunGame
              speciesId={speciesId}
              onDone={leashTorn => {
                setActiveGame(null);
                // Споткнулся — поводок порвался: в магазине он встанет
                // в список нужного, без него завтра не погулять.
                if (leashTorn) {
                  run.apply([{ do: 'consumeItem', itemId: 'leash' }]);
                  refresh();
                }
                // Прогулка заканчивается у магазина — туда и заходим,
                // и только этот заход засчитывается за прогулку.
                setShopOpen('walk');
              }}
              onCancel={() => setActiveGame(null)}
            />
          ) : TASK_GAMES[activeGame.taskId] === 'bath' ? (
            <BathGame
              speciesId={speciesId}
              onDone={() => {
                setActiveGame(null);
                completeTask(activeGame.taskId);
              }}
              onCancel={() => setActiveGame(null)}
            />
          ) : (
            <StrokeGame
              speciesId={speciesId}
              onDone={() => {
                setActiveGame(null);
                completeTask(activeGame.taskId);
              }}
              onCancel={() => setActiveGame(null)}
            />
          )
        ) : null}

        {howtoOpen ? (
          <HowToPlayScene
            sections={HOW_TO_PLAY}
            hintsOn={state.hintsOn}
            onTurnHintsOn={() => {
              run.apply([{ do: 'setHints', on: true }]);
              refresh();
            }}
            onClose={() => setHowtoOpen(false)}
          />
        ) : null}
      </View>
    </MotionProvider>
  );
}

function taskTitle(taskId: string): string {
  return REGISTRIES.tasks.find(t => t.id === taskId)?.title ?? taskId;
}
