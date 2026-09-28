/**
 * Проверка игрового имени — общая для ребёнка и для питомца.
 *
 * Живёт в shared, потому что нужна двум разным сущностям: имя игрока
 * хранится в состоянии сценария, имя питомца — в сущности питомца,
 * а импорт вбок между слайсами одного слоя запрещён.
 *
 * Правила отсекают мусор, но не должны отказывать обычным именам:
 * отказ по надуманной причине останавливает игру на первом же экране,
 * а объяснить его семилетнему ребёнку нечем.
 */

export const MIN_NAME_LETTERS = 2;
export const MAX_NAME_LETTERS = 14;

/**
 * Причину не расшифровываем. Ребёнку не нужен разбор, чем именно
 * не понравилось имя, — нужно понятное «попробуй другое».
 */
export const NAME_ERROR = 'Что-то с именем не то, попробуй какое-то другое';

/** Буквы двух алфавитов: имя могут написать и латиницей. */
const LETTER = 'A-Za-zА-Яа-яЁё';

/** Буквы, между ними — по одному дефису или пробелу. Больше ничего. */
const SHAPE = new RegExp(`^[${LETTER}]+(?:[ -][${LETTER}]+)*$`);

/**
 * Корни грубых слов. Сверяются подстрокой, поэтому короткие и частые
 * сочетания сюда не попадают: «еб» отклонило бы Глеба и Себастьяна.
 * Всё, что коротко или встречается внутри имён, — в списке ниже,
 * он сверяется словом целиком.
 */
const RUDE_ROOTS = [
  'хуй',
  'хуе',
  'хуи',
  'нахуй',
  'ахуе',
  'охуе',
  'пизд',
  'ебал',
  'ебат',
  'ебан',
  'ебуч',
  'ебло',
  'выеб',
  'заеб',
  'уеба',
  'бляд',
  'блят',
  'сука',
  'суки',
  'сучк',
  'мудак',
  'муде',
  'муди',
  'гандон',
  'гондон',
  'залуп',
  'дроч',
  'пидор',
  'пидар',
  'педик',
  'шлюх',
  'ублюд',
  'говн',
  'дерьм',
  'какаш',
  'манда',
  'елда',
  'сволоч',
  'скотин',
  'дебил',
  'идиот',
  'тупиц',
  'кретин',
  'придур',
  'засран',
  'обосра',
  'отсос',
  'минет',
  'сперм',
  'писюн',
  'письк',
  'сиськ',
  'жопа',
  'срака',
  'урод',
  // Латиница и транслит.
  'huy',
  'hui',
  'pizd',
  'ebat',
  'blyad',
  'suka',
  'pidor',
  'fuck',
  'shit',
  'bitch',
  'dick',
  'cunt',
  'sex',
  'porn',
];

/**
 * Грубые слова, которые встречаются внутри обычных имён и фамилий,
 * поэтому сверяются целиком: «лох» есть в Лоханкине, «гад» — в Гадире.
 */
const RUDE_WORDS = [
  'лох',
  'чмо',
  'даун',
  'тварь',
  'гад',
  'хер',
  'бля',
  'гей',
  'дурак',
  'дура',
  'козел',
  'осел',
  'свинья',
  'задница',
  'дебилка',
  'ass',
  'gay',
];

/** Ё и регистр не должны быть способом обойти проверку. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е');
}

function isRude(value: string): boolean {
  const flat = normalize(value);
  if (RUDE_ROOTS.some(root => flat.includes(root))) {
    return true;
  }
  // Слово целиком — и каждая часть двойного имени тоже слово.
  return flat.split(/[ -]/).some(word => RUDE_WORDS.includes(word));
}

export type NameCheck =
  | { ok: true; name: string }
  | { ok: false; message: string };

/** Каждое слово с заглавной: ребёнок пишет строчными, а имя — имя. */
function capitalize(value: string): string {
  return value.replace(
    new RegExp(`(^|[ -])([${LETTER}])`, 'g'),
    (_, sep: string, letter: string) => sep + letter.toUpperCase(),
  );
}

export function validateName(raw: string): NameCheck {
  const value = raw.trim().replace(/\s+/g, ' ');
  const fail: NameCheck = { ok: false, message: NAME_ERROR };

  if (!SHAPE.test(value)) {
    return fail;
  }
  // Дефис и пробел — разделители, а не буквы: они не занимают лимит.
  const letters = value.replace(/[ -]/g, '').length;
  if (letters < MIN_NAME_LETTERS || letters > MAX_NAME_LETTERS) {
    return fail;
  }
  if (isRude(value)) {
    return fail;
  }
  return { ok: true, name: capitalize(value) };
}

/**
 * Набор имени на собственной клавиатуре.
 *
 * Правила ввода встроены в сам ввод, а не проверяются после: лишнюю
 * букву, разделитель в начале или два подряд просто нельзя набрать.
 * Ребёнку нечего исправлять — значит, и сообщать не о чем.
 */

const SEPARATORS = [' ', '-'];

function lettersIn(value: string): number {
  return value.replace(/[ -]/g, '').length;
}

export function typeInName(value: string, key: string): string {
  if (SEPARATORS.includes(key)) {
    // Имя не начинается с разделителя, и двух подряд не бывает.
    const last = value.slice(-1);
    if (value === '' || SEPARATORS.includes(last)) {
      return value;
    }
    return value + key;
  }
  if (lettersIn(value) >= MAX_NAME_LETTERS) {
    return value;
  }
  // Заглавная — в начале имени и после разделителя. Тогда «Анна-Мария»
  // получается сама, а не правится потом.
  const startsWord = value === '' || SEPARATORS.includes(value.slice(-1));
  return value + (startsWord ? key.toUpperCase() : key.toLowerCase());
}

export function eraseInName(value: string): string {
  return value.slice(0, -1);
}
