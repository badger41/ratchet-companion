import { memo } from 'react';
import { HEX_ROW_HEIGHT, HIGHLIGHT_COLORS } from './constants';
import type { HighlightShape } from './types';

export const HexHighlightOverlay = memo(function HexHighlightOverlay({
  rowCount,
  columnWidth,
  shapes,
}: {
  rowCount: number;
  columnWidth: number;
  shapes: HighlightShape[];
}) {
  if (shapes.length === 0) {
    return null;
  }

  return (
    <svg
      className="hex-byte-highlight-overlay"
      viewBox={`0 0 ${columnWidth} ${rowCount * HEX_ROW_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        width: `${columnWidth}ch`,
        height: `${rowCount * HEX_ROW_HEIGHT}px`,
      }}
    >
      {shapes.map((shape) => {
        const color =
          HIGHLIGHT_COLORS[shape.highlightIndex % HIGHLIGHT_COLORS.length];
        const rgb = `${color[0]}, ${color[1]}, ${color[2]}`;

        return (
          <g key={shape.highlightIndex}>
            <path
              d={shape.fillPath}
              fill={`rgba(${rgb}, 0.26)`}
              pointerEvents="none"
            />
            <path
              d={shape.strokePath}
              fill="none"
              stroke={`rgb(${rgb})`}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="miter"
              strokeLinecap="square"
              shapeRendering="geometricPrecision"
              pointerEvents="none"
            />
          </g>
        );
      })}
    </svg>
  );
});
