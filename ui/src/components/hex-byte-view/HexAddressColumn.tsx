import { memo } from 'react';
import { formatHex } from './utils/format';

export const HexAddressColumn = memo(function HexAddressColumn({
  rowCount,
  addressWidth,
  bytesPerRow,
}: {
  rowCount: number;
  addressWidth: number;
  bytesPerRow: number;
}) {
  return (
    <div style={{ color: '#8EA4C8', flex: '0 0 auto' }}>
      {Array.from({ length: rowCount }, (_, rowIndex) => {
        const offset = rowIndex * bytesPerRow;
        return <div key={offset}>{formatHex(offset, addressWidth)}</div>;
      })}
    </div>
  );
});
