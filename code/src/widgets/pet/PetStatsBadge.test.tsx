import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { PetStatsBadge } from './PetStatsBadge';

const texts = (root: ReactTestRenderer.ReactTestRenderer): string =>
  JSON.stringify(root.toJSON());

function render(onPress = jest.fn()) {
  let root!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(
      <PetStatsBadge
        satiety={45}
        mood={80}
        cleanliness={70}
        onPress={onPress}
      />,
    );
  });
  return root;
}

describe('показатели питомца в шапке (ТЗ 2.5.3)', () => {
  it('три показателя видны сразу — числом, не только цветом', () => {
    const text = texts(render());
    ['"45"', '"80"', '"70"'].forEach(v => expect(text).toContain(v));
  });

  it('у каждого — подпись для экранного диктора', () => {
    const text = texts(render());
    expect(text).toContain('сытость 45');
    expect(text).toContain('радость 80');
    expect(text).toContain('чистота 70');
  });

  it('нажатие открывает подробности', () => {
    const onPress = jest.fn();
    const root = render(onPress);
    ReactTestRenderer.act(() =>
      root.root.findByProps({ accessibilityRole: 'button' }).props.onPress(),
    );
    expect(onPress).toHaveBeenCalled();
  });
});
