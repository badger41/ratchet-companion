import { memo, useCallback, useState, type MouseEvent } from 'react';
import { HexGridText } from './HexGridText';
import { HexHighlightOverlay } from './HexHighlightOverlay';
import { HexTooltip } from './HexTooltip';
import type {
  HexByteHighlightRange,
  HexRow,
  HexTooltipState,
  HighlightShape,
} from './types';
import { findHighlightAtPoint } from './utils/hitTesting';
import { clamp } from './utils/math';

export const HexByteGrid = memo(function HexByteGrid({
  rows,
  rowCount,
  highlightShapes,
  highlights,
  hexColumnWidth,
}: {
  rows: HexRow[];
  rowCount: number;
  highlightShapes: HighlightShape[];
  highlights: HexByteHighlightRange[];
  hexColumnWidth: number;
}) {
  const [tooltip, setTooltip] = useState<HexTooltipState | null>(null);

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      const highlight = findHighlightAtPoint({
        localX,
        localY,
        bounds,
        rowCount,
        columnWidth: hexColumnWidth,
        shapes: highlightShapes,
        highlights,
      });

      if (!highlight) {
        setTooltip(null);
        return;
      }

      const nextTooltip: HexTooltipState = {
        label: highlight.label,
        x: clamp(localX, 12, Math.max(12, bounds.width - 12)),
        y: clamp(localY, 0, bounds.height),
        placement: localY > 32 ? 'above' : 'below',
      };
      setTooltip((current) =>
        current?.label === nextTooltip.label &&
        current.x === nextTooltip.x &&
        current.y === nextTooltip.y &&
        current.placement === nextTooltip.placement
          ? current
          : nextTooltip,
      );
    },
    [hexColumnWidth, highlightShapes, highlights, rowCount],
  );

  return (
    <div
      className="hex-byte-grid"
      style={{ width: `${hexColumnWidth}ch` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      <HexHighlightOverlay
        rowCount={rowCount}
        columnWidth={hexColumnWidth}
        shapes={highlightShapes}
      />
      <HexGridText rows={rows} />
      {tooltip ? <HexTooltip tooltip={tooltip} /> : null}
    </div>
  );
});
