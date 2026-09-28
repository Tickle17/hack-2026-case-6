/**
 * Отметки о разовых событиях дня.
 *
 * Живут в общих флагах состояния, а не в отдельных полях: перезапуск
 * приложения не должен ни выдавать премию второй раз, ни показывать
 * заставку ночи заново, а заводить поле под каждое такое событие —
 * менять схему сохранения на каждую мелочь.
 */

/**
 * Награда за задание дня уже выдана.
 *
 * Отметка на КАЖДОЕ задание отдельно: общая съедала бы вторую награду,
 * если оба выполнены.
 */
export function challengeFlag(day: number, id: string): string {
  return `challenge.${id}.day${day}`;
}

/** Заставку наступившего дня уже показали. */
export function morningFlag(day: number): string {
  return `morning.day${day}`;
}

/** Ребёнок в итоге дня решил начать этот день с нужного. */
export function needsFirstFlag(day: number): string {
  return `needs-first.day${day}`;
}

/** Напоминание урока дня уже показали. */
export function reminderFlag(day: number): string {
  return `reminder.day${day}`;
}
