import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { WelcomeScene } from './WelcomeScene';

const texts = (root: ReactTestRenderer.ReactTestRenderer): string =>
  JSON.stringify(root.toJSON());

function press(root: ReactTestRenderer.ReactTestRenderer, label: string) {
  let node: ReactTestRenderer.ReactTestInstance | null = root.root.find(
    n => n.children.length === 1 && n.children[0] === label,
  );
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent;
  }
  ReactTestRenderer.act(() => node!.props.onPress());
}

function render(onDone = jest.fn()) {
  let root!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(<WelcomeScene onDone={onDone} />);
  });
  return root;
}

describe('приветствие: имя', () => {
  it('пустое табло — берётся имя из подсказки', () => {
    const onDone = jest.fn();
    const root = render(onDone);
    press(root, 'ПРОДОЛЖИТЬ');
    expect(onDone).toHaveBeenCalledWith('Иван');
  });

  it('одна буква — ошибка; стёр её — снова можно с именем из подсказки', () => {
    const onDone = jest.fn();
    const root = render(onDone);
    press(root, 'А');
    press(root, 'ПРОДОЛЖИТЬ');
    expect(onDone).not.toHaveBeenCalled();
    expect(texts(root)).toContain('Что-то с именем не то');
    press(root, '⌫');
    expect(texts(root)).not.toContain('Что-то с именем не то');
    press(root, 'ПРОДОЛЖИТЬ');
    expect(onDone).toHaveBeenCalledWith('Иван');
  });
});
