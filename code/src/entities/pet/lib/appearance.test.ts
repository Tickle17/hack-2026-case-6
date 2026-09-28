import {
  COLORS,
  combinationCount,
  petFrames,
  petRegistryKey,
  pickRegistryKey,
  DEFAULT_PET_NAME,
  sanitizePetName,
  type PetColor,
} from './appearance';
import { SPECIES } from '../config/species';

/**
 * Внешний вид и имя питомца (UC-9).
 *
 * ТЗ 2.5.2: настройка внешнего вида и ввод игрового имени.
 * ТЗ 2.6: не менее 9 визуально различимых комбинаций.
 */

describe('комбинации внешнего вида', () => {
  it('их не меньше девяти — прямое требование ТЗ 2.6', () => {
    expect(combinationCount()).toBeGreaterThanOrEqual(9);
  });

  it('окрасов несколько и у каждого есть название', () => {
    expect(COLORS.length).toBeGreaterThanOrEqual(3);
    COLORS.forEach((c: PetColor) => {
      expect(c.title.length).toBeGreaterThan(0);
    });
  });

  it('первый окрас — родной, без перекраски', () => {
    expect(COLORS[0].suffix).toBe('');
  });

  it('у каждого вида есть кадры в каждом окрасе', () => {
    SPECIES.forEach(s => {
      COLORS.forEach((c: PetColor) => {
        const frames = petFrames(s.id, 'idle', c.id);
        expect(frames.length).toBeGreaterThan(0);
      });
    });
  });

  it('неизвестный окрас откатывается к родному, а не ломает игру', () => {
    const frames = petFrames('cat', 'idle', 'не-существует');
    expect(frames.length).toBeGreaterThan(0);
  });
});

/**
 * Взрослый вид после третьего уровня.
 *
 * Картинки взрослого питомца приходят позже основных. Пока их нет,
 * повзрослевший питомец показывается обычными — игра не должна ни
 * упасть, ни потерять питомца.
 */
describe('взрослый вид', () => {
  it('без взрослых картинок остаётся обычный набор', () => {
    SPECIES.forEach(s => {
      COLORS.forEach(c => {
        const young = petRegistryKey(s.id, c.id);
        const grown = petRegistryKey(s.id, c.id, true);
        expect(petFrames(grown, 'idle', c.id).length).toBeGreaterThan(0);
        // Сейчас взрослых листов нет — ключ совпадает с обычным.
        expect(grown === young || grown.includes('-adult')).toBe(true);
      });
    });
  });

  it('молодой питомец всегда в обычном наборе', () => {
    expect(petRegistryKey('cat', 'own', false)).toBe('cat');
  });

  // Реестр с взрослым котом — так он будет выглядеть, когда картинки
  // нарисуют. Проверяем сам выбор, не дожидаясь их.
  const full = { idle: {}, walk: {}, dirty: {} };
  const registry = {
    cat: full,
    'cat--black': full,
    'cat-adult': full,
    'cat-adult--black': full,
    dog: full,
    pig: full,
    // Взрослой хрюшки нарисована пока только ходьба.
    'pig-adult': { walk: {} },
  };

  it('повзрослевший берёт взрослый набор, если он нарисован', () => {
    expect(pickRegistryKey(registry, 'cat', 'own', true)).toBe('cat-adult');
    expect(pickRegistryKey(registry, 'cat', 'black', true)).toBe(
      'cat-adult--black',
    );
  });

  it('вид без взрослых картинок остаётся в обычном наборе', () => {
    expect(pickRegistryKey(registry, 'dog', 'own', true)).toBe('dog');
  });

  it('неполный взрослый набор без покоя не включается', () => {
    // Питомец то стоит, то ходит. Будь взрослой только ходьба, он шёл
    // бы взрослым, а останавливаясь — снова становился малышом:
    // персонаж менялся бы на глазах каждые пару секунд.
    expect(pickRegistryKey(registry, 'pig', 'own', true)).toBe('pig');
  });

  it('взрослый набор без грязного листа не включается', () => {
    // Грязным питомец бывает каждый день после прогулки, и грязный
    // лист заменяет и покой, и ходьбу. Без него подросший питомец
    // до самой ванны снова выглядел бы малышом.
    const noDirty = { ...registry, 'cat-adult': { idle: {}, walk: {} } };
    expect(pickRegistryKey(noDirty, 'cat', 'own', true)).toBe('cat');
  });

  it('до третьего уровня взрослый набор не берётся', () => {
    expect(pickRegistryKey(registry, 'cat', 'own', false)).toBe('cat');
  });
});

describe('имя питомца', () => {
  it('по умолчанию предлагается имя из названия продукта', () => {
    expect(DEFAULT_PET_NAME).toBe('Финни');
  });

  it('пустое имя заменяется предложенным — питомец не остаётся безымянным', () => {
    expect(sanitizePetName('')).toBe(DEFAULT_PET_NAME);
    expect(sanitizePetName('   ')).toBe(DEFAULT_PET_NAME);
  });

  it('лишние пробелы убираются', () => {
    expect(sanitizePetName('  Барсик  ')).toBe('Барсик');
  });

  it('слишком длинное имя обрезается — иначе оно не влезет на экран', () => {
    const long = 'a'.repeat(50);
    expect(sanitizePetName(long).length).toBeLessThanOrEqual(12);
  });

  it('имя не может состоять из служебных символов', () => {
    expect(sanitizePetName('<<<>>>')).toBe(DEFAULT_PET_NAME);
  });
});

describe('грязный питомец', () => {
  it('у каждого вида есть грязные кадры', () => {
    SPECIES.forEach(s => {
      expect(petFrames(s.id, 'dirty', 'own').length).toBeGreaterThan(0);
    });
  });

  it('грязные кадры есть в каждом окрасе — грязь не перекрашивает питомца', () => {
    SPECIES.forEach(s => {
      COLORS.forEach(c => {
        expect(petFrames(s.id, 'dirty', c.id).length).toBeGreaterThan(0);
      });
    });
  });

  it('грязный кадр отличается от чистого', () => {
    const dirty = petFrames('cat', 'dirty', 'own')[0];
    const walk = petFrames('cat', 'walk', 'own')[0];
    expect(dirty).not.toEqual(walk);
  });
});
