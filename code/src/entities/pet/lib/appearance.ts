import { GENERATED_ANIMATIONS } from '../config/animations.generated';
import { SPECIES } from '../config/species';
import { ADULT_SUFFIX, type PetAnimation } from '../config/animations';

/**
 * Внешний вид и имя питомца (UC-9).
 *
 * ТЗ 2.5.2 требует настройку внешнего вида и ввод имени, ТЗ 2.6 —
 * не менее девяти визуально различимых комбинаций. Четыре вида
 * в трёх окрасах дают двенадцать.
 *
 * Окрасы — не отдельные спрайты, а перекрашенные кадры тех же
 * анимаций (tools/assets/prepare_colors.py). Ключ в реестре —
 * «вид--окрас», потому что пути в require() обязаны быть литералами.
 */

export type PetColor = {
  id: string;
  title: string;
  /** Суффикс ключа в реестре; у родного окраса его нет. */
  suffix: string;
};

export const COLORS: PetColor[] = [
  { id: 'own', title: 'Стандартный', suffix: '' },
  { id: 'black', title: 'Чёрный', suffix: '--black' },
  { id: 'brown', title: 'Бурый', suffix: '--brown' },
];

export function combinationCount(): number {
  return SPECIES.length * COLORS.length;
}

/*
 * Повзрослевший питомец (после третьего уровня) рисуется другими
 * листами — ключ «cat-adult». Их нарисуют позже основных; до тех пор
 * ключа в реестре нет, и питомец остаётся в обычном наборе.
 */

/**
 * Выбор набора картинок по реестру. Отдельно от реестра, чтобы его
 * можно было проверить на подставных данных: взрослых листов пока нет,
 * а логика выбора нужна уже сейчас.
 */
/**
 * Позы, без которых взрослый вид не включается: их видно каждый день.
 * Грязный лист — тоже: после прогулки он заменяет и покой, и ходьбу.
 */
const ADULT_REQUIRED = ['idle', 'walk', 'dirty'] as const;

/**
 * Можно ли показывать этот набор.
 *
 * Взрослый — только если нарисованы покой, ходьба и грязный лист:
 * питомец всё время переходит из одного в другое. Будь взрослой одна ходьба, он
 * шёл бы взрослым, а остановившись — снова становился малышом, и
 * персонаж менялся бы на глазах каждые пару секунд. Остальные позы
 * взрослого набора могут и отсутствовать — они редкие и подменяются.
 */
function usable(registry: Record<string, unknown>, key: string): boolean {
  const set = registry[key] as Record<string, unknown> | undefined;
  if (!set) {
    return false;
  }
  return key.includes(ADULT_SUFFIX)
    ? ADULT_REQUIRED.every(pose => Boolean(set[pose]))
    : true;
}

export function pickRegistryKey(
  registry: Record<string, unknown>,
  speciesId: string,
  colorId: string,
  grownUp = false,
): string {
  const color = COLORS.find(c => c.id === colorId);
  const suffix = color?.suffix ?? '';
  const candidates = [
    ...(grownUp
      ? [`${speciesId}${ADULT_SUFFIX}${suffix}`, `${speciesId}${ADULT_SUFFIX}`]
      : []),
    `${speciesId}${suffix}`,
  ];
  // Неизвестный окрас или ненарисованный взрослый вид не должны ронять
  // игру: откатываемся к родному набору.
  return candidates.find(key => usable(registry, key)) ?? speciesId;
}

/** Кадры анимации нужного вида в нужном окрасе. */
export function petFrames(
  speciesId: string,
  animation: PetAnimation,
  colorId: string,
  grownUp = false,
): unknown[] {
  const set =
    GENERATED_ANIMATIONS[
      pickRegistryKey(GENERATED_ANIMATIONS, speciesId, colorId, grownUp)
    ];
  return set?.[animation]?.frames ?? [];
}

/** Ключ для реестра анимаций с учётом окраса. */
export function petRegistryKey(
  speciesId: string,
  colorId: string,
  grownUp = false,
): string {
  return pickRegistryKey(GENERATED_ANIMATIONS, speciesId, colorId, grownUp);
}

/** Имя по умолчанию — из названия продукта в ТЗ. */
export const DEFAULT_PET_NAME = 'Финни';

const MAX_NAME = 12;

/**
 * Приводит введённое имя к пригодному виду.
 *
 * Безымянного питомца быть не должно: пустое поле заменяется
 * предложенным именем, а не оставляется пустым. Длина ограничена,
 * иначе имя не влезет в шапку.
 */
export function sanitizePetName(raw: string): string {
  const cleaned = raw.replace(/[<>{}[\]\\/|`~^]/g, '').trim();
  if (!cleaned) {
    return DEFAULT_PET_NAME;
  }
  return cleaned.slice(0, MAX_NAME);
}
