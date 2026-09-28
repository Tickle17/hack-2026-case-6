import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { StatePort } from '@/entities/scenario';

/**
 * Хранилище на MMKV — синхронное, поэтому состояние можно прочитать
 * прямо при создании экрана, без промежуточного экрана загрузки.
 *
 * Оборачиваем в порт: логика сохранения не знает, чем именно пишут,
 * и тестируется без нативного модуля.
 */

const KEY = 'game.state.v1';

let store: MMKV | null = null;

function mmkv(): MMKV | null {
  if (store) {
    return store;
  }
  try {
    // v4: фабрика вместо конструктора.
    store = createMMKV({ id: 'finpet' });
    return store;
  } catch {
    // На эмуляторе без нативного модуля игра должна работать,
    // просто без сохранения.
    return null;
  }
}

function portFor(key: string): StatePort {
  return {
    read: () => mmkv()?.getString(key) ?? null,
    write: value => mmkv()?.set(key, value),
    clear: () => {
      mmkv()?.remove(key);
    },
  };
}

/** Профиль ребёнка. */
export const gameStorage: StatePort = portFor(KEY);

/**
 * Тестовый профиль демо-режима (ТЗ 2.5.13): отдельный ключ, поэтому
 * проверка не трогает прогресс ребёнка и каждый раз начинается с нуля.
 */
export const demoStorage: StatePort = portFor('game.demo.v1');
