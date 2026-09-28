import {
  GENERATED_ANIMATIONS,
  GENERATED_BOWLS,
  type GeneratedAnimation,
} from './animations.generated';

/**
 * Анимации питомцев.
 *
 * Кадры и размеры генерируются из спрайт-листов
 * (tools/assets/prepare_pets.py). Здесь только смысловая часть: темп
 * и правила подмены, если у вида нужной анимации нет.
 */

export type PetAnimation =
  | 'idle'
  | 'walk'
  | 'happy'
  | 'eat'
  | 'play'
  /** Тот же ход, но питомец в грязи после прогулки. */
  | 'dirty'
  /**
   * Купание: шесть состояний по числу шагов — грязный, мокрый,
   * в пене, смытый, вытертый, причёсанный. Это не движение,
   * а стадии: кадр выбирается по номеру сделанного шага.
   */
  | 'bath'
  /**
   * Позы у накопленных вещей: спит на лежанке, играет с мячом,
   * сидит в домике. Появляются только после того, как ребёнок
   * на эту вещь накопил.
   */
  | 'sleep'
  | 'ball'
  | 'house';

/**
 * Темп кадра. Сидящий питомец моргает медленно, идущий перебирает лапами
 * быстро — иначе движение выглядит «плывущим».
 */
/**
 * Темп кадров покоя разный для каждого кадра.
 *
 * Кадры идут «глаза открыты → прищур → зажмурился → открыты».
 * При равной длительности питомец проводит с закрытыми глазами
 * половину времени — это выглядит не как моргание, а как тик.
 *
 * Настоящее моргание короткое и редкое: глаза закрыты около десятой
 * доли секунды, открыты — несколько секунд.
 */
const IDLE_FRAME_MS = [3200, 90, 110, 260];

const FRAME_MS: Record<PetAnimation, number | number[]> = {
  idle: IDLE_FRAME_MS,
  walk: 150,
  // Грязный лист — это ход, поэтому темп тот же, что у walk.
  dirty: 150,
  // Кадры купания перебором не идут: их выбирает ход мини-игры.
  bath: 0,
  happy: 170,
  eat: 260,
  play: 200,
  // Сон — самое медленное, что есть: это дыхание, а не движение.
  sleep: 900,
  ball: 160,
  // В домике питомец больше выглядывает, чем шевелится.
  house: 600,
};

/**
 * Чем заменить отсутствующую анимацию. У кота нет «play» — вместо неё
 * радость. Порядок важен: сначала близкое по смыслу, потом нейтральное.
 */
const SUBSTITUTES: Record<PetAnimation, PetAnimation[]> = {
  idle: ['idle', 'walk'],
  walk: ['walk', 'idle'],
  dirty: ['dirty', 'walk', 'idle'],
  bath: ['bath', 'idle'],
  happy: ['happy', 'play', 'idle'],
  eat: ['eat', 'happy', 'idle'],
  play: ['play', 'happy', 'idle'],
  // Пока своих листов нет, поза заменяется ближайшей по смыслу:
  // вещь в комнате уже стоит и работает, а рисунок подъедет.
  sleep: ['sleep', 'idle'],
  ball: ['ball', 'play', 'happy', 'idle'],
  house: ['house', 'idle'],
};

export type AnimationSpec = GeneratedAnimation & {
  frameMs: number | number[];
  /** Соотношение сторон кадра — чтобы не растягивать спрайт. */
  aspect: number;
};

/**
 * Отбрасывает суффикс окраса: «cat--black» → «cat».
 *
 * Виджеты получают ключ вместе с окрасом и передают его как есть.
 * Всё, что от окраса не зависит (миски, наличие своей анимации),
 * приводится к базовому виду здесь, а не у каждого вызывающего.
 */
export function baseSpecies(speciesId: string): string {
  const cut = speciesId.indexOf('--');
  return cut === -1 ? speciesId : speciesId.slice(0, cut);
}

/** Суффикс взрослого набора: «cat-adult», «cat-adult--black». */
export const ADULT_SUFFIX = '-adult';

/** Обычный вид из взрослого ключа: «cat-adult--black» → «cat--black». */
export function youngSpecies(speciesId: string): string {
  return speciesId.replace(ADULT_SUFFIX, '');
}

/**
 * Из какого набора брать позу.
 *
 * Взрослый набор бывает неполным: сначала рисуют основные позы,
 * остальные потом. Недостающую берём из обычного набора ТОЙ ЖЕ позой,
 * а не заменой на покой — купание без кадров купания читалось бы как
 * поломка. Отдельной функцией, чтобы проверять на подставном реестре:
 * взрослых картинок пока нет.
 */
export function animationSetKey(
  registry: Record<string, Record<string, unknown>>,
  speciesId: string,
  animation: string,
): string {
  const own = registry[speciesId] ? speciesId : baseSpecies(speciesId);
  if (registry[own]?.[animation] || !own.includes(ADULT_SUFFIX)) {
    return own;
  }
  const young = youngSpecies(speciesId);
  return registry[young] ? young : baseSpecies(young);
}

export function petAnimation(
  speciesId: string,
  animation: PetAnimation,
): AnimationSpec | null {
  // Если окраса нет в реестре, показываем родной — питомец не исчезнет.
  const set =
    GENERATED_ANIMATIONS[
      animationSetKey(
        GENERATED_ANIMATIONS as Record<string, Record<string, unknown>>,
        speciesId,
        animation,
      )
    ];
  if (!set) {
    return null;
  }
  for (const candidate of SUBSTITUTES[animation]) {
    const found = set[candidate];
    if (found) {
      return {
        ...found,
        frameMs: FRAME_MS[candidate],
        aspect: found.width / found.height,
      };
    }
  }
  return null;
}

/**
 * Миска вида — вырезана из его же кадра еды. Ставится на пол при
 * кормлении, а когда питомец подходит, убирается: в анимации еды
 * миска уже нарисована, и двух быть не должно.
 */
export function petBowl(speciesId: string) {
  // Миска от окраса не зависит — она вырезана из кадра еды базового вида.
  // У взрослого набора своей миски может не быть — берём обычную.
  return (
    GENERATED_BOWLS[baseSpecies(speciesId)] ??
    GENERATED_BOWLS[baseSpecies(youngSpecies(speciesId))] ??
    null
  );
}

export function hasAnimations(speciesId: string): boolean {
  return Boolean(GENERATED_ANIMATIONS[baseSpecies(speciesId)]);
}

/** Есть ли у вида собственная анимация игры — пёс катается на спине. */
export function hasOwnAnimation(
  speciesId: string,
  animation: PetAnimation,
): boolean {
  return Boolean(GENERATED_ANIMATIONS[baseSpecies(speciesId)]?.[animation]);
}
