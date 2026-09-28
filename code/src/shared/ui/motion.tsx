import React, { createContext, useContext } from 'react';

/**
 * Глобальный переключатель анимаций (UC-11, ТЗ 3.6).
 *
 * Контекст, а не проп через десять уровней: анимации разбросаны по
 * спрайтам, параллаксу и мини-играм, и протаскивать флаг вручную
 * значило бы однажды его где-то забыть.
 *
 * «Меньше движения» — не «совсем без движения». Отключается
 * ДЕКОРАТИВНОЕ движение: перелистывание кадров, фоновый параллакс.
 * То, без чего игра перестаёт работать (бег в раннере), остаётся,
 * иначе настройка доступности сделала бы игру непроходимой.
 */

const MotionContext = createContext(false);

export function MotionProvider({
  reduced,
  children,
}: {
  reduced: boolean;
  children: React.ReactNode;
}) {
  return (
    <MotionContext.Provider value={reduced}>{children}</MotionContext.Provider>
  );
}

export function useReducedMotion(): boolean {
  return useContext(MotionContext);
}
