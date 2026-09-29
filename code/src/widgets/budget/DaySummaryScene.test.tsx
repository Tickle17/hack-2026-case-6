import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { DaySummaryScene } from './DaySummaryScene';
import { createRun } from '@/entities/scenario/lib/interpreter';
import { INTRO } from '@/entities/scenario/config/intro';
import { REGISTRIES } from '@/entities/scenario/config/registries';

// Жесты в тестовом рендере не нужны: прокрутка — обычная, ползунок
// проверяем по подписи, а не по перетаскиванию.
jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  const chain: object = new Proxy({}, { get: () => () => chain });
  return {
    ScrollView: RN.ScrollView,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: new Proxy({}, { get: () => () => chain }),
  };
});

/** Вечер дня: план 6/4/2, куплены корм, шампунь и бантик. */
function evening(extraCoins = 0) {
  const r = createRun(INTRO, REGISTRIES);
  REGISTRIES.items
    .filter(i => i.category === 'must')
    .forEach(i =>
      r.apply([1, 2, 3].map(() => ({ do: 'giveItem' as const, itemId: i.id }))),
    );
  r.apply([{ do: 'grantCoins', amount: 12 + extraCoins, reason: 'тест' }]);
  r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);
  r.apply([
    { do: 'spendFrom', category: 'must', amount: 3, reason: 'Корм' },
    { do: 'spendFrom', category: 'must', amount: 3, reason: 'Шампунь' },
    { do: 'spendFrom', category: 'want', amount: 1, reason: 'Бантик' },
    { do: 'depositSavings' },
  ]);
  return r.state();
}

const texts = (root: ReactTestRenderer.ReactTestRenderer): string =>
  JSON.stringify(root.toJSON());

function render(state = evening(), onNext = jest.fn()) {
  let root!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(
      <DaySummaryScene
        state={state}
        day={state.day}
        reward={10}
        onNext={onNext}
        onNextNeedsFirst={() => {}}
      />,
    );
  });
  return root;
}

describe('итог дня', () => {
  it('по каждому направлению — «планировал · потратил», у копилки «отложил»', () => {
    const text = texts(render());
    expect(text).toContain('планировал 6 · потратил 6');
    expect(text).toContain('планировал 4 · потратил 1');
    expect(text).toContain('планировал 2 · отложил 2');
  });

  it('под направлением видно, что куплено', () => {
    const text = texts(render());
    expect(text).toContain('Корм, Шампунь');
    expect(text).toContain('Бантик');
  });

  it('осталось больше плана — можно отложить ещё ползунком', () => {
    expect(texts(render())).toContain('ОТЛОЖИТЬ ЕЩЁ');
  });

  it('ничего не осталось — ползунка нет', () => {
    const r = createRun(INTRO, REGISTRIES);
    REGISTRIES.items
      .filter(i => i.category === 'must')
      .forEach(i =>
        r.apply(
          [1, 2, 3].map(() => ({ do: 'giveItem' as const, itemId: i.id })),
        ),
      );
    r.apply([{ do: 'grantCoins', amount: 12, reason: 'тест' }]);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);
    r.apply([
      { do: 'spendFrom', category: 'must', amount: 6, reason: 'Корм' },
      { do: 'spendFrom', category: 'want', amount: 4, reason: 'Мячик' },
      { do: 'depositSavings' },
    ]);
    expect(texts(render(r.state()))).not.toContain('ОТЛОЖИТЬ ЕЩЁ');
  });

  it('«следующий день» передаёт, сколько отложить сверх плана (по умолчанию 0)', () => {
    const onNext = jest.fn();
    const root = render(evening(), onNext);
    let node: ReactTestRenderer.ReactTestInstance | null = root.root.find(
      n => n.children.length === 1 && n.children[0] === 'СЛЕДУЮЩИЙ ДЕНЬ',
    );
    while (node && typeof node.props.onPress !== 'function') {
      node = node.parent;
    }
    ReactTestRenderer.act(() => node!.props.onPress());
    expect(onNext).toHaveBeenCalledWith(0);
  });

  it('монеты за урок видны в «Заработал сегодня» с источником', () => {
    const r = createRun(INTRO, REGISTRIES);
    REGISTRIES.items
      .filter(i => i.category === 'must')
      .forEach(i =>
        r.apply(
          [1, 2, 3].map(() => ({ do: 'giveItem' as const, itemId: i.id })),
        ),
      );
    r.apply([{ do: 'grantCoins', amount: 12, reason: 'тест' }]);
    r.apply([{ do: 'planBudget', must: 6, want: 4, save: 2 }]);
    r.apply([
      { do: 'rewardLesson', lessonId: 'lesson.needs-first', amount: 2 },
      { do: 'depositSavings' },
    ]);
    const text = texts(render(r.state()));
    expect(text).toContain('+ 2 за урок в школе');
  });
});
