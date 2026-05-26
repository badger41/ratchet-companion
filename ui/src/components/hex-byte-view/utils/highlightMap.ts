import type { HexByteHighlightRange } from '../types';
import { createHighlightLayoutSignature } from './highlightSignature';

const HIGHLIGHT_MAP_CACHE_LIMIT = 24;
const highlightMapCache = new Map<string, Int32Array>();

export function createHighlightMap(
  byteCount: number,
  highlights: HexByteHighlightRange[],
) {
  const cacheKey = `${byteCount}:${createHighlightLayoutSignature(highlights)}`;
  const cachedMap = highlightMapCache.get(cacheKey);

  if (cachedMap) {
    return cachedMap;
  }

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

  highlightMapCache.set(cacheKey, map);
  if (highlightMapCache.size > HIGHLIGHT_MAP_CACHE_LIMIT) {
    const firstCacheKey = highlightMapCache.keys().next().value;
    if (firstCacheKey) {
      highlightMapCache.delete(firstCacheKey);
    }
  }

  return map;
}
