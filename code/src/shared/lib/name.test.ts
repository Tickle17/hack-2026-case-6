import {
  validateName,
  typeInName,
  eraseInName,
  NAME_ERROR,
  MAX_NAME_LETTERS,
  MIN_NAME_LETTERS,
} from './name';

/**
 * Имя вводит ребёнок 7–11 лет. Правила проверки должны отсекать мусор,
 * но не отказывать обычным именам — отказ по надуманной причине
 * останавливает игру на первом же экране.
 */
describe('проверка имени', () => {
  it('принимает обычное имя', () => {
    expect(validateName('Вася')).toEqual({ ok: true, name: 'Вася' });
  });

  it('первая буква становится заглавной', () => {
    expect(validateName('вася')).toEqual({ ok: true, name: 'Вася' });
  });

  it('обрезает пробелы по краям', () => {
    expect(validateName('  Маша  ')).toEqual({ ok: true, name: 'Маша' });
  });

  it('принимает двойное имя через дефис и через пробел', () => {
    expect(validateName('Анна-Мария').ok).toBe(true);
    expect(validateName('Иван Царевич').ok).toBe(true);
  });

  it('принимает латиницу', () => {
    expect(validateName('Tom')).toEqual({ ok: true, name: 'Tom' });
  });

  it('не принимает одну букву', () => {
    expect(validateName('В')).toEqual({ ok: false, message: NAME_ERROR });
  });

  it('не принимает пустое поле', () => {
    expect(validateName('').ok).toBe(false);
    expect(validateName('   ').ok).toBe(false);
  });

  it('не принимает больше четырнадцати букв', () => {
    expect(validateName('а'.repeat(MAX_NAME_LETTERS)).ok).toBe(true);
    expect(validateName('а'.repeat(MAX_NAME_LETTERS + 1)).ok).toBe(false);
  });

  it('разделители не съедают лимит букв', () => {
    // Четырнадцать букв плюс дефис — букв ровно столько, сколько можно.
    expect(validateName('Анна-Марианна').ok).toBe(true);
  });

  it('не принимает цифры и знаки', () => {
    expect(validateName('Вася1').ok).toBe(false);
    expect(validateName('Вася!').ok).toBe(false);
    expect(validateName('<Вася>').ok).toBe(false);
    expect(validateName('😀😀').ok).toBe(false);
  });

  it('не принимает дефис или пробел с краю и подряд', () => {
    expect(validateName('-Вася').ok).toBe(false);
    expect(validateName('Вася-').ok).toBe(false);
    expect(validateName('Ан--на').ok).toBe(false);
  });

  it('не принимает грубые слова', () => {
    expect(validateName('Дебил').ok).toBe(false);
    expect(validateName('дурак').ok).toBe(false);
  });

  it('грубое слово не проходит через регистр и Ё', () => {
    expect(validateName('КОЗЁЛ').ok).toBe(false);
    expect(validateName('Козел').ok).toBe(false);
  });

  it('обычные имена с опасными буквосочетаниями проходят', () => {
    // Короткие корни ловят «Глеба» и «Себастьяна», если сверять подстрокой.
    for (const name of ['Глеб', 'Себастьян', 'Всеволод', 'Лука', 'Герман']) {
      expect(validateName(name)).toEqual({ ok: true, name });
    }
  });

  it('сообщение об ошибке одно на все случаи — ребёнку не нужен разбор', () => {
    expect(validateName('1')).toEqual({ ok: false, message: NAME_ERROR });
    expect(validateName('дурак')).toEqual({ ok: false, message: NAME_ERROR });
    expect(MIN_NAME_LETTERS).toBe(2);
  });
});

describe('набор имени на своей клавиатуре', () => {
  it('первая буква слова встаёт заглавной', () => {
    expect(typeInName('', 'в')).toBe('В');
    expect(typeInName('В', 'а')).toBe('Ва');
  });

  it('после пробела и дефиса снова заглавная', () => {
    expect(typeInName('Анна-', 'м')).toBe('Анна-М');
    expect(typeInName('Иван ', 'ц')).toBe('Иван Ц');
  });

  it('не начинает имя с разделителя', () => {
    expect(typeInName('', ' ')).toBe('');
    expect(typeInName('', '-')).toBe('');
  });

  it('не ставит два разделителя подряд', () => {
    expect(typeInName('Анна-', '-')).toBe('Анна-');
    expect(typeInName('Анна ', '-')).toBe('Анна ');
  });

  it('больше предела букв не набирается', () => {
    const full = 'а'.repeat(MAX_NAME_LETTERS);
    expect(typeInName(full, 'б')).toBe(full);
  });

  it('разделители не считаются за буквы в пределе', () => {
    // Тринадцать букв и дефис — четырнадцатая буква ещё влезает.
    const almost = 'Анна-Мариан';
    expect(typeInName(almost, 'н')).toBe('Анна-Мариан' + 'н');
  });

  it('стирание убирает по одному знаку', () => {
    expect(eraseInName('Вася')).toBe('Вас');
    expect(eraseInName('В')).toBe('');
    expect(eraseInName('')).toBe('');
  });
});
