module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.after-env.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // gesture-handler и reanimated поставляются как ESM — их нужно прогнать
  // через babel, иначе jest падает на import.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?(' +
      '@react-native|react-native|react-native-gesture-handler|' +
      'react-native-reanimated|react-native-worklets|react-native-mmkv|react-native-nitro-modules' +
      ')/)',
  ],
};
