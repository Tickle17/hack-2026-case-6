/**
 * @format
 */

import React from 'react';
import { AppRegistry, Text } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Шрифт по умолчанию для текста, который рисуется мимо нашего компонента.
// Подмешиваем ПОД переданные стили, чтобы явно заданное семейство побеждало.
const TextAny = Text;
if (TextAny.render) {
  const originalRender = TextAny.render;
  TextAny.render = function patchedTextRender(...args) {
    const origin = originalRender.apply(this, args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: 'NunitoGame-Regular' }, origin.props.style],
    });
  };
}

AppRegistry.registerComponent(appName, () => App);
