import { coinsWord } from './plural';

/**
 * Надпись на кнопке читает ребёнок. «Отложить 2 монет» он прочтёт
 * как ошибку игры, а не как свою.
 */
describe('склонение слова «монета»', () => {
  it('одна — монета', () => {
    expect(coinsWord(1)).toBe('монета');
    expect(coinsWord(21)).toBe('монета');
    expect(coinsWord(101)).toBe('монета');
  });

  it('две, три, четыре — монеты', () => {
    expect(coinsWord(2)).toBe('монеты');
    expect(coinsWord(3)).toBe('монеты');
    expect(coinsWord(4)).toBe('монеты');
    expect(coinsWord(22)).toBe('монеты');
  });

  it('пять и больше — монет', () => {
    expect(coinsWord(0)).toBe('монет');
    expect(coinsWord(5)).toBe('монет');
    expect(coinsWord(10)).toBe('монет');
    expect(coinsWord(25)).toBe('монет');
  });

  it('одиннадцать — четырнадцать всегда монет', () => {
    // Ловушка русского счёта: 11 похоже на 1, но склоняется иначе.
    expect(coinsWord(11)).toBe('монет');
    expect(coinsWord(12)).toBe('монет');
    expect(coinsWord(13)).toBe('монет');
    expect(coinsWord(14)).toBe('монет');
    expect(coinsWord(111)).toBe('монет');
  });
});
