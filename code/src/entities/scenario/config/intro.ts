import type { Scenario } from '../model/types';
import { lessonDays, lessonForDay, FIRST_LESSON_DAY } from './lessons';
import { START_BUDGET } from '../lib/state';
import { lessonEntryId, lessonToNodes } from '../lib/lesson-nodes';

/**
 * Дни с заданием, которые обслуживает повторяющийся цикл.
 *
 * Поимённо расписан только второй день: в нём завязка (родители ушли,
 * расходники кончились). Все остальные школьные дни строятся из пула
 * заданий, поэтому добавленное в `lessons.json` задание удлиняет игру
 * на день само — сценарий править не нужно (ТЗ 2.5.14).
 */
const LOOP_LESSON_DAYS = lessonDays().filter(d => d > FIRST_LESSON_DAY);

/**
 * Сценарий вступления: день рождения → первый круг дел → школа →
 * развилка второго дня. Весь сюжет здесь; в компонентах ветвлений нет.
 *
 * Реплики — черновые. Тон правится в этом файле, код не трогается.
 */
export const INTRO: Scenario = {
  startNodeId: 'bd.hello',
  nodes: [
    // ---------------------------------------------- Сцена 1. День рождения
    {
      id: 'bd.hello',
      type: 'dialogue',
      speaker: 'mother',
      text: 'С днём рождения, {имя}! У нас для тебя подарок.',
      pose: 'greet',
      next: 'bd.guess',
    },
    {
      id: 'bd.guess',
      type: 'dialogue',
      speaker: 'father',
      text: 'Угадаешь, {имя}, кто это?',
      pose: 'gift',
      next: 'bd.think',
    },
    {
      id: 'bd.think',
      type: 'thought',
      text: 'Коробка… и она шевелится. Значит, там кто-то живой!',
      next: 'bd.pick',
    },
    {
      id: 'bd.pick',
      type: 'choice',
      prompt: 'Кто же там?',
      options: [
        {
          id: 'cat',
          label: 'Котёнок',
          icon: 'cat',
          effects: [{ do: 'setPetSpecies', speciesId: 'cat' }],
          next: 'bd.reveal',
        },
        {
          id: 'dog',
          label: 'Щенок',
          icon: 'dog',
          effects: [{ do: 'setPetSpecies', speciesId: 'dog' }],
          next: 'bd.reveal',
        },
        {
          id: 'pig',
          label: 'Хрюшка',
          icon: 'pig',
          effects: [{ do: 'setPetSpecies', speciesId: 'pig' }],
          next: 'bd.reveal',
        },
        {
          id: 'monkey',
          label: 'Обезьянка',
          icon: 'monkey',
          effects: [{ do: 'setPetSpecies', speciesId: 'monkey' }],
          next: 'bd.reveal',
        },
      ],
    },
    {
      id: 'bd.reveal',
      type: 'dialogue',
      speaker: 'mother',
      text: 'Угадал, {имя}! Теперь {питомец} твой. Заботься о нём.',
      pose: 'love',
      next: 'bd.supplies',
    },
    // Набор на первый день родители выдают: без корма нечем кормить,
    // без поводка некуда идти, и первый день упирался бы в запертые
    // дела раньше, чем ребёнок понял правила. Обязательные расходы
    // всё равно появляются сегодня же — в магазине покупают набор
    // НА ЗАВТРА (Приложение А, шаги 5 и 7).
    {
      id: 'bd.supplies',
      type: 'dialogue',
      speaker: 'mother',
      text: 'Корм, шампунь и поводок на сегодня мы купили. А дальше — сам.',
      pose: 'talk',
      next: 'bd.pocket',
    },
    {
      id: 'bd.pocket',
      type: 'dialogue',
      speaker: 'father',
      text: 'И вот тебе карманные. Реши сам, на что их потратить.',
      pose: 'gift',
      next: 'bd.grantStart',
    },
    // Стартовый бюджет: Приложение А, шаг 4. Без него первый день
    // нечего планировать, а планирование — ядро задачи.
    {
      id: 'bd.grantStart',
      type: 'effect',
      effects: [
        { do: 'grantCoins', amount: START_BUDGET, reason: 'карманные' },
        // Набор на сегодня — от родителей. Корм и шампунь уйдут за день,
        // поводок останется: он не тратится.
        { do: 'giveItem', itemId: 'food' },
        { do: 'giveItem', itemId: 'shampoo' },
        { do: 'giveItem', itemId: 'leash' },
        // Магазин нужен с первого дня: завтрашний набор покупают сегодня.
        { do: 'unlockShop', unlocked: true },
        { do: 'setFlag', flag: 'intro', value: true },
      ],
      next: 'bd.aim',
    },
    /**
     * Цель игры — словами, один раз и коротко.
     *
     * ТЗ 2.5.1 требует знакомства «с целью игры и тремя типами
     * решений». Три типа ребёнок и так проходит руками на экране
     * плана в первый день, а вот зачем всё это — нигде не звучало.
     * Мысль от первого лица, а не лекция от взрослого: ребёнок
     * формулирует задачу себе сам.
     */
    {
      id: 'bd.aim',
      type: 'thought',
      text:
        'На всё сразу не хватит. Надо решать: что купить сегодня, ' +
        'что подождёт, а что отложить на большую покупку.',
      next: 'bd.chores',
    },

    // ------------------------------------- Сцена 2. Первый круг дел (по разу)
    {
      id: 'bd.chores',
      type: 'taskGate',
      // Во вступлении гладим 1 раз, а не 3: задача сцены — показать интерфейс.
      require: [
        { taskId: 'pet', times: 1 },
        { taskId: 'feed', times: 1 },
        { taskId: 'bath', times: 1 },
        { taskId: 'walk', times: 1 },
      ],
      hint: 'Покорми, погуляй, а купаться — после прогулки',
      next: 'bd.praise',
    },

    // ------------------------------------------------ Сцена 3. Первая награда
    {
      id: 'bd.praise',
      type: 'dialogue',
      speaker: 'father',
      text: 'Ты справился со всеми задачами, {имя}! Вот тебе ещё 10 монет — {питомец} будет рад подарку.',
      pose: 'gift',
      next: 'bd.grant',
    },
    {
      id: 'bd.grant',
      type: 'effect',
      // Монеты падают на счёт СРАЗУ, как о них сказали. Если отложить
      // до конца дня, ребёнок слышит «вот тебе 10 монет» и видит ноль.
      // Сначала в копилку уходит доля по плану, потом мамина награда:
      // иначе награда попала бы в «остаток дня» и в копилку.
      effects: [
        { do: 'depositSavings' },
        { do: 'grantCoins', amount: 10, reason: 'Первый день с питомцем' },
      ],
      next: 'bd.reward',
    },
    {
      id: 'bd.reward',
      type: 'dialogue',
      speaker: 'mother',
      text: 'На них можно покупать питомцу наряды. Но сначала — то, без чего не обойтись.',
      pose: 'point',
      next: 'bd.end',
    },
    {
      id: 'bd.end',
      type: 'endDay',
      // Магазин НЕ открывается: иначе ребёнок потратит деньги до того,
      // как узнает про расходники, и развилка второго дня сломается.
      // Награда уже выдана на bd.grant — здесь только смена дня.
      next: lessonEntryId('d2.school'),
    },

    // -------------------------------------------------- Сцена 4. Школа, урок
    ...lessonToNodes(lessonForDay(2)!, {
      idPrefix: 'd2.school',
      next: 'd2.home',
    }),

    // ------------------------------------- Сцена 5. Дом без родителей, развилка
    {
      id: 'd2.home',
      type: 'dialogue',
      speaker: 'hero',
      text: 'Родители на работе. Надо всё успеть до их прихода.',
      // Вернулись из школы домой.
      scene: 'home',
      next: 'd2.notice',
    },
    // Здесь раньше стоял узел, обнулявший корм, шампунь и поводок:
    // он был нужен, пока расходники не тратились сами и обязательные
    // покупки надо было чем-то создать. Теперь они тратятся делами,
    // и это обнуление выбрасывало ровно то, что ребёнок купил накануне
    // «на завтра». Из-за него утро второго дня требовало 15 монет
    // вместо шести: набор приходилось брать и на сегодня, и на завтра.
    {
      id: 'd2.notice',
      type: 'dialogue',
      speaker: 'hero',
      text: 'Корм и шампунь, что купил вчера, — как раз на сегодня. А на прогулке возьму на завтра.',
      next: 'd2.unlockShop',
    },
    {
      id: 'd2.unlockShop',
      type: 'effect',
      effects: [
        { do: 'setFlag', flag: 'shop.visited', value: true },
        { do: 'unlockShop', unlocked: true },
      ],
      next: 'd2.canWork',
    },

    // Магазин теперь часть прогулки: герой всегда заходит туда и сначала
    // берёт всё нужное. Отдельного узла магазина в сценарии нет —
    // иначе их было бы два.
    {
      id: 'd2.canWork',
      type: 'taskGate',
      require: 'all',
      hint: 'Успей сделать все дела до прихода родителей',
      next: 'd2.praiseA',
    },
    {
      id: 'd2.praiseA',
      type: 'dialogue',
      speaker: 'mother',
      text: 'Ты купил всё нужное и справился сам. Молодец, {имя}!',
      pose: 'love',
      next: 'd2.grantA',
    },
    {
      id: 'd2.grantA',
      type: 'effect',
      effects: [
        { do: 'depositSavings' },
        { do: 'grantCoins', amount: 10, reason: 'Дела сделаны' },
      ],
      next: 'd2.endA',
    },
    {
      id: 'd2.endA',
      type: 'endDay',
      next: 'loop.start',
    },

    // Третий день и дальше идут общим циклом: свой набор узлов
    // на каждый день приходилось бы дописывать руками под каждое
    // новое задание, а это ровно то, чего ТЗ 2.5.14 велит избегать.

    // Дальше — повторяющийся дневной цикл.
    //
    // Каждый день, кроме первого, начинается со школы: развилка выбирает
    // урок по номеру дня, а когда уроки кончились — идёт сразу к делам.
    // Раньше цикл школу не проходил вовсе, и уроки после третьего дня
    // были недостижимы.
    {
      id: 'loop.start',
      type: 'branch',
      fallback: 'loop.day',
      branches: LOOP_LESSON_DAYS.map(day => ({
        when: { op: 'day', cmp: '=', value: day },
        next: lessonEntryId(`loop.school.d${day}`),
      })),
    },
    ...LOOP_LESSON_DAYS.flatMap(day =>
      lessonToNodes(lessonForDay(day)!, {
        idPrefix: `loop.school.d${day}`,
        next: 'loop.day',
      }),
    ),
    {
      id: 'loop.day',
      type: 'taskGate',
      scene: 'home',
      require: 'all',
      hint: 'Позаботься о питомце',
      next: 'loop.praise',
    },
    {
      id: 'loop.praise',
      type: 'dialogue',
      speaker: 'mother',
      text: '{питомец} доволен. Вот тебе 10 монет.',
      pose: 'love',
      next: 'loop.grant',
    },
    {
      id: 'loop.grant',
      type: 'effect',
      effects: [
        { do: 'depositSavings' },
        { do: 'grantCoins', amount: 10, reason: 'Дела сделаны' },
      ],
      next: 'loop.end',
    },
    {
      id: 'loop.end',
      type: 'endDay',
      next: 'loop.start',
    },
  ],
};
