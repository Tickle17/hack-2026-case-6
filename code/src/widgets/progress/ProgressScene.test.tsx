import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ProgressScene } from './ProgressScene';
import { createInitialState } from '@/entities/scenario';

jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  return { ScrollView: RN.ScrollView };
});

const texts = (root: ReactTestRenderer.ReactTestRenderer): string =>
  JSON.stringify(root.toJSON());

function render(yesterday: ReturnType<typeof createInitialState>['yesterday']) {
  let root!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(
      <ProgressScene
        state={{ ...createInitialState('start'), day: 2, yesterday }}
        onClose={() => {}}
      />,
    );
  });
  return root;
}

describe('«Чему научился»: итог прошлого дня (ТЗ 2.5.11)', () => {
  it('показывает вчерашний план против факта', () => {
    const text = texts(
      render({
        day: 1,
        must: { planned: 6, actual: 9 },
        want: { planned: 3, actual: 1 },
        save: { planned: 3, actual: 2 },
      }),
    );
    expect(text).toContain('Вчера, день 1');
    expect(text).toContain('обязательное: планировал 6, потратил 9');
    expect(text).toContain('копилка: планировал 3, отложил 2');
  });

  it('вчера плана не было — блока нет', () => {
    expect(texts(render(null))).not.toContain('Вчера');
  });
});
