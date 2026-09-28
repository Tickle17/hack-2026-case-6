import {
  applyDecay,
  wellbeing,
  emotionFor,
  petComplaints,
  hourlyHunger,
  HOUR_MS,
  DECAY_PER_DAY,
  FLOOR,
} from './pet-stats';

const full = { satiety: 100, mood: 100, cleanliness: 100 };

describe('убывание характеристик', () => {
  it('за сутки убывает по числам из game-design.md', () => {
    const after = applyDecay(full, 24 * 60 * 60 * 1000);
    expect(after.satiety).toBe(100 - DECAY_PER_DAY.satiety);
    expect(after.mood).toBe(100 - DECAY_PER_DAY.mood);
    expect(after.cleanliness).toBe(100 - DECAY_PER_DAY.cleanliness);
  });

  it('за долгий перерыв считает не более чем за сутки — отсутствие не наказывается', () => {
    const week = applyDecay(full, 7 * 24 * 60 * 60 * 1000);
    const day = applyDecay(full, 24 * 60 * 60 * 1000);
    expect(week).toEqual(day);
  });

  it('не опускается ниже пола', () => {
    const empty = { satiety: FLOOR, mood: FLOOR, cleanliness: FLOOR };
    expect(applyDecay(empty, 24 * 60 * 60 * 1000)).toEqual(empty);
  });

  it('нулевой промежуток ничего не меняет', () => {
    expect(applyDecay(full, 0)).toEqual(full);
  });
});

describe('эмоция питомца', () => {
  it('радуется, когда всё хорошо', () => {
    expect(emotionFor(full)).toBe('happy');
  });

  it('голоден, когда сытость — самая слабая характеристика', () => {
    expect(emotionFor({ satiety: 15, mood: 90, cleanliness: 90 })).toBe(
      'hungry',
    );
  });

  it('грязный, когда чистота — самая слабая', () => {
    expect(emotionFor({ satiety: 90, mood: 90, cleanliness: 15 })).toBe(
      'dirty',
    );
  });

  it('грустит, когда настроение — самое слабое', () => {
    expect(emotionFor({ satiety: 90, mood: 15, cleanliness: 90 })).toBe('sad');
  });
});

describe('благополучие', () => {
  it('среднее трёх характеристик', () => {
    expect(wellbeing({ satiety: 60, mood: 30, cleanliness: 90 })).toBe(60);
  });
});

describe('что говорит питомец', () => {
  it('всё хорошо — молчит: никаких «мне хорошо»', () => {
    expect(petComplaints(full)).toEqual([]);
  });

  it('сытость меньше половины — «Я очень голоден»', () => {
    expect(petComplaints({ satiety: 49, mood: 80, cleanliness: 80 })).toEqual([
      'Я очень голоден',
    ]);
  });

  it('ровно половина — ещё не жалуется', () => {
    expect(petComplaints({ satiety: 50, mood: 50, cleanliness: 80 })).toEqual(
      [],
    );
  });

  it('радость меньше половины — «Мне очень грустно»', () => {
    expect(petComplaints({ satiety: 80, mood: 20, cleanliness: 80 })).toEqual([
      'Мне очень грустно',
    ]);
  });

  it('и голоден, и грустно — фразы идут друг за другом', () => {
    expect(petComplaints({ satiety: 20, mood: 20, cleanliness: 80 })).toEqual([
      'Я очень голоден',
      'Мне очень грустно',
    ]);
  });
});

describe('сытость убывает каждый реальный час', () => {
  const start = 1_000_000_000_000;

  it('за час — минус одна', () => {
    const r = hourlyHunger(full, start, start + HOUR_MS);
    expect(r.stats.satiety).toBe(99);
    expect(r.since).toBe(start + HOUR_MS);
  });

  it('неполный час не считается и не теряется', () => {
    const r = hourlyHunger(full, start, start + HOUR_MS * 2.5);
    expect(r.stats.satiety).toBe(98);
    // Остаток в полчаса засчитается со следующим часом.
    expect(r.since).toBe(start + HOUR_MS * 2);
  });

  it('радость и чистота от часов не меняются', () => {
    const r = hourlyHunger(full, start, start + HOUR_MS * 5);
    expect(r.stats.mood).toBe(100);
    expect(r.stats.cleanliness).toBe(100);
  });

  it('долгий перерыв не опускает ниже пола', () => {
    const r = hourlyHunger(full, start, start + HOUR_MS * 500);
    expect(r.stats.satiety).toBe(FLOOR);
  });

  it('часы, переведённые назад, не прибавляют сытость', () => {
    const r = hourlyHunger(full, start, start - HOUR_MS * 3);
    expect(r.stats).toEqual(full);
    expect(r.since).toBe(start);
  });
});
