import { NativeModules, Platform } from 'react-native';

/**
 * Иконка приложения на телефоне — под вид питомца.
 * Только Android; в тестах и на других платформах ничего не делает.
 */
export function setAppIcon(speciesId: string): void {
  if (Platform.OS !== 'android') return;
  NativeModules.PetIcon?.setIcon(speciesId);
}
