module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {'@': './src'},
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    // Reanimated 4 работает через worklets. Плагин ДОЛЖЕН быть последним.
    'react-native-worklets/plugin',
  ],
};
