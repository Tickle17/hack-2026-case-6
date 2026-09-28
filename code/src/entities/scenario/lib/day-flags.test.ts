import { applyEffects } from './effects';
import { createInitialState } from './state';
import { needsFirstFlag } from './day-flags';

describe('«завтра начну с нужного»', () => {
  it('отметка на завтра переживает смену дня', () => {
    const today = createInitialState('start');
    const tomorrow = applyEffects(today, [
      { do: 'setFlag', flag: needsFirstFlag(today.day + 1), value: true },
      { do: 'advanceDay' },
    ]);

    expect(tomorrow.flags[needsFirstFlag(tomorrow.day)]).toBe(true);
  });

  it('не переносится на следующий день сама', () => {
    expect(needsFirstFlag(5)).not.toBe(needsFirstFlag(6));
  });
});
