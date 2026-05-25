import { Box } from '@cloudscape-design/components';
import { useMemo, type CSSProperties } from 'react';

export type HexByteHighlightRange = {
  offset: number;
  byteCount: number;
  label: string;
};

type HexByteViewProps = {
  bytes: Uint8Array | null;
  highlights?: HexByteHighlightRange[];
  bytesPerRow?: number;
  groupSize?: number;
};

export function HexByteView({
  bytes,
  highlights = [],
  bytesPerRow = 16,
  groupSize = 4,
}: HexByteViewProps) {
  const rows = useMemo(() => {
    if (!bytes) {
      return [];
    }

    const highlightMap = createHighlightMap(bytes.byteLength, highlights);
    return createRows(bytes, bytesPerRow, groupSize, highlightMap);
  }, [bytes, bytesPerRow, groupSize, highlights]);

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
          fontSize: '12px',
          lineHeight: 1.55,
          whiteSpace: 'pre',
        }}
      >
        {rows.map((row) => (
          <div key={row.offset} style={{ display: 'flex' }}>
            <span style={{ color: '#8EA4C8', flex: '0 0 auto' }}>
              {formatHex(row.offset, row.addressWidth)}
            </span>
            <span style={{ flex: '0 0 auto' }}>&nbsp;&nbsp;</span>
            <span style={{ flex: '0 0 auto' }}>
              {row.groups.map((group, groupIndex) => (
                <span key={`${row.offset}-${groupIndex}`}>
                  {groupIndex > 0 ? '  ' : null}
                  {group.segments.map((segment, segmentIndex) => (
                    <HexSegment
                      key={`${row.offset}-${groupIndex}-${segmentIndex}`}
                      segment={segment}
                      highlights={highlights}
                    />
                  ))}
                </span>
              ))}
            </span>
            <span style={{ flex: '0 0 auto' }}>&nbsp;&nbsp;|{row.ascii}|</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type HexRow = {
  offset: number;
  addressWidth: number;
  groups: HexGroup[];
  ascii: string;
};

type HexGroup = {
  segments: HexSegmentData[];
};

type HexSegmentData = {
  text: string;
  highlightIndex: number | null;
};

const HIGHLIGHT_COLORS: Array<[number, number, number]> = [
  [255, 214, 102],
  [255, 153, 153],
  [145, 213, 255],
  [183, 235, 143],
  [255, 173, 210],
  [179, 127, 235],
  [135, 232, 222],
  [255, 187, 150],
  [191, 191, 191],
  [105, 192, 255],
  [255, 236, 61],
  [149, 222, 100],
  [255, 133, 192],
  [211, 173, 247],
  [92, 219, 211],
  [255, 192, 105],
  [255, 120, 117],
  [64, 169, 255],
  [186, 230, 55],
  [255, 112, 67],
  [151, 95, 228],
  [54, 207, 201],
  [250, 173, 20],
  [168, 168, 168],
  [24, 144, 255],
  [250, 219, 20],
  [115, 209, 61],
  [235, 47, 150],
  [146, 84, 222],
  [19, 194, 194],
  [250, 140, 22],
  [245, 34, 45],
  [47, 84, 235],
  [124, 179, 66],
  [216, 27, 96],
  [94, 53, 177],
  [0, 150, 136],
  [239, 108, 0],
  [117, 117, 117],
  [3, 169, 244],
  [251, 192, 45],
  [139, 195, 74],
  [236, 64, 122],
  [126, 87, 194],
  [38, 166, 154],
  [255, 167, 38],
  [229, 57, 53],
  [57, 73, 171],
  [104, 159, 56],
  [198, 40, 40],
];

function createRows(
  bytes: Uint8Array,
  bytesPerRow: number,
  groupSize: number,
  highlightMap: Int32Array,
) {
  const rows: HexRow[] = [];
  const addressWidth = Math.max(4, (bytes.byteLength - 1).toString(16).length);

  for (let offset = 0; offset < bytes.byteLength; offset += bytesPerRow) {
    const rowBytes = bytes.slice(offset, offset + bytesPerRow);
    const ascii = formatAscii(rowBytes).padEnd(bytesPerRow, ' ');
    rows.push({
      offset,
      addressWidth,
      groups: createHexGroups(
        rowBytes,
        offset,
        bytesPerRow,
        groupSize,
        highlightMap,
      ),
      ascii,
    });
  }

  return rows;
}

function createHexGroups(
  rowBytes: Uint8Array,
  rowOffset: number,
  bytesPerRow: number,
  groupSize: number,
  highlightMap: Int32Array,
) {
  const groups: HexGroup[] = [];

  for (let offset = 0; offset < bytesPerRow; offset += groupSize) {
    const groupBytes = Array.from(
      rowBytes.slice(offset, offset + groupSize),
    ).map((byte, byteIndex) => ({
      absoluteOffset: rowOffset + offset + byteIndex,
      byte,
    }));
    const displayBytes = [...groupBytes].reverse();
    const segments: HexSegmentData[] = [];
    let currentHighlight: number | null = null;
    let currentText = '';

    displayBytes.forEach(({ absoluteOffset, byte }) => {
      const highlightIndex = highlightMap[absoluteOffset];
      const nextHighlight = highlightIndex >= 0 ? highlightIndex : null;

      if (currentHighlight !== nextHighlight && currentText.length > 0) {
        segments.push({
          text: currentText,
          highlightIndex: currentHighlight,
        });
        currentText = '';
      }

      currentHighlight = nextHighlight;
      currentText += formatByte(byte);
    });

    if (currentText.length > 0) {
      segments.push({
        text: currentText,
        highlightIndex: currentHighlight,
      });
    }

    if (groupBytes.length < groupSize) {
      segments.push({
        text: ''.padEnd((groupSize - groupBytes.length) * 2, ' '),
        highlightIndex: null,
      });
    }

    groups.push({ segments });
  }

  return groups;
}

function HexSegment({
  segment,
  highlights,
}: {
  segment: HexSegmentData;
  highlights: HexByteHighlightRange[];
}) {
  if (segment.highlightIndex === null) {
    return <span>{segment.text}</span>;
  }

  const highlight = highlights[segment.highlightIndex];
  const color =
    HIGHLIGHT_COLORS[segment.highlightIndex % HIGHLIGHT_COLORS.length];
  const rgb = `${color[0]}, ${color[1]}, ${color[2]}`;

  return (
    <span
      className="hex-byte-highlight"
      title={highlight?.label ?? 'Mapped pvar data'}
      style={{ '--hex-highlight-rgb': rgb } as CSSProperties}
    >
      {segment.text}
    </span>
  );
}

function createHighlightMap(
  byteCount: number,
  highlights: HexByteHighlightRange[],
) {
  const map = new Int32Array(byteCount);
  map.fill(-1);

  highlights.forEach((highlight, highlightIndex) => {
    const start = Math.max(0, highlight.offset);
    const end = Math.min(byteCount, highlight.offset + highlight.byteCount);

    for (let offset = start; offset < end; offset++) {
      if (map[offset] === -1) {
        map[offset] = highlightIndex;
      }
    }
  });

  return map;
}

function formatAscii(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) =>
      byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.',
    )
    .join('');
}

function formatHex(value: number, width: number) {
  return `0x${value.toString(16).toUpperCase().padStart(width, '0')}`;
}

function formatByte(value: number) {
  return value.toString(16).toUpperCase().padStart(2, '0');
}
