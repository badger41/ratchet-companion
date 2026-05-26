import { memo } from 'react';
import type { HexRow } from './types';

export const HexAsciiColumn = memo(function HexAsciiColumn({
  rows,
}: {
  rows: HexRow[];
}) {
  return (
    <div style={{ flex: '0 0 auto' }}>
      {rows.map((row) => (
        <div key={row.offset}>|{row.ascii}|</div>
      ))}
    </div>
  );
});
