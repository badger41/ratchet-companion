import { HEX_BYTE_WIDTH, HEX_GROUP_GAP } from '../constants';
import type { HexGroup, HexRow } from '../types';
import { formatAscii, formatByte } from './format';

export function createRows(
  bytes: Uint8Array,
  bytesPerRow: number,
  groupSize: number,
) {
  const rows: HexRow[] = [];

  for (let offset = 0; offset < bytes.byteLength; offset += bytesPerRow) {
    const rowEnd = Math.min(offset + bytesPerRow, bytes.byteLength);
    const ascii = formatAscii(bytes, offset, rowEnd).padEnd(bytesPerRow, ' ');
    rows.push({
      offset,
      groups: createHexGroups(bytes, offset, rowEnd, bytesPerRow, groupSize),
      ascii,
    });
  }

  return rows;
}

export function getRowCount(byteCount: number, bytesPerRow: number) {
  return byteCount === 0 ? 0 : Math.ceil(byteCount / bytesPerRow);
}

export function getAddressWidth(byteCount: number) {
  return Math.max(4, Math.max(0, byteCount - 1).toString(16).length);
}

export function getHexColumnWidth(bytesPerRow: number, groupSize: number) {
  const groupCount = Math.ceil(bytesPerRow / groupSize);
  return (
    bytesPerRow * HEX_BYTE_WIDTH + Math.max(0, groupCount - 1) * HEX_GROUP_GAP
  );
}

function createHexGroups(
  bytes: Uint8Array,
  rowOffset: number,
  rowEnd: number,
  bytesPerRow: number,
  groupSize: number,
) {
  const groups: HexGroup[] = [];
  const rowByteCount = rowEnd - rowOffset;

  for (let offset = 0; offset < bytesPerRow; offset += groupSize) {
    const groupByteCount = Math.max(
      0,
      Math.min(groupSize, rowByteCount - offset),
    );
    let text = '';

    for (let index = groupByteCount - 1; index >= 0; index--) {
      text += formatByte(bytes[rowOffset + offset + index]);
    }

    if (groupByteCount < groupSize) {
      text += ''.padEnd((groupSize - groupByteCount) * HEX_BYTE_WIDTH, ' ');
    }

    groups.push({ text });
  }

  return groups;
}
