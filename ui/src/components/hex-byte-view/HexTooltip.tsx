import { memo } from 'react';
import type { HexTooltipState } from './types';

export const HexTooltip = memo(function HexTooltip({
  tooltip,
}: {
  tooltip: HexTooltipState;
}) {
  return (
    <div
      className="hex-byte-grid-tooltip"
      style={{
        left: `${tooltip.x}px`,
        top:
          tooltip.placement === 'above'
            ? `${tooltip.y - 14}px`
            : `${tooltip.y + 24}px`,
        transform:
          tooltip.placement === 'above'
            ? 'translate(-50%, -100%)'
            : 'translate(-50%, 0)',
      }}
    >
      {tooltip.label}
    </div>
  );
});
