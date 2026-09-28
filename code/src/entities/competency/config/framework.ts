/**
 * Единая рамка компетенций по финансовой грамотности.
 *
 * Источник структуры: официальный методический материал Стратегии
 * повышения финансовой грамотности в РФ (Рамка-2021), раздел 6 ТЗ
 * называет её обязательным ориентиром.
 *
 * Рамка устроена так:
 *   4 предметные области → содержательные темы → образовательные
 *   результаты трёх видов, на двух уровнях (базовый и продвинутый).
 *
 * Здесь заведены ТОЛЬКО те темы и результаты, которых касается наша
 * игра. Полная рамка шире — выписывать её целиком незачем, а
 * притворяться, что игра покрывает всё, тем более.
 *
 * Уровень у нас везде базовый: целевая аудитория 7–11 лет.
 */

/** Предметные области рамки — нумерация официальная. */
export type AreaId = 'money' | 'planning' | 'risk' | 'environment';

export type Area = {
  id: AreaId;
  /** Номер области в рамке. */
  no: number;
  title: string;
};

export const AREAS: Area[] = [
  { id: 'money', no: 1, title: 'Деньги и операции с ними' },
  { id: 'planning', no: 2, title: 'Планирование и управление финансами' },
  { id: 'risk', no: 3, title: 'Риск и доходность' },
  { id: 'environment', no: 4, title: 'Финансовая среда' },
];

/** Вид образовательного результата — по рамке их три. */
export type ResultKind = 'knowledge' | 'skill' | 'attitude';

export const RESULT_KINDS: Record<ResultKind, string> = {
  knowledge: 'Осведомлённость, знания и понимание',
  skill: 'Умения, навыки и поведение',
  attitude: 'Личные характеристики и установки',
};

export type Competency = {
  /** Идентификатор вида «область.тема.вид» — на него ссылается контент. */
  id: string;
  area: AreaId;
  /** Содержательная тема внутри области. */
  topic: string;
  kind: ResultKind;
  /** Образовательный результат, сформулированный под возраст 7–11. */
  outcome: string;
};

export const COMPETENCIES: Competency[] = [
  {
    id: 'planning.budget.skill',
    area: 'planning',
    topic: 'Доходы и расходы личного бюджета',
    kind: 'skill',
    outcome:
      'Распределяет доступную сумму по направлениям расходов до того, как начать тратить.',
  },
  {
    id: 'planning.budget.knowledge',
    area: 'planning',
    topic: 'Доходы и расходы личного бюджета',
    kind: 'knowledge',
    outcome:
      'Различает обязательные и необязательные расходы и объясняет разницу.',
  },
  {
    id: 'planning.budget.attitude',
    area: 'planning',
    topic: 'Доходы и расходы личного бюджета',
    kind: 'attitude',
    outcome:
      'Считает нормальным сначала обеспечить необходимое, а потом желаемое.',
  },
  {
    id: 'planning.savings.skill',
    area: 'planning',
    topic: 'Личные сбережения',
    kind: 'skill',
    outcome:
      'Регулярно откладывает часть дохода и следит за приближением к цели.',
  },
  {
    id: 'planning.savings.knowledge',
    area: 'planning',
    topic: 'Личные сбережения',
    kind: 'knowledge',
    outcome:
      'Понимает, что на крупную покупку копят постепенно, и умеет оценить срок.',
  },
  {
    id: 'money.prices.skill',
    area: 'money',
    topic: 'Цены на товары и услуги',
    kind: 'skill',
    outcome: 'Сравнивает цены и выбирает подходящий вариант осознанно.',
  },
  {
    id: 'planning.review.skill',
    area: 'planning',
    topic: 'Доходы и расходы личного бюджета',
    kind: 'skill',
    outcome:
      'Сопоставляет запланированные траты с фактическими и делает вывод.',
  },
];

export function competencyById(id: string): Competency | undefined {
  return COMPETENCIES.find(c => c.id === id);
}

export function areaOf(id: string): Area | undefined {
  const c = competencyById(id);
  return c ? AREAS.find(a => a.id === c.area) : undefined;
}
