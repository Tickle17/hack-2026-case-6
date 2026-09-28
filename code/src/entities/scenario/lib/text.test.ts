import { personalize, PLAYER_SLOT, PET_SLOT } from './text';
import { createInitialState } from './state';
import { INTRO } from '../config/intro';
import { LESSONS } from '../config/lessons';

function names(playerName: string, petName: string) {
  return { ...createInitialState('start'), playerName, petName };
}

describe('обращение по имени', () => {
  it('подставляет имя игрока', () => {
    expect(
      personalize(`С днём рождения, ${PLAYER_SLOT}!`, names('Вася', 'Финни')),
    ).toBe('С днём рождения, Вася!');
  });

  it('подставляет имя питомца', () => {
    expect(personalize(`${PET_SLOT} доволен.`, names('Вася', 'Мурзик'))).toBe(
      'Мурзик доволен.',
    );
  });

  it('подставляет оба имени и сколько угодно раз', () => {
    expect(
      personalize(
        `${PLAYER_SLOT}, ${PET_SLOT} ждёт. Слышишь, ${PLAYER_SLOT}?`,
        names('Аня', 'Рекс'),
      ),
    ).toBe('Аня, Рекс ждёт. Слышишь, Аня?');
  });

  it('текст без подстановок не меняется', () => {
    expect(personalize('Просто текст.', names('Аня', 'Рекс'))).toBe(
      'Просто текст.',
    );
  });

  it('пока имя не введено, обращается нейтрально — а не пустотой', () => {
    // Пустая строка оставила бы «С днём рождения, !».
    expect(personalize(`Привет, ${PLAYER_SLOT}!`, names('', 'Финни'))).toBe(
      'Привет, друг!',
    );
  });
});

describe('страж подстановок', () => {
  /** Все тексты сценария, которые доходят до экрана. */
  function allTexts(): string[] {
    const out: string[] = [];
    for (const node of INTRO.nodes) {
      if (node.type === 'dialogue' || node.type === 'thought') {
        out.push(node.text);
      }
      if (node.type === 'choice') {
        out.push(node.prompt, ...node.options.map(o => o.label));
      }
      if (node.type === 'riddle') {
        out.push(node.prompt, node.onRight, node.onWrong);
      }
      if (node.type === 'taskGate' && node.hint) {
        out.push(node.hint);
      }
    }
    for (const lesson of LESSONS) {
      out.push(
        lesson.rule,
        lesson.explanation,
        lesson.riddle.prompt,
        lesson.riddle.onRight,
        lesson.riddle.onWrong,
      );
    }
    return out;
  }

  it('после подстановки в текстах не остаётся фигурных скобок', () => {
    // Опечатка в имени слота («{имa}» латиницей) прошла бы молча
    // и уехала бы на экран ребёнку как есть.
    const filled = allTexts().map(t => personalize(t, names('Вася', 'Мурзик')));
    expect(filled.filter(t => /[{}]/.test(t))).toEqual([]);
  });
});
