/* eslint-env jest */
// Reanimated 4 поднимает нативный worklets-рантайм, которого в jsdom нет.
// Мокаем на уровне модуля: анимации в юнит-тестах не проверяются, проверяется
// то, что дерево рендерится и логика вызывается.
jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  const passthrough = (v) => v;
  const Animated = {View, Text: View, ScrollView: View, createAnimatedComponent: (C) => C};
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (init) => ({value: init}),
    useAnimatedStyle: (fn) => fn(),
    withTiming: passthrough,
    withSpring: passthrough,
    withSequence: (...a) => a[a.length - 1],
    withRepeat: passthrough,
    runOnJS: (fn) => fn,
    // gesture-handler дергает эти хуки внутри GestureDetector
    useEvent: () => () => {},
    useHandler: () => ({context: {}, doDependenciesDiffer: false}),
    useAnimatedRef: () => ({current: null}),
    useAnimatedReaction: () => {},
    setGestureState: () => {},
    isSharedValue: () => false,
    Easing: {inOut: () => () => 0, quad: () => 0},
  };
});

// MMKV работает через нативный nitro-модуль, которого в jsdom нет.
// Подменяем на хранилище в памяти: тесты проверяют логику сохранения
// (persistence.test.ts), а не сам нативный слой.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: () => ({
      getString: key => store.get(key),
      set: (key, value) => store.set(key, value),
      remove: key => store.delete(key),
      clearAll: () => store.clear(),
    }),
  };
});

// safe-area-context читает нативные вставки, которых в jsdom нет.
// Отдаём нули: тесты проверяют логику, а не отступы устройства.
jest.mock('react-native-safe-area-context', () => {
  const inset = {top: 0, right: 0, bottom: 0, left: 0};
  const React = require('react');
  return {
    SafeAreaProvider: ({children}) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({children}) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({x: 0, y: 0, width: 390, height: 844}),
  };
});
