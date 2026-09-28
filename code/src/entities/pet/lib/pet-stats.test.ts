import {
  applyDecay,
  wellbeing,
  emotionFor,
  moodReason,
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

describe('причина настроения', () => {
  it('говорит, что всё хорошо, когда показатели высокие', () => {
    expect(moodReason(full)).toMatch(/хорошо/);
  });

  it('просит еды, когда слабее всего сытость', () => {
    expect(moodReason({ satiety: 30, mood: 60, cleanliness: 60 })).toMatch(
      /[Пп]окорми/,
    );
  });

  it('просится в ванну, когда слабее всего чистота', () => {
    expect(moodReason({ satiety: 60, mood: 60, cleanliness: 30 })).toMatch(
      /ванну/,
    );
  });

  it('просит внимания, когда слабее всего настроение', () => {
    expect(moodReason({ satiety: 60, mood: 30, cleanliness: 60 })).toMatch(
      /[Пп]огладь/,
    );
  });

  it('при равенстве объясняет то же, что показывает эмоция', () => {
    expect(emotionFor({ satiety: 30, mood: 30, cleanliness: 30 })).toBe(
      'hungry',
    );
    expect(moodReason({ satiety: 30, mood: 30, cleanliness: 30 })).toMatch(
      /[Пп]окорми/,
    );
  });
});
