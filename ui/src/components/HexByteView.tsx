import { Box } from '@cloudscape-design/components';

type HexByteViewProps = {
  bytes: Uint8Array | null;
  bytesPerRow?: number;
  groupSize?: number;
};

export function HexByteView({
  bytes,
  bytesPerRow = 16,
  groupSize = 4,
}: HexByteViewProps) {
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

  const rows = formatRows(bytes, bytesPerRow, groupSize);

  return (
    <div
      style={{
        maxHeight: '45vh',
        overflow: 'auto',
        border: '1px solid rgba(129, 151, 184, 0.35)',
        borderRadius: '6px',
        background: 'rgba(7, 13, 22, 0.7)',
      }}
    >
      <pre
        style={{
          margin: 0,
          padding: '12px',
          fontFamily:
            'ui-monospace, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
          fontSize: '12px',
          lineHeight: 1.55,
          whiteSpace: 'pre',
        }}
      >
        {rows.join('\n')}
      </pre>
    </div>
  );
}

function formatRows(bytes: Uint8Array, bytesPerRow: number, groupSize: number) {
  const rows: string[] = [];
  const addressWidth = Math.max(4, (bytes.byteLength - 1).toString(16).length);

  for (let offset = 0; offset < bytes.byteLength; offset += bytesPerRow) {
    const rowBytes = bytes.slice(offset, offset + bytesPerRow);
    const hexGroups = formatHexGroups(rowBytes, bytesPerRow, groupSize);
    const ascii = formatAscii(rowBytes).padEnd(bytesPerRow, ' ');
    rows.push(`${formatHex(offset, addressWidth)}  ${hexGroups}  |${ascii}|`);
  }

  return rows;
}

function formatHexGroups(
  rowBytes: Uint8Array,
  bytesPerRow: number,
  groupSize: number,
) {
  const groups: string[] = [];

  for (let offset = 0; offset < bytesPerRow; offset += groupSize) {
    const groupBytes = Array.from(rowBytes.slice(offset, offset + groupSize));
    const byteCells = groupBytes.map((byte) => formatByte(byte));

    while (byteCells.length < groupSize) {
      byteCells.push('  ');
    }

    groups.push(byteCells.join(''));
  }

  return groups.join('  ');
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
