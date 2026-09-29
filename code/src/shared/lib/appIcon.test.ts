import { AppState, NativeModules, Platform } from 'react-native';

/**
 * Смена иконки отключает «вход», через который открыта игра, и Android
 * закрывает её окно. Поэтому иконка меняется только в фоне: ребёнок
 * выбрал питомца — игра не пропадает у него из рук.
 */
describe('иконка приложения под питомца', () => {
  let onChange: ((state: string) => void) | undefined;
  const setIcon = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    setIcon.mockClear();
    onChange = undefined;
    (Platform as { OS: string }).OS = 'android';
    NativeModules.PetIcon = { setIcon };
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        onChange = handler as (state: string) => void;
        return { remove: jest.fn() } as never;
      });
  });

  it('пока игра открыта, иконку не трогает', () => {
    const { setAppIcon } = require('./appIcon');
    setAppIcon('dog');
    expect(setIcon).not.toHaveBeenCalled();
  });

  it('игра ушла в фон — ставит иконку последнего выбранного питомца', () => {
    const { setAppIcon } = require('./appIcon');
    setAppIcon('dog');
    setAppIcon('pig');
    onChange?.('background');
    expect(setIcon).toHaveBeenCalledTimes(1);
    expect(setIcon).toHaveBeenCalledWith('pig');
  });

  it('второй раз в фоне ту же иконку не ставит', () => {
    const { setAppIcon } = require('./appIcon');
    setAppIcon('dog');
    onChange?.('background');
    onChange?.('background');
    expect(setIcon).toHaveBeenCalledTimes(1);
  });
});
