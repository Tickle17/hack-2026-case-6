import type { PixelGrid } from '@/shared/ui/PixelSprite';
import type { PetEmotion } from '../model/types';

/**
 * Спрайты питомцев — сетка 16×16.
 *
 * Требование art-style.md: силуэты должны различаться БЕЗ цвета.
 * Поэтому вид задаётся формой — уши, морда, хвост, — а не окраской:
 * кот остроухий, пёс висоухий, хрюшка круглая с пятачком,
 * обезьянка с большими круглыми ушами по бокам.
 *
 * Символы: B — обводка, C — основной цвет, D — тёмный (низ/уступ),
 * L — светлый блик, E — глаза, M — рот, N — нос/пятачок, '.' — прозрачно.
 */

const BASE_PALETTE = {
  B: '#2B1D14',
  C: '#F08A2E',
  D: '#C0651A',
  L: '#FFC48A',
  E: '#2B1D14',
  M: '#2B1D14',
  N: '#E24B3A',
};

/** Глаза и рот по эмоции. Меняются только две строки — 8-я и 10-я. */
const FACE: Record<PetEmotion, { eyes: string; mouth: string }> = {
  happy: { eyes: 'BCCECCCCCCECCB', mouth: 'BCCCMMMMMMCCCB' },
  celebrating: { eyes: 'BCCECCCCCCECCB', mouth: 'BCCMMMMMMMMCCB' },
  content: { eyes: 'BCCECCCCCCECCB', mouth: 'BCCCCCMMCCCCCB' },
  sad: { eyes: 'BCCECCCCCCECCB', mouth: 'BCCCMCCCCMCCCB' },
  hungry: { eyes: 'BCCECCCCCCECCB', mouth: 'BCCCCMMMMCCCCB' },
  dirty: { eyes: 'BCCDCCCCCCDCCB', mouth: 'BCCCMCCCCMCCCB' },
  sleepy: { eyes: 'BCCMCCCCCCMCCB', mouth: 'BCCCCCMCCCCCCB' },
};

/** Строки 0–6 задают уши и макушку, 11–15 — тело и лапы. */
type Shape = {
  top: string[];
  bottom: string[];
  palette: Record<string, string>;
};

const SHAPES: Record<string, Shape> = {
  // Кот: острые треугольные уши
  cat: {
    top: [
      '..BB......BB....',
      '..BCB....BCB....',
      '..BCCB..BCCB....',
      '...BCCBBCCB.....',
      '....BCCCCB......',
      '...BCCCCCCB.....',
      '..BCCCCCCCCB....',
    ],
    bottom: [
      '..BCCCCCCCCB....',
      '..BCCCCCCCCB....',
      '..BDCCCCCCDB....',
      '...BBDDDDBB.....',
      '....BB..BB......',
    ],
    palette: { ...BASE_PALETTE, C: '#F0A64A', D: '#C97D28', L: '#FFD9A8' },
  },

  // Пёс: длинные висячие уши по бокам
  dog: {
    top: [
      '..............',
      '.BB........BB...',
      'BCCB......BCCB..',
      'BCCB.BBBB.BCCB..',
      'BCCBBCCCCBBCCB..',
      'BCCBCCCCCCBCCB..',
      'BCCCCCCCCCCCCB..',
    ],
    bottom: [
      'BCCCCCCCCCCCCB..',
      '.BCCCCCCCCCCB...',
      '..BDCCCCCCDB....',
      '...BBDDDDBB.....',
      '....BB..BB......',
    ],
    palette: { ...BASE_PALETTE, C: '#C99A6B', D: '#9B7048', L: '#E8C9A5' },
  },

  // Хрюшка: круглая голова, маленькие ушки, пятачок
  pig: {
    top: [
      '...BB....BB.....',
      '..BCCB..BCCB....',
      '..BCCCBBCCCB....',
      '..BCCCCCCCCB....',
      '.BCCCCCCCCCCB...',
      '.BCCCCCCCCCCB...',
      '.BCCCCCCCCCCB...',
    ],
    bottom: [
      '.BCCCNNNNCCCB...',
      '.BCCCNNNNCCCB...',
      '.BCDCCCCCCDCB...',
      '..BBDDDDDDBB....',
      '...BB....BB.....',
    ],
    palette: {
      ...BASE_PALETTE,
      C: '#F2A8C0',
      D: '#C97D97',
      L: '#FFD2E0',
      N: '#E27A9A',
    },
  },

  // Обезьянка: большие круглые уши по бокам головы
  monkey: {
    top: [
      '................',
      '.BB........BB...',
      'BCCB.BBBB.BCCB..',
      'BCCBBCCCCBBCCB..',
      'BCCBCCCCCCBCCB..',
      '.BBBCCCCCCBBB...',
      '..BCCCCCCCCB....',
    ],
    bottom: [
      '..BCLLLLLLCB....',
      '..BCLLLLLLCB....',
      '..BDLLLLLLDB....',
      '...BBDDDDBB.....',
      '....BB..BB......',
    ],
    palette: { ...BASE_PALETTE, C: '#A9825E', D: '#7E5F41', L: '#E4C39B' },
  },
};

/** Ширина сетки: все строки выравниваются под неё. */
const WIDTH = 16;

function pad(row: string): string {
  return row.length >= WIDTH
    ? row.slice(0, WIDTH)
    : row + '.'.repeat(WIDTH - row.length);
}

export function petSprite(speciesId: string, emotion: PetEmotion): PixelGrid {
  const shape = SHAPES[speciesId] ?? SHAPES.cat;
  const face = FACE[emotion];
  const rows = [
    ...shape.top,
    pad(face.eyes),
    pad('BCCCCCCCCCCCCB'),
    pad(face.mouth),
    ...shape.bottom,
  ].map(pad);

  return { rows, palette: shape.palette };
}

export const SPRITE_SPECIES = Object.keys(SHAPES);
