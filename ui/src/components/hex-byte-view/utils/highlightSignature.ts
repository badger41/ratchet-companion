import type { HexByteHighlightRange } from '../types';

export function createHighlightLayoutSignature(
  highlights: HexByteHighlightRange[],
) {
  let signature = `${highlights.length}`;

  highlights.forEach((highlight) => {
    signature += `|${highlight.offset}:${highlight.byteCount}`;
  });

  return signature;
}
