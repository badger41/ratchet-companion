import { memo } from 'react';
import type { HexRow } from './types';

export const HexGridText = memo(function HexGridText({
  rows,
}: {
  rows: HexRow[];
}) {
  return (
    <div className="hex-byte-grid-text">
      {rows.map((row) => (
        <div key={row.offset}>
          {row.groups.map((group, groupIndex) => (
            <span key={`${row.offset}-${groupIndex}`}>
              {groupIndex > 0 ? '  ' : null}
              {group.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
});
