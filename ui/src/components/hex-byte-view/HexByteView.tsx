import { Box } from '@cloudscape-design/components';
import { useMemo } from 'react';
import { HEX_FONT_SIZE, HEX_ROW_HEIGHT } from './constants';
import { HexAddressColumn } from './HexAddressColumn';
import { HexAsciiColumn } from './HexAsciiColumn';
import { HexByteGrid } from './HexByteGrid';
import type { HexByteHighlightRange, HexByteViewProps } from './types';
import { createHighlightMap } from './utils/highlightMap';
import { createHighlightShapes } from './utils/highlightShapes';
import {
  createRows,
  getAddressWidth,
  getHexColumnWidth,
  getRowCount,
} from './utils/layout';
import './hex-byte-view.css';

const EMPTY_HIGHLIGHTS: HexByteHighlightRange[] = [];

export function HexByteView({
  bytes,
  highlights: providedHighlights,
  bytesPerRow = 16,
  groupSize = 4,
}: HexByteViewProps) {
  const highlights = providedHighlights ?? EMPTY_HIGHLIGHTS;
  const byteCount = bytes?.byteLength ?? 0;

  const rows = useMemo(
    () => (bytes ? createRows(bytes, bytesPerRow, groupSize) : []),
    [bytes, bytesPerRow, groupSize],
  );
  const rowCount = useMemo(
    () => getRowCount(byteCount, bytesPerRow),
    [byteCount, bytesPerRow],
  );
  const addressWidth = useMemo(() => getAddressWidth(byteCount), [byteCount]);
  const hexColumnWidth = useMemo(
    () => getHexColumnWidth(bytesPerRow, groupSize),
    [bytesPerRow, groupSize],
  );
  const highlightMap = useMemo(
    () => createHighlightMap(byteCount, highlights),
    [byteCount, highlights],
  );
  const highlightShapes = useMemo(
    () =>
      createHighlightShapes(byteCount, highlightMap, bytesPerRow, groupSize),
    [byteCount, highlightMap, bytesPerRow, groupSize],
  );

  if (!bytes) {
    return (
      <Box color="text-status-inactive" fontSize="body-s">
        Waiting for bytes...
      </Box>
    );
  }

  if (bytes.byteLength === 0) {
    return (
      <Box color="text-status-inactive" fontSize="body-s">
        No bytes available.
      </Box>
    );
  }

  return (
    <div
      className="hex-byte-view"
      style={{
        maxHeight: '45vh',
        overflow: 'auto',
        border: '1px solid rgba(129, 151, 184, 0.35)',
        borderRadius: '6px',
        background: 'rgba(7, 13, 22, 0.7)',
      }}
    >
      <div
        style={{
          padding: '12px',
          fontFamily:
            'ui-monospace, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
          fontSize: `${HEX_FONT_SIZE}px`,
          lineHeight: `${HEX_ROW_HEIGHT}px`,
          whiteSpace: 'pre',
        }}
      >
        <div style={{ display: 'flex' }}>
          <HexAddressColumn
            rowCount={rowCount}
            addressWidth={addressWidth}
            bytesPerRow={bytesPerRow}
          />
          <span style={{ flex: '0 0 auto' }}>&nbsp;&nbsp;</span>
          <HexByteGrid
            rows={rows}
            rowCount={rowCount}
            highlightShapes={highlightShapes}
            highlights={highlights}
            hexColumnWidth={hexColumnWidth}
          />
          <span style={{ flex: '0 0 auto' }}>&nbsp;&nbsp;</span>
          <HexAsciiColumn rows={rows} />
        </div>
      </div>
    </div>
  );
}
