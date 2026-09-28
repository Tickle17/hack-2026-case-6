import { FLOOR, OBSTACLES, type NormRect } from '../config/room';

/**
 * Проходимость в долях от размера комнаты (0..1).
 *
 * Работаем в нормализованных координатах, а не в пикселях: карта тогда
 * не зависит ни от разрешения картинки, ни от размера экрана.
 */

export type Point = { x: number; y: number };

function overlaps(a: NormRect, b: NormRect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/**
 * Питомец занимает место — проверяем прямоугольник, а не точку,
 * иначе он въезжает в мебель боком.
 *
 * Ноги питомца внизу спрайта, поэтому по вертикали учитываем только
 * нижнюю треть: голова может «заходить» на мебель, стоящую выше.
 */
export function isWalkable(
  pos: Point,
  size: { w: number; h: number },
  extra: readonly NormRect[] = [],
): boolean {
  const feet: NormRect = {
    x: pos.x,
    y: pos.y + size.h * 0.66,
    w: size.w,
    h: size.h * 0.34,
  };

  const insideFloor =
    feet.x >= FLOOR.x &&
    feet.x + feet.w <= FLOOR.x + FLOOR.w &&
    feet.y >= FLOOR.y &&
    feet.y + feet.h <= FLOOR.y + FLOOR.h;

  if (!insideFloor) {
    return false;
  }
  // Накопленные вещи приходят отдельным списком: мебель комнаты
  // постоянна, а домик появляется только когда на него накопили.
  return ![...OBSTACLES, ...extra].some(o => overlaps(feet, o));
}

/** Случайная достижимая точка, заметно отличная от текущей. */
export function pickTarget(
  from: Point,
  size: { w: number; h: number },
  random: () => number = Math.random,
  extra: readonly NormRect[] = [],
): Point {
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = FLOOR.x + random() * (FLOOR.w - size.w);
    const y = FLOOR.y + random() * (FLOOR.h - size.h);
    const candidate = { x, y };
    if (!isWalkable(candidate, size, extra)) {
      continue;
    }
    if (Math.abs(x - from.x) + Math.abs(y - from.y) < 0.12) {
      continue;
    }
    return candidate;
  }
  return from;
}
