import { AppState, NativeModules, Platform } from 'react-native';

/**
 * Иконка приложения на телефоне — под вид питомца.
 * Только Android; в тестах и на других платформах ничего не делает.
 *
 * Иконка меняется, только когда игра ушла в фон. Смена отключает
 * «вход», через который игра открыта, и Android закрывает её окно:
 * раньше ребёнок выбирал питомца — и игра пропадала у него из рук.
 * В фоне это незаметно: при следующем входе и иконка новая, и игра
 * на месте (прогресс сохраняется после каждого действия).
 */

let pending: string | null = null;
let listening = false;

export function setAppIcon(speciesId: string): void {
  if (Platform.OS !== 'android') return;
  pending = speciesId;
  if (listening) return;
  listening = true;
  AppState.addEventListener('change', state => {
    if (state === 'background' && pending) {
      NativeModules.PetIcon?.setIcon(pending);
      pending = null;
    }
  });
}
