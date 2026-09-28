import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeContract } from './contract';
import { duolingoLight, duolingoDark } from './duolingo';
import { pixelLight, pixelDark } from './pixel';

export type { ThemeContract };
export { duolingoLight, duolingoDark, pixelLight, pixelDark };

const ThemeContext = createContext<ThemeContract>(pixelLight);

export function ThemeProvider({
  theme,
  children,
}: {
  theme?: ThemeContract;
  children: React.ReactNode;
}) {
  const scheme = useColorScheme();
  const resolved = theme ?? (scheme === 'dark' ? pixelDark : pixelLight);
  return (
    <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContract {
  return useContext(ThemeContext);
}
