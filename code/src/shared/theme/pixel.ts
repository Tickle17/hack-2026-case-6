import type { ThemeContract } from './contract';

/**
 * Пиксельная тема. См. docs/art-style.md.
 *
 * Это НЕ брендбук заказчика — он ещё не получен. Это дизайн-направление:
 * пиксель-арт, настроение Roblox в 2D, ограниченная палитра, объём только
 * нижним уступом.
 *
 * Шрифт — Handjet: пиксельный, с полной кириллицей. Кегли подняты
 * относительно обычных: пиксельный шрифт читается хуже, а у нас
 * семилетний читатель (жёсткое требование art-style.md).
 */

const shared = {
  // Мир пиксельный, а шрифт округлый и читаемый: пиксельные буквы
  // семилетний ребёнок разбирает плохо, особенно «ш/щ/и» и «0/О».
  // См. docs/art-style.md, «Главный риск: читаемость».
  font: { regular: 'NunitoGame-Regular', bold: 'NunitoGame-Bold' },
  text: {
    display: { fontSize: 34, lineHeight: 42, bold: true },
    title: { fontSize: 26, lineHeight: 34, bold: true },
    body: { fontSize: 21, lineHeight: 29, bold: false },
    caption: { fontSize: 17, lineHeight: 23, bold: true },
    button: { fontSize: 21, lineHeight: 27, bold: true },
  },
  // Сетка кратна 4: базовый пиксель ×4 (art-style.md)
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 0, md: 0, lg: 0, xl: 0, pill: 0 },
  touchTarget: { min: 48 },
} as const;

/**
 * Палитра: не больше 16 цветов на экран. Насыщенные, «игрушечные».
 * У каждого объёмного цвета есть парный тёмный — нижняя грань.
 */
export const pixelLight: ThemeContract = {
  kind: 'pixel-baseline',
  scheme: 'light',
  color: {
    bg: '#8FD3E8',
    surface: '#FFF6E0',
    surfaceElevated: '#F0DFC0',
    border: '#3B2A1F',

    text: {
      primary: '#2B1D14',
      secondary: '#6B5443',
      muted: '#9A8272',
      onColor: '#FFF6E0',
    },

    brand: '#4CAF3E',
    brandShadow: '#2F7A26',
    brandSoft: '#CDEBC6',

    red: '#E24B3A',
    redShadow: '#A83226',
    amber: '#F2C63D',
    amberShadow: '#C79A22',
    orange: '#F08A2E',
    orangeShadow: '#C0651A',
    cyan: '#3FA9D8',
    cyanShadow: '#2A7CA4',
    violet: '#8E6BD1',
    violetShadow: '#6748A6',

    coin: '#F2C63D',
    coinShadow: '#C79A22',

    board: {
      surface: '#2F5641',
      frame: '#8A5A2B',
      tray: '#A9713A',
      chalk: '#F5EAD8',
    },
    need: { satiety: '#F08A2E', mood: '#3FA9D8', cleanliness: '#4CAF3E' },
  },
  ...shared,
};

export const pixelDark: ThemeContract = {
  kind: 'pixel-baseline',
  scheme: 'dark',
  color: {
    bg: '#1B2340',
    surface: '#2C2340',
    surfaceElevated: '#3A2E52',
    border: '#0E0A18',

    text: {
      primary: '#F5EAD8',
      secondary: '#B8A490',
      muted: '#7E6E60',
      onColor: '#F5EAD8',
    },

    brand: '#5FC94E',
    brandShadow: '#379130',
    brandSoft: '#2A4A28',

    red: '#F05A48',
    redShadow: '#B03A2C',
    amber: '#FFD65A',
    amberShadow: '#C9A32E',
    orange: '#FF9B3D',
    orangeShadow: '#C46F22',
    cyan: '#54C0EA',
    cyanShadow: '#2F86AC',
    violet: '#A382E8',
    violetShadow: '#6E52B0',

    coin: '#FFD65A',
    coinShadow: '#C9A32E',

    board: {
      surface: '#25422F',
      frame: '#6E4722',
      tray: '#8A5A2B',
      chalk: '#F5EAD8',
    },
    need: { satiety: '#FF9B3D', mood: '#54C0EA', cleanliness: '#5FC94E' },
  },
  ...shared,
};
