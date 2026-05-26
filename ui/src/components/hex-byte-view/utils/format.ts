export function formatAscii(
  bytes: Uint8Array,
  start = 0,
  end = bytes.byteLength,
) {
  let text = '';

  for (let index = start; index < end; index++) {
    const byte = bytes[index];
    text += byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.';
  }

  return text;
}

export function formatHex(value: number, width: number) {
  return `0x${value.toString(16).toUpperCase().padStart(width, '0')}`;
}

export function formatByte(value: number) {
  return value.toString(16).toUpperCase().padStart(2, '0');
}
