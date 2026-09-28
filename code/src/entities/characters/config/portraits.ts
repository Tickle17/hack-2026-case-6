import type { PixelGrid } from '@/shared/ui/PixelSprite';

/**
 * Портреты персонажей 16×16 для диалогов.
 *
 * Различаются причёской и цветом одежды, а не только палитрой: силуэт
 * должен читаться (требование art-style.md).
 *
 * Символы: x — обводка, h — волосы, H — тень волос, s — кожа,
 * e — глаза, m — рот, c — одежда, C — тень одежды, '.' — прозрачно.
 */

type Look = {
  hair: string;
  hairShade: string;
  skin: string;
  cloth: string;
  clothShade: string;
  rows: string[];
};

const BASE = [
  '....xxxxxx....',
  '...xhhhhhhx...',
  '..xhhhhhhhhx..',
  '.xhhhhhhhhhhx.',
  '.xhssssssssHx.',
  '.xsssssssssssx',
  '.xseesssseesx.',
  '.xsssssssssssx',
  '.xssssmmssssx.',
  '..xssssssssx..',
  '...xssssssx...',
  '....xccccx....',
  '..xxcccccccxx.',
  '.xcccccccccccx',
  'xcccccccccccccx',
  'xCCCCCCCCCCCCCx',
];

/** Длинные волосы — прядки по бокам лица. */
const LONG_HAIR = [
  '....xxxxxx....',
  '...xhhhhhhx...',
  '..xhhhhhhhhx..',
  '.xhhhhhhhhhhx.',
  'xhhssssssssHhx',
  'xhsssssssssshx',
  'xhseesssseeshx',
  'xhsssssssssshx',
  'xhssssmmsssshx',
  '.xssssssssssx.',
  '...xssssssx...',
  '....xccccx....',
  '..xxcccccccxx.',
  '.xcccccccccccx',
  'xcccccccccccccx',
  'xCCCCCCCCCCCCCx',
];

/** Маленький герой — крупнее голова, короче туловище. */
const CHILD = [
  '...xxxxxxxx...',
  '..xhhhhhhhhx..',
  '.xhhhhhhhhhhx.',
  '.xhssssssssHx.',
  '.xsssssssssssx',
  '.xseesssseesx.',
  '.xsssssssssssx',
  '.xsssssssssssx',
  '.xssssmmssssx.',
  '..xssssssssx..',
  '...xssssssx...',
  '....xccccx....',
  '...xcccccccx..',
  '..xcccccccccx.',
  '..xcccccccccx.',
  '..xCCCCCCCCCx.',
];

const LOOKS: Record<string, Look> = {
  mother: {
    hair: '#8B4513',
    hairShade: '#6B3410',
    skin: '#F2C6A0',
    cloth: '#E24B3A',
    clothShade: '#A83226',
    rows: LONG_HAIR,
  },
  father: {
    hair: '#3B2A1F',
    hairShade: '#241A12',
    skin: '#EBB98F',
    cloth: '#3FA9D8',
    clothShade: '#2A7CA4',
    rows: BASE,
  },
  teacher: {
    hair: '#5A5A5A',
    hairShade: '#3D3D3D',
    skin: '#F2C6A0',
    cloth: '#8E6BD1',
    clothShade: '#6748A6',
    rows: LONG_HAIR,
  },
  hero: {
    hair: '#C97D28',
    hairShade: '#9A5C18',
    skin: '#F7D2AE',
    cloth: '#4CAF3E',
    clothShade: '#2F7A26',
    rows: CHILD,
  },
};

export function portrait(speaker: string): PixelGrid | null {
  const look = LOOKS[speaker];
  if (!look) {
    return null;
  }
  return {
    rows: look.rows,
    palette: {
      x: '#2B1D14',
      h: look.hair,
      H: look.hairShade,
      s: look.skin,
      e: '#2B1D14',
      m: '#B5503F',
      c: look.cloth,
      C: look.clothShade,
    },
  };
}

export const PORTRAIT_SPEAKERS = Object.keys(LOOKS);
