import type { PetSpecies } from '../model/types';

/**
 * Реестр видов питомцев — единственное место, где перечислены животные.
 *
 * Идентификаторы совпадают с именами спрайтов и со списком в реестре
 * сценария; расхождение ловится тестом-стражем в species.test.ts.
 *
 * Все виды оригинальные. Разрешат фирменного персонажа — добавляется
 * запись с origin: 'licensed' и заполненным licenseNote, компоненты
 * не меняются (docs/mascot.md, docs/integration-contracts.md).
 */
export const SPECIES: PetSpecies[] = [
  {
    id: 'cat',
    name: 'Котёнок',
    origin: 'original',
    role: 'companion',
    palette: { primary: '#F0A64A', accent: '#FFD9A8' },
    shape: 'round',
    customization: { colors: [] },
  },
  {
    id: 'dog',
    name: 'Щенок',
    origin: 'original',
    role: 'companion',
    palette: { primary: '#C99A6B', accent: '#E8C9A5' },
    shape: 'wide',
    customization: { colors: [] },
  },
  {
    id: 'pig',
    name: 'Хрюшка',
    origin: 'original',
    role: 'companion',
    palette: { primary: '#F2A8C0', accent: '#FFD2E0' },
    shape: 'round',
    customization: { colors: [] },
  },
  {
    id: 'monkey',
    name: 'Обезьянка',
    origin: 'original',
    role: 'companion',
    palette: { primary: '#A9825E', accent: '#E4C39B' },
    shape: 'tall',
    customization: { colors: [] },
  },
];

export function getSpecies(id: string): PetSpecies {
  const found = SPECIES.find(s => s.id === id);
  if (!found) {
    throw new Error(`Неизвестный вид питомца: ${id}`);
  }
  return found;
}

export const SPECIES_IDS = SPECIES.map(s => s.id);
