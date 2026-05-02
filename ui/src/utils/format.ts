export function formatHex(value: number, width: number) {
  return `0x${value.toString(16).toUpperCase().padStart(width, '0')}`;
}

export function formatPointer(value: number) {
  return formatHex(value, 8);
}

export function formatOClass(value: number) {
  return formatHex(value, 4);
}

export function formatCoordinate(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(3)
    : '—';
}
