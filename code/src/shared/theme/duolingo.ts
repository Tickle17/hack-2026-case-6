import type { ThemeContract } from './contract';

/**
 * Базовая тема в стиле Duolingo.
 *
 * Это НЕ брендбук заказчика — он ещё не получен (см. docs/brandbook.md).
 * Это осознанное дизайн-направление: детская обучающая игра, плоская
 * перспектива, объём только нижним уступом, круглый жирный шрифт.
 *
 * Когда придёт брендбук — рядом появится brand.ts по тому же контракту.
 * Переключение стоит одной строки в ThemeProvider.
 *
 * Правило уступов: shadow = базовый цвет, затемнённый на 12–15%.
 */

const shared = {
  font: { regular: 'NunitoGame-Regular', bold: 'NunitoGame-Bold' },
  text: {
    display: { fontSize: 26, lineHeight: 32, bold: true },
    title: { fontSize: 19, lineHeight: 25, bold: true },
    body: { fontSize: 16, lineHeight: 22, bold: false },
    caption: { fontSize: 13, lineHeight: 18, bold: true },
    button: { fontSize: 16, lineHeight: 21, bold: true },
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  radius: { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 },
  /**
   * 48 dp — требование ТЗ 3.6, а не 44 из рекомендаций Apple:
   * приложение делается под Android, и у ребёнка палец крупнее
   * относительно экрана, чем у взрослого.
   */
  touchTarget: { min: 48 },
} as const;

export const duolingoLight: ThemeContract = {
  kind: 'duolingo-baseline',
  scheme: 'light',
  color: {
    bg: '#F4F5FA',
    surface: '#FFFFFF',
    surfaceElevated: '#EEF0F6',
    border: '#E5E5E5',
    text: {
      primary: '#3C3C3C',
      secondary: '#5C6173',
      muted: '#9097A6',
      onColor: '#FFFFFF',
    },
    brand: '#58CC02',
    brandShadow: '#58A700',
    brandSoft: 'rgba(88,204,2,0.14)',
    red: '#FF4B4B',
    redShadow: '#E63F3F',
    amber: '#FFC800',
    amberShadow: '#E0A800',
    orange: '#FF9600',
    orangeShadow: '#E07E00',
    cyan: '#1CB0F6',
    cyanShadow: '#1899D6',
    violet: '#7C6CE0',
    violetShadow: '#6354C0',
    coin: '#FFC800',
    coinShadow: '#E0A800',
    board: {
      surface: '#2F5641',
      frame: '#8A5A2B',
      tray: '#A9713A',
      chalk: '#FFFFFF',
    },
    need: { satiety: '#FF9600', mood: '#1CB0F6', cleanliness: '#58CC02' },
  },
  ...shared,
};

export const duolingoDark: ThemeContract = {
  kind: 'duolingo-baseline',
  scheme: 'dark',
  color: {
    bg: '#0B0C10',
    surface: '#16181F',
    surfaceElevated: '#1F222B',
    border: 'rgba(255,255,255,0.08)',
    text: {
      primary: '#FFFFFF',
      secondary: '#9BA0AE',
      muted: '#6A6E7B',
      onColor: '#FFFFFF',
    },
    brand: '#58CC02',
    brandShadow: '#46A302',
    brandSoft: 'rgba(88,204,2,0.18)',
    red: '#FF453A',
    redShadow: '#D63A30',
    amber: '#FFD60A',
    amberShadow: '#D9B400',
    orange: '#FF9F0A',
    orangeShadow: '#D98600',
    cyan: '#2BD9F1',
    cyanShadow: '#1899D6',
    violet: '#A78BFA',
    violetShadow: '#8B6CE0',
    coin: '#FFD60A',
    coinShadow: '#D9B400',
    board: {
      surface: '#25422F',
      frame: '#6E4722',
      tray: '#8A5A2B',
      chalk: '#FFFFFF',
    },
    need: { satiety: '#FF9F0A', mood: '#2BD9F1', cleanliness: '#58CC02' },
  },
  ...shared,
};
