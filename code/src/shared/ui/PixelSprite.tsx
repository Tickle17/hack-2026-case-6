import React, { useMemo } from 'react';
import { View } from 'react-native';

/**
 * Пиксельный спрайт из сетки-данных.
 *
 * Почему не PNG: RN на Android масштабирует картинки со сглаживанием, и
 * пиксель-арт превращается в кашу. Здесь каждый пиксель — прямоугольник,
 * поэтому он остаётся ровным при любом масштабе.
 *
 * Чтобы не плодить тысячи View, соседние пиксели одного цвета в строке
 * склеиваются в один прямоугольник (run-length). Спрайт 32×32 обычно
 * даёт 60–120 прямоугольников вместо 1024.
 *
 * Формат: массив строк, символ = цвет из палитры, '.' = прозрачно.
 * Спрайт — данные; появятся ассеты от дизайнера — меняется только этот
 * компонент, см. docs/integration-contracts.md.
 */

export type PixelGrid = {
  rows: string[];
  palette: Record<string, string>;
};

export type PixelSpriteProps = {
  grid: PixelGrid;
  /** Размер одного пикселя в dp. Только целые числа — иначе спрайт «дрожит». */
  scale?: number;
  /** Подмена цветов палитры (кастомизация питомца). */
  recolor?: Record<string, string>;
};

type Run = { x: number; width: number; color: string };

function toRuns(rows: string[], palette: Record<string, string>): Run[][] {
  return rows.map(row => {
    const runs: Run[] = [];
    let start = 0;
    while (start < row.length) {
      const ch = row[start];
      let end = start;
      while (end + 1 < row.length && row[end + 1] === ch) {
        end++;
      }
      const color = palette[ch];
      if (color) {
        runs.push({ x: start, width: end - start + 1, color });
      }
      start = end + 1;
    }
    return runs;
  });
}

export function PixelSprite({ grid, scale = 4, recolor }: PixelSpriteProps) {
  const px = Math.max(1, Math.round(scale));
  const palette = useMemo(
    () => ({ ...grid.palette, ...recolor }),
    [grid.palette, recolor],
  );
  const runs = useMemo(() => toRuns(grid.rows, palette), [grid.rows, palette]);

  const width = (grid.rows[0]?.length ?? 0) * px;
  const height = grid.rows.length * px;

  return (
    <View style={{ width, height }}>
      {runs.map((rowRuns, y) =>
        rowRuns.map((run, i) => (
          <View
            key={`${y}-${i}`}
            style={{
              position: 'absolute',
              left: run.x * px,
              top: y * px,
              width: run.width * px,
              height: px,
              backgroundColor: run.color,
            }}
          />
        )),
      )}
    </View>
  );
}
