import type { HighlightInterval, HighlightRect } from '../types';
import { formatCoordinate } from './math';

export function mergeIntervals(intervals: HighlightInterval[], maxGap: number) {
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged: HighlightInterval[] = [];

  sorted.forEach((interval) => {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end + maxGap) {
      previous.end = Math.max(previous.end, interval.end);
      return;
    }

    merged.push({ ...interval });
  });

  return merged;
}

export function createFillPath(rects: HighlightRect[]) {
  return rects.map(rectToPath).join(' ');
}

export function createStrokePath(
  rects: HighlightRect[],
  shouldDrawVerticalStroke: (x: number, y1: number, y2: number) => boolean,
) {
  const xBoundaries = getRectBoundaries(rects, (rect) => [
    rect.x,
    rect.x + rect.width,
  ]);
  const yBoundaries = getRectBoundaries(rects, (rect) => [
    rect.y,
    rect.y + rect.height,
  ]);
  const occupiedCells = createOccupiedCellSet(rects, xBoundaries, yBoundaries);
  const horizontalLines = new Map<string, HighlightInterval[]>();
  const verticalLines = new Map<string, HighlightInterval[]>();

  occupiedCells.forEach((cellKey) => {
    const [xIndex, yIndex] = cellKey.split(',').map(Number);
    const x1 = xBoundaries[xIndex];
    const x2 = xBoundaries[xIndex + 1];
    const y1 = yBoundaries[yIndex];
    const y2 = yBoundaries[yIndex + 1];

    if (!occupiedCells.has(createCellKey(xIndex, yIndex - 1))) {
      addLineInterval(horizontalLines, y1, x1, x2);
    }

    if (!occupiedCells.has(createCellKey(xIndex, yIndex + 1))) {
      addLineInterval(horizontalLines, y2, x1, x2);
    }

    if (
      !occupiedCells.has(createCellKey(xIndex - 1, yIndex)) &&
      shouldDrawVerticalStroke(x1, y1, y2)
    ) {
      addLineInterval(verticalLines, x1, y1, y2);
    }

    if (
      !occupiedCells.has(createCellKey(xIndex + 1, yIndex)) &&
      shouldDrawVerticalStroke(x2, y1, y2)
    ) {
      addLineInterval(verticalLines, x2, y1, y2);
    }
  });

  return createMergedStrokePath(horizontalLines, verticalLines);
}

export function isPointInsideRect(x: number, y: number, rect: HighlightRect) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

function rectToPath(rect: HighlightRect) {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  return `M ${rect.x} ${rect.y} H ${right} V ${bottom} H ${rect.x} Z`;
}

function getRectBoundaries(
  rects: HighlightRect[],
  getBoundaries: (rect: HighlightRect) => number[],
) {
  return Array.from(
    new Set(rects.flatMap((rect) => getBoundaries(rect).map(formatCoordinate))),
  )
    .map(Number)
    .sort((left, right) => left - right);
}

function createOccupiedCellSet(
  rects: HighlightRect[],
  xBoundaries: number[],
  yBoundaries: number[],
) {
  const occupiedCells = new Set<string>();

  for (let xIndex = 0; xIndex < xBoundaries.length - 1; xIndex++) {
    const x = (xBoundaries[xIndex] + xBoundaries[xIndex + 1]) / 2;

    for (let yIndex = 0; yIndex < yBoundaries.length - 1; yIndex++) {
      const y = (yBoundaries[yIndex] + yBoundaries[yIndex + 1]) / 2;
      if (rects.some((rect) => isPointInsideRect(x, y, rect))) {
        occupiedCells.add(createCellKey(xIndex, yIndex));
      }
    }
  }

  return occupiedCells;
}

function createCellKey(xIndex: number, yIndex: number) {
  return `${xIndex},${yIndex}`;
}

function addLineInterval(
  lines: Map<string, HighlightInterval[]>,
  key: number,
  start: number,
  end: number,
) {
  const intervals = lines.get(formatCoordinate(key)) ?? [];
  intervals.push({ start, end });
  lines.set(formatCoordinate(key), intervals);
}

function createMergedStrokePath(
  horizontalLines: Map<string, HighlightInterval[]>,
  verticalLines: Map<string, HighlightInterval[]>,
) {
  const horizontalPaths = Array.from(horizontalLines.entries()).flatMap(
    ([y, intervals]) =>
      mergeTouchingIntervals(intervals).map(
        (interval) => `M ${interval.start} ${y} H ${interval.end}`,
      ),
  );
  const verticalPaths = Array.from(verticalLines.entries()).flatMap(
    ([x, intervals]) =>
      mergeTouchingIntervals(intervals).map(
        (interval) => `M ${x} ${interval.start} V ${interval.end}`,
      ),
  );

  return [...horizontalPaths, ...verticalPaths].join(' ');
}

function mergeTouchingIntervals(intervals: HighlightInterval[]) {
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged: HighlightInterval[] = [];

  sorted.forEach((interval) => {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end + 0.001) {
      previous.end = Math.max(previous.end, interval.end);
      return;
    }

    merged.push({ ...interval });
  });

  return merged;
}
