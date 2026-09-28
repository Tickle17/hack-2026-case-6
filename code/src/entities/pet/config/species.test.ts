import { SPECIES } from './species';
import type { PetSpecies } from '../model/types';
import { assertLicensable } from '../lib/license-guard';
import { hasAnimations } from './animations';
import { SPECIES as SCENARIO_SPECIES } from '@/entities/scenario/config/registries';

describe('реестр видов питомцев', () => {
  it('содержит минимум 3 вида — требование ТЗ', () => {
    expect(
      SPECIES.filter(s => s.role === 'companion').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('совпадает со списком видов в реестре сценария', () => {
    // Два реестра — два источника правды. Разойдутся — в настройках окажутся
    // одни виды, а в игре другие; ровно это уже случилось однажды.
    expect([...SPECIES.map(s => s.id)].sort()).toEqual(
      [...SCENARIO_SPECIES].sort(),
    );
  });

  it('у каждого вида есть анимации', () => {
    SPECIES.forEach(s => expect(hasAnimations(s.id)).toBe(true));
  });

  it('все текущие виды оригинальные — чужих образов в сборке нет', () => {
    SPECIES.forEach(s => expect(s.origin).toBe('original'));
  });

  it('каждый вид проходит проверку прав', () => {
    SPECIES.forEach(s => expect(() => assertLicensable(s)).not.toThrow());
  });
});

describe('страж прав на образ', () => {
  const licensedWithoutNote: PetSpecies = {
    id: 'foxy',
    name: 'Лисёнок',
    origin: 'licensed',
    role: 'mentor',
    palette: { primary: '#FF6B35', accent: '#FFD180' },
    shape: 'round',
    customization: { colors: [] },
  };

  it('не пускает лицензионный образ без документа о правах', () => {
    expect(() => assertLicensable(licensedWithoutNote)).toThrow(/licenseNote/);
  });

  it('пропускает лицензионный образ с подтверждением прав', () => {
    expect(() =>
      assertLicensable({
        ...licensedWithoutNote,
        licenseNote: 'Письмо заказчика от 2026-08-24',
      }),
    ).not.toThrow();
  });
});
