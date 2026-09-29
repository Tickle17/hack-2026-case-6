import { ITEMS } from '../config/registries';
import { GOALS } from '../config/goals';
import { createInitialState } from './state';
import { purchaseFeedback, savingsFeedback } from './feedback';
import type { GameState } from '../model/types';

const treat = ITEMS.find(
  i => i.kind === 'treat' && i.category === 'want' && i.effect,
)!;
const consumable = ITEMS.find(i => i.kind === 'consumable' && i.effect)!;
const goal = GOALS[0];

const withPet = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState('start'),
  petName: 'Финни',
  ...over,
});

describe('purchaseFeedback', () => {
  // ТЗ 2.5.9: после траты видно, сколько ушло и что стало с питомцем.
  it('names the price and what the treat did to the pet', () => {
    const text = purchaseFeedback(treat, withPet());

    expect(text).toContain(`−${treat.price}`);
    expect(text).toContain('Финни');
    expect(text).toContain(`+${treat.effect!.amount}`);
  });

  // Расходник действует, когда им воспользуются, — обещать эффект сразу было бы неправдой.
  it('tells a consumable works once it is used, not right away', () => {
    const text = purchaseFeedback(consumable, withPet());

    expect(text).toContain(`−${consumable.price}`);
    expect(text).toMatch(/[Пп]ригодится/);
  });

  // Тратят из кошелька: после покупки видно, сколько в нём осталось.
  it('shows what is left in the wallet after the purchase', () => {
    expect(purchaseFeedback(treat, withPet({ balance: 7 }))).toContain(
      'В кошельке 7',
    );
  });

  it('uses the price actually paid (sale day)', () => {
    expect(purchaseFeedback(treat, withPet(), 1)).toContain('−1.');
  });

  it('calls the pet stat «радость», as in the pet panel', () => {
    const joy = ITEMS.find(i => i.effect?.stat === 'mood')!;
    expect(purchaseFeedback(joy, withPet())).toContain('радость');
  });

  it('falls back to a neutral word when the pet has no name yet', () => {
    expect(purchaseFeedback(treat, withPet({ petName: '' }))).toContain(
      'питомец',
    );
  });
});

describe('savingsFeedback', () => {
  it('reports the deposit and what is left to the goal', () => {
    const text = savingsFeedback({
      change: 5,
      state: withPet({ goalId: goal.id, savings: 14 }),
    });

    expect(text).toContain('+5 в копилку');
    expect(text).toContain(
      `До цели «${goal.title}» осталось ${goal.price - 14}`,
    );
  });

  it('reports a withdrawal the same way', () => {
    const text = savingsFeedback({
      change: -5,
      state: withPet({ goalId: goal.id, savings: 9 }),
    });

    expect(text).toContain('−5 из копилки');
    expect(text).toContain(`осталось ${goal.price - 9}`);
  });

  it('celebrates a goal that is fully saved', () => {
    const text = savingsFeedback({
      change: 5,
      state: withPet({ goalId: goal.id, savings: goal.price }),
    });

    expect(text).toMatch(/хватает/);
  });

  it('says only the amount while no goal is chosen', () => {
    expect(
      savingsFeedback({
        change: 3,
        state: withPet({ goalId: null, savings: 3 }),
      }),
    ).toBe('+3 в копилку.');
  });

  it('says nothing for a zero change', () => {
    expect(savingsFeedback({ change: 0, state: withPet() })).toBeNull();
  });
});
