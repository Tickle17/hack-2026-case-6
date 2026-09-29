import type { GameState } from '../model/types';
import {
  createInitialState,
  MAX_BALANCE,
  MIN_BALANCE,
  STATE_VERSION,
} from './state';
import { sanitizePetName } from '@/entities/pet/lib/appearance';
import { validateName } from '@/shared/lib/name';

/**
 * Сохранение прогресса.
 *
 * Хранилище передаётся портом, а не берётся напрямую: так логика
 * сохранения тестируется без нативного модуля, а подмена MMKV на что-то
 * другое не заденет эту функцию.
 *
 * Главное правило: **испорченное сохранение не роняет игру**. Ребёнок
 * потеряет прогресс — это плохо, но переживаемо; падение при запуске
 * означает, что играть нельзя вообще.
 */

export interface StatePort {
  read(): string | null;
  write(value: string): void;
  clear(): void;
}

type Envelope = { version: number; state: unknown };

export function saveState(state: GameState, port: StatePort): void {
  const envelope: Envelope = { version: STATE_VERSION, state };
  try {
    port.write(JSON.stringify(envelope));
  } catch {
    // Не смогли сохранить — играть это не мешает.
  }
}

function clamp(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function asRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = Math.max(0, Math.round(raw));
    }
  }
  return out;
}

function asFlags(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = Boolean(raw);
  }
  return out;
}

/** План мог прийти битым — тогда день начинается без плана. */
function asPlan(value: unknown): GameState['plan'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const p = value as Record<string, unknown>;
  const part = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.max(0, Math.round(v))
      : 0;
  return { must: part(p.must), want: part(p.want), save: part(p.save) };
}

function asSpent(value: unknown): GameState['spent'] {
  const r = asRecord(value);
  return { must: r.must ?? 0, want: r.want ?? 0 };
}

/** Показатели обрезаются по тем же границам, что и в игре. */
function asStats(
  value: unknown,
  fallback: GameState['stats'],
): GameState['stats'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }
  const p = value as Record<string, unknown>;
  const stat = (v: unknown, def: number): number =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.max(0, Math.min(100, Math.round(v)))
      : def;
  return {
    satiety: stat(p.satiety, fallback.satiety),
    mood: stat(p.mood, fallback.mood),
    cleanliness: stat(p.cleanliness, fallback.cleanliness),
  };
}

/** Битая запись отбрасывается, а не роняет игру. */
function asLedger(value: unknown): GameState['ledger'] {
  if (!Array.isArray(value)) {
    return [];
  }
  const kinds = ['income', 'expense', 'savings', 'withdraw'];
  return value
    .filter(
      (e): e is GameState['ledger'][number] =>
        Boolean(e) &&
        typeof e === 'object' &&
        typeof (e as { amount?: unknown }).amount === 'number' &&
        typeof (e as { reason?: unknown }).reason === 'string' &&
        kinds.includes((e as { kind?: string }).kind ?? ''),
    )
    .slice(0, 40);
}

/** Имя проходит ту же проверку, что и при вводе. */
function asPlayerName(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const checked = validateName(value);
  return checked.ok ? checked.name : '';
}

function asNumbers(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter(
        (v): v is number => typeof v === 'number' && Number.isFinite(v),
      )
    : [];
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

/**
 * Читает сохранение. Возвращает null, если его нет или оно непригодно —
 * тогда игра начинается заново.
 */
export function loadState(port: StatePort): GameState | null {
  let raw: string | null;
  try {
    raw = port.read();
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }

  let envelope: Envelope;
  try {
    envelope = JSON.parse(raw) as Envelope;
  } catch {
    return null;
  }

  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return null;
  }
  // Сохранение из будущей версии: формат мог измениться несовместимо.
  // Начать заново честнее, чем упасть на чужой структуре.
  if (envelope.version !== STATE_VERSION) {
    return null;
  }

  const saved = envelope.state;
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
    return null;
  }

  const s = saved as Partial<GameState>;
  const base = createInitialState(
    typeof s.currentNodeId === 'string' ? s.currentNodeId : 'start',
  );

  // Дополняем недостающие поля значениями по умолчанию: старое сохранение
  // могло не знать о полях, добавленных позже.
  return {
    ...base,
    day: clamp(s.day, 1, Number.MAX_SAFE_INTEGER, base.day),
    // Имя из битого сохранения не подставляем: лучше спросить заново,
    // чем обращаться к ребёнку мусором.
    playerName: asPlayerName(s.playerName),
    balance: clamp(s.balance, MIN_BALANCE, MAX_BALANCE, base.balance),
    petSpeciesId: typeof s.petSpeciesId === 'string' ? s.petSpeciesId : null,
    petColorId:
      typeof s.petColorId === 'string' ? s.petColorId : base.petColorId,
    petName:
      typeof s.petName === 'string' ? sanitizePetName(s.petName) : base.petName,
    inventory: asRecord(s.inventory),
    tasksToday: asRecord(s.tasksToday),
    unlockedTasks: asStrings(s.unlockedTasks),
    unlockedCatalogs: asStrings(s.unlockedCatalogs),
    lessonsDone: asStrings(s.lessonsDone),
    flags: asFlags(s.flags),
    shopUnlocked: Boolean(s.shopUnlocked),
    // Накопления — такой же инвариант, как баланс: в минус не уходят.
    savings: clamp(s.savings, 0, MAX_BALANCE, 0),
    plan: asPlan(s.plan),
    planBaseline: asPlan(s.planBaseline),
    spent: asSpent(s.spent),
    yesterday: asRecap(s.yesterday),
    hungerSince:
      typeof s.hungerSince === 'number' && Number.isFinite(s.hungerSince)
        ? s.hungerSince
        : null,
    leftoverToday:
      typeof s.leftoverToday === 'number'
        ? clamp(s.leftoverToday, 0, MAX_BALANCE, 0)
        : null,
    goalId: typeof s.goalId === 'string' ? s.goalId : null,
    savingsHistory: asNumbers(s.savingsHistory),
    careHistory: asNumbers(s.careHistory),
    // Сохранения до уровней опыта не знали: начинаем с нуля, а не
    // падаем. Достигнутое при этом не теряется — оно в истории заботы.
    xp: typeof s.xp === 'number' && s.xp >= 0 ? Math.round(s.xp) : 0,
    lastRecordedDay: clamp(s.lastRecordedDay, 0, Number.MAX_SAFE_INTEGER, 0),
    lastWithdrawDay: clamp(s.lastWithdrawDay, 0, Number.MAX_SAFE_INTEGER, 0),
    lastEventDay: clamp(s.lastEventDay, 0, Number.MAX_SAFE_INTEGER, 0),
    scene:
      s.scene === 'school' || s.scene === 'shop' || s.scene === 'home'
        ? s.scene
        : 'home',
    ledger: asLedger(s.ledger),
    hintsOn: typeof s.hintsOn === 'boolean' ? s.hintsOn : true,
    goalsAchieved: asStrings(s.goalsAchieved),
    achievements: asStrings(s.achievements),
    stats: asStats(s.stats, base.stats),
    demoMode: Boolean(s.demoMode),
    reduceMotion: Boolean(s.reduceMotion),
  };
}

export function clearState(port: StatePort): void {
  try {
    port.clear();
  } catch {
    // Нечего чистить — не беда.
  }
}

function asPlanFact(
  value: unknown,
): { planned: number; actual: number } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.planned !== 'number' || typeof v.actual !== 'number')
    return null;
  return {
    planned: clamp(v.planned, 0, MAX_BALANCE, 0),
    actual: clamp(v.actual, 0, MAX_BALANCE, 0),
  };
}

/** Итог прошлого дня: битый — просто не показываем. */
function asRecap(value: unknown): GameState['yesterday'] {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const must = asPlanFact(v.must);
  const want = asPlanFact(v.want);
  const save = asPlanFact(v.save);
  if (typeof v.day !== 'number' || !must || !want || !save) return null;
  return { day: Math.max(1, Math.round(v.day)), must, want, save };
}
