import {
  HEX_BYTE_WIDTH,
  HEX_GROUP_GAP,
  HEX_HIGHLIGHT_HEIGHT,
  HEX_HIGHLIGHT_X_PADDING,
  HEX_HIGHLIGHT_Y_OFFSET,
  HEX_ROW_HEIGHT,
} from '../constants';
import type {
  BytePosition,
  HighlightInterval,
  HighlightRect,
  HighlightShape,
} from '../types';
import {
  createFillPath,
  createStrokePath,
  mergeIntervals,
} from './rectGeometry';

export function createHighlightShapes(
  byteCount: number,
  highlightMap: Int32Array,
  bytesPerRow: number,
  groupSize: number,
) {
  const shapes: HighlightShape[] = [];
  const { globalIntervalsByRow, intervalsByHighlight } =
    createHighlightIntervals(byteCount, highlightMap, bytesPerRow, groupSize);

  Array.from(intervalsByHighlight.entries())
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .forEach(([highlightIndex, intervalsByRow]) => {
      const rowRectsByRow = new Map<number, HighlightRect[]>();
      const rowRects = Array.from(intervalsByRow.entries()).flatMap(
        ([row, intervals]) => {
          const rects = mergeIntervals(intervals, HEX_GROUP_GAP).map(
            (interval) =>
              createHighlightRect(interval, row, globalIntervalsByRow),
          );

          rowRectsByRow.set(row, rects);
          return rects;
        },
      );
      const rects = [...rowRects, ...createRowConnectorRects(rowRectsByRow)];

      shapes.push({
        highlightIndex,
        fillPath: createFillPath(rects),
        strokePath: createStrokePath(rects, (x, y1, y2) =>
          shouldDrawVerticalStroke(x, y1, y2, globalIntervalsByRow, groupSize),
        ),
        rects,
      });
    });

  return shapes;
}

function createHighlightIntervals(
  byteCount: number,
  highlightMap: Int32Array,
  bytesPerRow: number,
  groupSize: number,
) {
  const intervalsByHighlight = new Map<
    number,
    Map<number, HighlightInterval[]>
  >();
  const globalIntervals = new Map<number, HighlightInterval[]>();

  for (let offset = 0; offset < byteCount; offset++) {
    const highlightIndex = highlightMap[offset];
    if (highlightIndex < 0) {
      continue;
    }

    const position = getBytePosition(offset, bytesPerRow, groupSize);
    const interval = {
      start: position.x,
      end: position.x + HEX_BYTE_WIDTH,
    };
    const intervalsByRow =
      intervalsByHighlight.get(highlightIndex) ??
      new Map<number, HighlightInterval[]>();
    const rowIntervals = intervalsByRow.get(position.row) ?? [];
    const globalRowIntervals = globalIntervals.get(position.row) ?? [];

    rowIntervals.push(interval);
    globalRowIntervals.push(interval);
    intervalsByRow.set(position.row, rowIntervals);
    intervalsByHighlight.set(highlightIndex, intervalsByRow);
    globalIntervals.set(position.row, globalRowIntervals);
  }

  return {
    intervalsByHighlight,
    globalIntervalsByRow: mergeGlobalIntervals(globalIntervals),
  };
}

function mergeGlobalIntervals(
  intervalsByRow: Map<number, HighlightInterval[]>,
) {
  return new Map(
    Array.from(intervalsByRow.entries()).map(([row, intervals]) => [
      row,
      mergeIntervals(intervals, 0),
    ]),
  );
}

function getBytePosition(
  offset: number,
  bytesPerRow: number,
  groupSize: number,
): BytePosition {
  const row = Math.floor(offset / bytesPerRow);
  const localOffset = offset % bytesPerRow;
  const groupIndex = Math.floor(localOffset / groupSize);
  const byteIndex = localOffset % groupSize;
  const visualByteIndex = groupSize - byteIndex - 1;
  const groupWidth = groupSize * HEX_BYTE_WIDTH + HEX_GROUP_GAP;

  return {
    row,
    x: groupIndex * groupWidth + visualByteIndex * HEX_BYTE_WIDTH,
  };
}

function createHighlightRect(
  interval: HighlightInterval,
  row: number,
  globalIntervalsByRow: Map<number, HighlightInterval[]>,
): HighlightRect {
  const y = getHighlightRowTop(row);
  const centerY = y + HEX_HIGHLIGHT_HEIGHT / 2;
  const leftPadding = hasHighlightedInteriorOnBothSides(
    interval.start,
    centerY,
    globalIntervalsByRow,
  )
    ? 0
    : HEX_HIGHLIGHT_X_PADDING;
  const rightPadding = hasHighlightedInteriorOnBothSides(
    interval.end,
    centerY,
    globalIntervalsByRow,
  )
    ? 0
    : HEX_HIGHLIGHT_X_PADDING;

  return {
    x: interval.start - leftPadding,
    y,
    width: interval.end - interval.start + leftPadding + rightPadding,
    height: HEX_HIGHLIGHT_HEIGHT,
  };
}

function hasHighlightedInteriorOnBothSides(
  x: number,
  y: number,
  globalIntervalsByRow: Map<number, HighlightInterval[]>,
) {
  const row = getHighlightRowAtY(y);
  if (row === null) {
    return false;
  }

  const intervals = globalIntervalsByRow.get(row) ?? [];
  return (
    intervals.some(
      (interval) => interval.start <= x - 1 && interval.end >= x,
    ) &&
    intervals.some((interval) => interval.start <= x && interval.end >= x + 1)
  );
}

function shouldDrawVerticalStroke(
  x: number,
  y1: number,
  y2: number,
  globalIntervalsByRow: Map<number, HighlightInterval[]>,
  groupSize: number,
) {
  return (
    !hasHighlightedInteriorOnBothSides(
      x,
      (y1 + y2) / 2,
      globalIntervalsByRow,
    ) || isDwordEdge(x, groupSize)
  );
}

function isDwordEdge(x: number, groupSize: number) {
  const groupWidth = groupSize * HEX_BYTE_WIDTH + HEX_GROUP_GAP;
  const groupTextWidth = groupSize * HEX_BYTE_WIDTH;
  const localX = ((x % groupWidth) + groupWidth) % groupWidth;

  return (
    localX <= HEX_HIGHLIGHT_X_PADDING + 0.001 ||
    localX >= groupWidth - HEX_HIGHLIGHT_X_PADDING - 0.001 ||
    Math.abs(localX - groupTextWidth) <= HEX_HIGHLIGHT_X_PADDING + 0.001
  );
}

function createRowConnectorRects(rectsByRow: Map<number, HighlightRect[]>) {
  const connectors: HighlightRect[] = [];

  rectsByRow.forEach((rects, row) => {
    const nextRowRects = rectsByRow.get(row + 1);
    if (!nextRowRects) {
      return;
    }

    rects.forEach((rect) => {
      nextRowRects.forEach((nextRect) => {
        const start = Math.max(rect.x, nextRect.x);
        const end = Math.min(rect.x + rect.width, nextRect.x + nextRect.width);
        if (start >= end) {
          return;
        }

        const y = rect.y + rect.height;
        connectors.push({
          x: start,
          y,
          width: end - start,
          height: nextRect.y - y,
        });
      });
    });
  });

  return connectors;
}

function getHighlightRowTop(row: number) {
  return row * HEX_ROW_HEIGHT + HEX_HIGHLIGHT_Y_OFFSET;
}

function getHighlightRowAtY(y: number) {
  const row = Math.floor(y / HEX_ROW_HEIGHT);
  const localY = y - row * HEX_ROW_HEIGHT;
  const top = HEX_HIGHLIGHT_Y_OFFSET;
  const bottom = HEX_HIGHLIGHT_Y_OFFSET + HEX_HIGHLIGHT_HEIGHT;

  return localY >= top && localY <= bottom ? row : null;
}
