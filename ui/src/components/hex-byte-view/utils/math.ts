export function formatCoordinate(value: number) {
  return Number(value.toFixed(3)).toString();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
