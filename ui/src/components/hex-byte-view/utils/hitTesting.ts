import { HEX_ROW_HEIGHT } from '../constants';
import type { HexByteHighlightRange, HighlightShape } from '../types';
import { isPointInsideRect } from './rectGeometry';

export function findHighlightAtPoint({
  localX,
  localY,
  bounds,
  rowCount,
  columnWidth,
  shapes,
  highlights,
}: {
  localX: number;
  localY: number;
  bounds: DOMRect;
  rowCount: number;
  columnWidth: number;
  shapes: HighlightShape[];
  highlights: HexByteHighlightRange[];
}) {
  if (bounds.width <= 0 || bounds.height <= 0 || rowCount <= 0) {
    return null;
  }

  const svgX = (localX / bounds.width) * columnWidth;
  const svgY = (localY / bounds.height) * rowCount * HEX_ROW_HEIGHT;
  let shape: HighlightShape | null = null;

  for (let index = shapes.length - 1; index >= 0; index--) {
    const candidate = shapes[index];
    if (candidate.rects.some((rect) => isPointInsideRect(svgX, svgY, rect))) {
      shape = candidate;
      break;
    }
  }

  if (!shape) {
    return null;
  }

  const label = highlights[shape.highlightIndex]?.label;
  return label ? { label } : null;
}
