export type HexByteHighlightRange = {
  offset: number;
  byteCount: number;
  label: string;
};

export type HexByteViewProps = {
  bytes: Uint8Array | null;
  highlights?: HexByteHighlightRange[];
  bytesPerRow?: number;
  groupSize?: number;
};

export type HexRow = {
  offset: number;
  groups: HexGroup[];
  ascii: string;
};

export type HexGroup = {
  text: string;
};

export type HighlightShape = {
  highlightIndex: number;
  fillPath: string;
  strokePath: string;
  rects: HighlightRect[];
};

export type HighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HighlightInterval = {
  start: number;
  end: number;
};

export type BytePosition = {
  row: number;
  x: number;
};

export type HexTooltipState = {
  label: string;
  x: number;
  y: number;
  placement: 'above' | 'below';
};
