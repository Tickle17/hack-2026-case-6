import { GLOSSARY } from '../config/glossary';

/**
 * Словарь терминов (UC-10, ТЗ 2.5.11).
 *
 * Проверяем не наличие текста, а его пригодность: определения читает
 * ребёнок 7–11 лет без взрослого рядом.
 */

/** Слова, которые сами требуют объяснения. */
const JARGON = [
  'ликвидн',
  'актив',
  'инвестиц',
  'депозит',
  'капитал',
  'дефицит',
  'профицит',
  'транзакц',
  'номинал',
  'эмисс',
];

describe('словарь', () => {
  it('покрывает все понятия, которыми игра пользуется', () => {
    const ids = GLOSSARY.map(t => t.id);
    ['budget', 'plan', 'needs', 'wants', 'savings', 'goal'].forEach(need => {
      expect(ids).toContain(need);
    });
  });

  it('у каждого термина есть значение и пример', () => {
    GLOSSARY.forEach(t => {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.meaning.length).toBeGreaterThan(0);
      expect(t.example.length).toBeGreaterThan(0);
    });
  });

  it('определение — одно короткое предложение', () => {
    GLOSSARY.forEach(t => {
      // Длинное определение ребёнок не дочитает.
      expect(t.meaning.length).toBeLessThanOrEqual(90);
      // Одна точка в конце и ни одной внутри.
      expect(t.meaning.split('.').filter(Boolean).length).toBe(1);
    });
  });

  it('в определениях нет слов, которые сами надо объяснять', () => {
    GLOSSARY.forEach(t => {
      const text = `${t.meaning} ${t.example}`.toLowerCase();
      JARGON.forEach(word => {
        expect(text).not.toContain(word);
      });
    });
  });

  it('идентификаторы уникальны — иначе термин потеряется', () => {
    const ids = GLOSSARY.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
