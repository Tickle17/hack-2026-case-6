import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/shared/theme';
import { GameScreen } from '@/pages/game/GameScreen';
import { HomeScreen } from '@/pages/home/HomeScreen';
import { demoStorage, gameStorage } from '@/shared/lib/storage';

type Screen = 'home' | 'game' | 'demo';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Приложение рисуется под системными панелями (edge-to-edge),
          поэтому вставки нужны всем экранам — см. shared/ui/ScreenOverlay. */}
      <SafeAreaProvider>
        <ThemeProvider>
          {screen === 'home' ? (
            <HomeScreen
              hasSave={gameStorage.read() !== null}
              onStart={() => setScreen('game')}
              onDemo={() => {
                // Демо всегда начинается с чистого тестового профиля (ТЗ 2.5.13).
                demoStorage.clear();
                setScreen('demo');
              }}
            />
          ) : (
            <GameScreen
              key={screen}
              storage={screen === 'demo' ? demoStorage : gameStorage}
              demo={screen === 'demo'}
              onExit={() => setScreen('home')}
            />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
