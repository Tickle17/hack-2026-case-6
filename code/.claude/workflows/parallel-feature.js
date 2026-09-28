export const meta = {
  name: 'parallel-feature',
  description: 'Реализовать несколько независимых фич параллельно в отдельных worktree с адверсариальным ревью каждой',
  whenToUse:
    'Когда есть 2+ независимых куска работы (UI / экономика / контент), которые не трогают одни и те же файлы. Передавай список фич через args.',
  phases: [
    { title: 'Plan', detail: 'разложить каждую фичу на шаги и проверить независимость' },
    { title: 'Build', detail: 'по одному агенту на фичу, каждый в своём worktree' },
    { title: 'Review', detail: 'четыре независимых ревьюера на фичу: корректность, референсы и кит, архитектура и TDD, детская безопасность' },
    { title: 'Report', detail: 'сводка: что готово к мержу, что заблокировано' },
  ],
}

// args: [{ id, agent, task }, ...]
// пример: [{ id: 'pet-picker', agent: 'ui-agent', task: 'экран выбора питомца' }]
const FEATURES = Array.isArray(args) ? args : []

if (FEATURES.length === 0) {
  log('Не переданы фичи. Ожидается args: [{ id, agent, task }, ...]')
  return { error: 'no features supplied' }
}

log(`Запускаю ${FEATURES.length} фич параллельно`)

const PLAN_SCHEMA = {
  type: 'object',
  required: ['steps', 'filesTouched', 'openQuestions'],
  properties: {
    steps: { type: 'array', items: { type: 'string' } },
    filesTouched: { type: 'array', items: { type: 'string' } },
    openQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Чего не хватает в docs/ (TODO в брендбуке или рамке компетенций), что блокирует работу',
    },
  },
}

const BUILD_SCHEMA = {
  type: 'object',
  required: ['summary', 'filesChanged', 'verifySkillsRun', 'allGreen', 'testsFirst'],
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    verifySkillsRun: { type: 'array', items: { type: 'string' } },
    allGreen: { type: 'boolean' },
    testsFirst: {
      type: 'object',
      required: ['followed', 'evidence'],
      properties: {
        followed: { type: 'boolean', description: 'Тест писался ДО реализации и наблюдался красным' },
        evidence: {
          type: 'string',
          description: 'Какой тест был первым, с какой ошибкой падал, что сделало его зелёным. Если порядок нарушен — честно сказать это.',
        },
      },
    },
    kitComponentsUsed: { type: 'array', items: { type: 'string' }, description: 'Компоненты из src/shared/ui/, которые переиспользованы' },
    kitComponentsAdded: { type: 'array', items: { type: 'string' }, description: 'Новые компоненты, добавленные в кит' },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  required: ['verdict', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['block', 'ship'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'file', 'problem', 'failureScenario'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          file: { type: 'string' },
          problem: { type: 'string' },
          failureScenario: { type: 'string' },
        },
      },
    },
  },
}

const LENSES = [
  {
    key: 'correctness',
    prompt:
      'Проверь корректность: инвариант «баланс не уходит в минус» на всех путях, совпадение чисел с Документация.docx (раздел 6), границы (0 монет, максимум, длинный перерыв, повторные тапы), миграция состояния MMKV, наличие unit-тестов на новые чистые функции.',
  },
  {
    key: 'references',
    prompt:
      'Проверь соответствие референсам: компонент написан заново вместо взятого из src/shared/ui/ (своя кнопка/прогресс/тост — блокирующая находка), новый компонент в shared/ui без props-контракта в src/shared/ui/ и без карточки на demo-экране, нарушенные инварианты кита (тач-таргет < 44dp, disabled без disabledReason, игнор reduce-motion), хардкодные цвета/размеры вместо токенов темы, нарушение тона из src/shared/theme/, задания без валидного competencyId или со ссылкой на несуществующий пункт src/entities/competency/.',
  },
  {
    key: 'architecture',
    prompt:
      'Проверь архитектуру: границы FSD (импорт только вниз по app → pages → widgets → features → entities → shared, никаких импортов вбок и в обход index.ts слайса), код в правильном слое (формулы в entities, сценарии в features, композитные блоки в widgets, экраны в pages, ничего доменного в shared), отсутствие циклических зависимостей. Отдельно проверь tests first: похоже ли по дифу и коммитам, что тест писался ДО реализации и мог упасть на отсутствующем коде. Тест, привязанный к реализации вместо поведения, подогнанный под результат, с .skip или ослабленным ассертом — находка.',
  },
  {
    key: 'child-safety',
    prompt:
      'Проверь детскую безопасность и этику — это приоритетная категория. Тёмные паттерны (таймеры давления, наказание за отсутствие, случайные награды, искусственный дефицит, вина у ребёнка, поощрение импульсивных трат), взрослая терминология без объяснения, любые следы реальных денег/рекламы/сбора персональных данных, необратимая потеря прогресса без подтверждения.',
  },
]

const results = await pipeline(
  FEATURES,
  // 1. План: дешёвый шаг, ловит блокеры (TODO в docs) до дорогой реализации
  (f) =>
    agent(
      `Прочитай CLAUDE.md и релевантные разделы Документация.docx. Составь план реализации фичи "${f.task}".\n` +
        `Не пиши код. Перечисли шаги, файлы, которые будут затронуты, и открытые вопросы — ` +
        `в частности всё, что помечено TODO в src/shared/theme/, src/entities/competency/ ` +
        `или Документация.docx (раздел 6) и блокирует работу.`,
      { label: `plan:${f.id}`, phase: 'Plan', schema: PLAN_SCHEMA, effort: 'low' },
    ),

  // 2. Реализация в изолированном worktree
  (plan, f) => {
    if (!plan) return null
    if (plan.openQuestions?.length) {
      log(`${f.id}: ${plan.openQuestions.length} открытых вопросов к docs/ — реализую то, что не заблокировано`)
    }
    return agent(
      `Реализуй фичу "${f.task}".\n\n` +
        `План:\n${plan.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
        `Открытые вопросы (НЕ придумывай ответы — если пункт заблокирован, оставь TODO ` +
        `в коде и укажи в blockers):\n${(plan.openQuestions || []).join('\n') || '—'}\n\n` +
        `Порядок работы обязателен: сначала тест на поведение, запустить, увидеть красный, ` +
        `потом реализация до зелёного, потом рефакторинг. В testsFirst.evidence опиши, ` +
        `какой тест был первым и с какой ошибкой падал. Если порядок нарушил — скажи честно, ` +
        `followed=false; задним числом дописанный тест выдавать за TDD нельзя.\n\n` +
        `Перед версткой прочитай src/shared/ui/ и собирай экран из готовых компонентов. ` +
        `Новый компонент заводи только если в ките такого нет и он нужен ≥2 экранам.\n\n` +
        `Соблюдай границы FSD и клади код в правильный слой.\n\n` +
        `Обязательно прогони скиллы проверки, указанные в твоём определении агента, ` +
        `и верни честный allGreen — false, если хоть один шаг красный или пропущен.`,
      {
        label: `build:${f.id}`,
        phase: 'Build',
        agentType: f.agent,
        schema: BUILD_SCHEMA,
        isolation: 'worktree',
      },
    )
  },

  // 3. Три независимых ревьюера, каждый со своей линзой
  (build, f) => {
    if (!build) return null
    return parallel(
      LENSES.map((lens) => () =>
        agent(
          `Отревьюй изменения фичи "${f.task}" (${f.id}).\n\n` +
            `Что сделал автор: ${build.summary}\n` +
            `Файлы: ${build.filesChanged.join(', ')}\n` +
            `Автор заявляет про tests first: followed=${build.testsFirst?.followed}, ` +
            `${build.testsFirst?.evidence || 'без пояснения'} — проверь это по дифу, не верь на слово.\n` +
            `Переиспользовал из кита: ${(build.kitComponentsUsed || []).join(', ') || 'ничего'}. ` +
            `Добавил в кит: ${(build.kitComponentsAdded || []).join(', ') || 'ничего'}.\n` +
            `Заявленные блокеры: ${(build.blockers || []).join('; ') || 'нет'}\n\n` +
            `Твоя линза: ${lens.prompt}\n\n` +
            `Смотри git diff сам. Для каждой находки дай конкретный сценарий отказа ` +
            `(«при таких вводных получится вот такой результат»). Гипотезы без сценария ` +
            `отказа не выдавай. Верни verdict=block, если есть хоть одна находка severity=blocker.`,
          { label: `review:${f.id}:${lens.key}`, phase: 'Review', agentType: 'reviewer-agent', schema: REVIEW_SCHEMA },
        ).then((r) => ({ lens: lens.key, ...r })),
      ),
    ).then((reviews) => ({ feature: f, build, reviews: reviews.filter(Boolean) }))
  },
)

phase('Report')

const done = results.filter(Boolean)
const report = done.map((r) => {
  const findings = r.reviews.flatMap((rev) => rev.findings.map((f) => ({ lens: rev.lens, ...f })))
  const blockers = findings.filter((f) => f.severity === 'blocker')
  const tddFollowed = r.build.testsFirst?.followed === true
  if (!tddFollowed) {
    blockers.push({
      lens: 'process',
      severity: 'blocker',
      file: '—',
      problem: 'Порядок tests first нарушен',
      failureScenario: r.build.testsFirst?.evidence || 'автор не подтвердил, что тест писался до реализации',
    })
  }
  return {
    id: r.feature.id,
    task: r.feature.task,
    buildGreen: r.build.allGreen,
    testsFirst: r.build.testsFirst,
    mergeable: r.build.allGreen && tddFollowed && blockers.length === 0,
    blockers,
    otherFindings: findings.filter((f) => f.severity !== 'blocker'),
    buildBlockers: r.build.blockers || [],
  }
})

const dropped = FEATURES.length - done.length
if (dropped > 0) log(`ВНИМАНИЕ: ${dropped} фич(и) не дошли до конца пайплайна — см. journal.jsonl`)

const mergeable = report.filter((r) => r.mergeable)
log(`Готово к мержу: ${mergeable.length}/${FEATURES.length}`)

return {
  mergeable: mergeable.map((r) => r.id),
  blocked: report.filter((r) => !r.mergeable),
  full: report,
  droppedFeatures: dropped,
}
