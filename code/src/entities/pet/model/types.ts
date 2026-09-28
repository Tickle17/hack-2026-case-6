/** См. docs/integration-contracts.md, раздел 3. */

export type PetEmotion =
  | 'happy'
  | 'content'
  | 'sad'
  | 'hungry'
  | 'dirty'
  | 'sleepy'
  | 'celebrating';

export type PetSpecies = {
  id: string;
  name: string;
  /** licensed = образ заказчика. Без licenseNote сборка падает. */
  origin: 'original' | 'licensed';
  licenseNote?: string;
  /** companion — растят, mentor — только говорит и подсказывает. */
  role: 'companion' | 'mentor';
  palette: { primary: string; accent: string };
  /** Форма тела — заглушка вместо иллюстраций, пока нет ассетов. */
  shape: 'round' | 'tall' | 'wide';
  customization: { colors: string[] };
};

export type PetStats = {
  satiety: number;
  mood: number;
  cleanliness: number;
};
