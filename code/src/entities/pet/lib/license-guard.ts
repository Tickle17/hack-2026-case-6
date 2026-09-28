import type { PetSpecies } from '../model/types';

/**
 * Не даёт лицензионному образу попасть в сборку без задокументированного права.
 * См. docs/mascot.md — «Правовая рамка».
 */
export function assertLicensable(species: PetSpecies): void {
  if (species.origin === 'licensed' && !species.licenseNote?.trim()) {
    throw new Error(
      `Вид "${species.id}" помечен licensed, но licenseNote пуст. ` +
        'Чужой образ нельзя использовать без подтверждённого права.',
    );
  }
}
