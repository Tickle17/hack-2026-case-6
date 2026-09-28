/**
 * Форма темы. Брендбук заказчика заполняет значения, не меняя эту форму.
 * См. docs/integration-contracts.md, раздел 1.
 *
 * Форма учитывает shape language Duolingo: у каждого «объёмного» цвета есть
 * парный тёмный уступ (shadow), иначе фирменную 3D-кнопку не собрать.
 * Правило: shadow = базовый цвет, затемнённый на 12–15%.
 */
export type ThemeContract = {
  /** pixel-baseline — целевой стиль до брендбука; brand — палитра заказчика. */
  kind: 'duolingo-baseline' | 'pixel-baseline' | 'brand';
  scheme: 'light' | 'dark';
  color: {
    bg: string;
    surface: string;
    surfaceElevated: string;
    border: string;

    text: {
      primary: string;
      secondary: string;
      muted: string;
      onColor: string;
    };

    /** Бренд/успех — главное действие и «всё хорошо». */
    brand: string;
    brandShadow: string;
    brandSoft: string;

    red: string;
    redShadow: string;
    amber: string;
    amberShadow: string;
    orange: string;
    orangeShadow: string;
    cyan: string;
    cyanShadow: string;
    violet: string;
    violetShadow: string;

    /** Монеты. */
    coin: string;
    coinShadow: string;

    /** Полосы потребностей питомца. */
    /**
     * Школьная доска. В теме, а не в компоненте: по правилам проекта
     * цвета не живут в вёрстке, и при смене оформления доска должна
     * поменяться вместе со всем остальным.
     */
    board: { surface: string; frame: string; tray: string; chalk: string };
    need: { satiety: string; mood: string; cleanliness: string };
  };
  /**
   * Два семейства вместо fontWeight: Android не меняет вес вариативного
   * шрифта и молча откатывается на системный. Начертания подключены
   * отдельными файлами (tools/assets/prepare_fonts.py).
   */
  font: { regular: string; bold: string };
  text: Record<
    'display' | 'title' | 'body' | 'caption' | 'button',
    { fontSize: number; lineHeight: number; bold: boolean }
  >;
  space: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl', number>;
  radius: Record<'sm' | 'md' | 'lg' | 'xl' | 'pill', number>;
  /** Инвариант проекта: минимальный тач-таргет для детской руки. */
  touchTarget: { min: number };
};
