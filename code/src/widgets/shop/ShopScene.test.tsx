import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ShopScene, SHOP_GREETED_FLAG } from './ShopScene';
import { createInitialState } from '@/entities/scenario';
import type { GameState } from '@/entities/scenario';

const texts = (root: ReactTestRenderer.ReactTestRenderer): string =>
  JSON.stringify(root.toJSON());

const render = (
  flags: Record<string, boolean>,
  overrides: Partial<GameState> = {},
  props: Partial<React.ComponentProps<typeof ShopScene>> = {},
) => {
  let root!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(
      <ShopScene
        state={{
          ...createInitialState('start'),
          flags,
          plan: { must: 6, want: 3, save: 3 },
          balance: 12,
          ...overrides,
        }}
        onBuy={() => {}}
        onCover={() => {}}
        onGreeted={() => {}}
        onClose={() => {}}
        {...props}
      />,
    );
  });
  return root;
};

describe('магазин', () => {
  it('при первом заходе продавец знакомится', () => {
    expect(texts(render({}))).toContain('милый питомец');
  });

  it('потом сразу называет, что взять', () => {
    expect(texts(render({ [SHOP_GREETED_FLAG]: true }))).toContain(
      'Сначала возьми',
    );
  });

  it('после первой покупки называет, что осталось купить, а не «сначала возьми»', () => {
    const text = texts(
      render(
        { [SHOP_GREETED_FLAG]: true },
        {
          inventory: { food: 5, shampoo: 5 },
          spent: { must: 6, want: 0 },
          balance: 6,
        },
      ),
    );
    expect(text).toContain('Осталось купить поводок');
    expect(text).not.toContain('Сначала возьми');
  });

  describe('кошелёк вместо банок', () => {
    it('в магазине одна плашка — кошелёк, без разбивки на направления', () => {
      const text = texts(render({ [SHOP_GREETED_FLAG]: true }));
      expect(text).toContain('Кошелёк');
      expect(text).not.toContain('нужен добор');
    });

    it('покупка не ограничена планом: в «Обязательном» 0, а корм купить можно', () => {
      const root = render(
        { [SHOP_GREETED_FLAG]: true },
        { plan: { must: 0, want: 12, save: 0 }, balance: 12 },
      );
      const text = texts(root);
      expect(text).not.toContain('не хватает');
    });
  });

  describe('в кошельке не хватает на обязательное', () => {
    // Поводка нет, корм и шампунь есть; в кошельке 0, в копилке 3.
    const short = {
      inventory: { food: 5, shampoo: 5 },
      plan: { must: 3, want: 0, save: 0 },
      spent: { must: 0, want: 0 },
      balance: 0,
      savings: 3,
    };

    const openLeash = (root: ReactTestRenderer.ReactTestRenderer) => {
      // От надписи «Поводок» вверх — к ближайшему нажимаемому блоку.
      let node: ReactTestRenderer.ReactTestInstance | null = root.root.find(
        n => n.children.length === 1 && n.children[0] === 'Поводок',
      );
      while (node && typeof node.props.onPress !== 'function') {
        node = node.parent;
      }
      ReactTestRenderer.act(() => node!.props.onPress());
    };

    const press = (
      root: ReactTestRenderer.ReactTestRenderer,
      label: string,
    ) => {
      let node: ReactTestRenderer.ReactTestInstance | null = root.root.find(
        n => n.children.length === 1 && n.children[0] === label,
      );
      while (node && typeof node.props.onPress !== 'function') {
        node = node.parent;
      }
      ReactTestRenderer.act(() => node!.props.onPress());
    };

    it('карточка пишет, сколько не хватает', () => {
      const text = texts(render({ [SHOP_GREETED_FLAG]: true }, short));
      expect(text).toContain('обязательное · не хватает 3 монет');
    });

    it('товар на витрине, из копилки можно взять, домой уйти можно', () => {
      const text = texts(render({ [SHOP_GREETED_FLAG]: true }, short));
      expect(text).toContain('Можно взять из копилки');
      expect(text).toContain('ДОМОЙ');
    });

    it('окно: «не хватает» и одна кнопка — из копилки', () => {
      const root = render({ [SHOP_GREETED_FLAG]: true }, short);
      openLeash(root);
      const text = texts(root);
      expect(text).toContain('На поводок не хватает');
      expect(text).toContain('ВЗЯТЬ ИЗ КОПИЛКИ');
      expect(text).not.toContain('РАЗВЛЕЧЕНИЙ');
      expect(text).not.toContain('ПЕРЕДУМАЛ');
    });

    it('перед тем как взять, спрашивает «Ты уверен?» и ничего не покупает', () => {
      const onCover = jest.fn();
      const root = render({ [SHOP_GREETED_FLAG]: true }, short, { onCover });
      openLeash(root);
      press(root, 'ВЗЯТЬ ИЗ КОПИЛКИ');
      const text = texts(root);
      expect(text).toContain('Ты уверен?');
      expect(text).toContain('План на сегодня не будет выполнен');
      expect(onCover).not.toHaveBeenCalled();
    });

    it('«да» берёт из копилки ровно недостающее и покупает', () => {
      const onCover = jest.fn();
      const root = render({ [SHOP_GREETED_FLAG]: true }, short, { onCover });
      openLeash(root);
      press(root, 'ВЗЯТЬ ИЗ КОПИЛКИ');
      press(root, 'ДА');
      expect(onCover).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'leash' }),
        { fromSavings: 3 },
      );
    });

    it('«нет» возвращает к выбору и ничего не меняет', () => {
      const onCover = jest.fn();
      const root = render({ [SHOP_GREETED_FLAG]: true }, short, { onCover });
      openLeash(root);
      press(root, 'ВЗЯТЬ ИЗ КОПИЛКИ');
      press(root, 'НЕТ');
      expect(onCover).not.toHaveBeenCalled();
      expect(texts(root)).toContain('На поводок не хватает');
    });

    it('окно закрывается нажатием на фон, без покупки', () => {
      const onCover = jest.fn();
      const root = render({ [SHOP_GREETED_FLAG]: true }, short, { onCover });
      openLeash(root);
      const backdrop = root.root.find(
        n => n.props.accessibilityLabel === 'Закрыть',
      );
      ReactTestRenderer.act(() => backdrop.props.onPress());
      expect(texts(root)).not.toContain('На поводок не хватает');
      expect(onCover).not.toHaveBeenCalled();
    });

    it('взять неоткуда — объяснение и «понятно»', () => {
      const root = render(
        { [SHOP_GREETED_FLAG]: true },
        { ...short, savings: 0 },
      );
      openLeash(root);
      const text = texts(root);
      expect(text).toContain('Приходи завтра');
      expect(text).toContain('ПОНЯТНО');
      expect(text).not.toContain('ВЗЯТЬ ИЗ');
    });

    it('«Ты уверен?» показывает, как изменится копилка', () => {
      const root = render(
        { [SHOP_GREETED_FLAG]: true },
        { ...short, savings: 10, goalId: 'house', savingsHistory: [5, 5] },
      );
      openLeash(root);
      press(root, 'ВЗЯТЬ ИЗ КОПИЛКИ');
      expect(texts(root)).toContain('В копилке станет 7 из 30');
    });
  });

  describe('в магазине видна и копилка (ТЗ 2.5.9)', () => {
    it('рядом с кошельком — плашка копилки', () => {
      const text = texts(
        render({ [SHOP_GREETED_FLAG]: true }, { savings: 7, balance: 12 }),
      );
      expect(text).toContain('Копилка');
      expect(text).toContain('"7"');
    });
  });

  describe('на развлечение не хватает (ТЗ 2.5.6, Прил. А шаг 7)', () => {
    // Всё нужное есть — витрина развлечений; в кошельке 3.
    const treats = {
      inventory: { food: 5, shampoo: 5, leash: 1 },
      plan: { must: 0, want: 3, save: 0 },
      spent: { must: 0, want: 0 },
      balance: 3,
      savings: 0,
    };

    it('дорогую игрушку можно нажать и узнать, что делать', () => {
      const root = render({ [SHOP_GREETED_FLAG]: true }, treats);
      let node: ReactTestRenderer.ReactTestInstance | null = root.root.find(
        n => n.children.length === 1 && n.children[0] === 'Игрушка',
      );
      while (node && typeof node.props.onPress !== 'function') {
        node = node.parent;
      }
      ReactTestRenderer.act(() => node!.props.onPress());
      const text = texts(root);
      expect(text).toContain('На игрушку не хватает');
      expect(text).toContain('Выбери что-то дешевле');
      expect(text).toContain('ПОНЯТНО');
      // Копилку на развлечения не предлагаем.
      expect(text).not.toContain('ВЗЯТЬ ИЗ КОПИЛКИ');
    });
  });

  describe('после покупки (ТЗ 2.5.9)', () => {
    it('продавец не пересказывает покупку: её видно в кошельке и в истории', () => {
      const onBuy = jest.fn();
      const root = render(
        { [SHOP_GREETED_FLAG]: true },
        { plan: { must: 6, want: 3, save: 3 }, balance: 12 },
        { onBuy },
      );
      const press = (label: string) => {
        let node: ReactTestRenderer.ReactTestInstance | null = root.root.find(
          n => n.children.length === 1 && n.children[0] === label,
        );
        while (node && typeof node.props.onPress !== 'function') {
          node = node.parent;
        }
        ReactTestRenderer.act(() => node!.props.onPress());
      };
      press('Корм');
      press('КУПИТЬ');
      expect(onBuy).toHaveBeenCalled();
      const text = texts(root);
      expect(text).not.toContain('Купил');
      expect(text).toContain('Кошелёк');
    });
  });
});
