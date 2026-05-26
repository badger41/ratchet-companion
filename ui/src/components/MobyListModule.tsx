import {
  Alert,
  ColumnLayout,
  SpaceBetween,
} from '@cloudscape-design/components';
import { useMemo, useState } from 'react';
import { useMobyList } from '../hooks/useMobyList';
import type { MobySummary } from '../models/gameData';
import { getMobysFromSnapshot } from '../models/mobyListSnapshot';
import { MobyInfoCard } from './MobyInfoCard';
import { MobyListCard } from './MobyListCard';

type MobyListModuleProps = {
  gameId: number;
  pvarOverlayDataVersion: number;
};

export function MobyListModule({
  gameId,
  pvarOverlayDataVersion,
}: MobyListModuleProps) {
  const { snapshot, error } = useMobyList(gameId);
  const [selectedMobyPointer, setSelectedMobyPointer] = useState<number | null>(
    null,
  );
  const liveMobys = getMobysFromSnapshot(snapshot);

  const selectedMoby = useMemo(
    () =>
      liveMobys.find((moby) => moby.pointer === selectedMobyPointer) ?? null,
    [selectedMobyPointer, liveMobys],
  );

  return (
    <SpaceBetween size="m">
      {error ? <Alert type="error">{error}</Alert> : null}
      <ColumnLayout columns={selectedMoby ? 2 : 1}>
        <MobyListCard
          title="Mobys"
          mobys={liveMobys}
          gameId={gameId}
          showAllocationTabs={gameId !== 4}
          selectedMoby={selectedMoby}
          onSelectedMobyChange={(moby: MobySummary | null) =>
            setSelectedMobyPointer(moby?.pointer ?? null)
          }
        />
        {selectedMoby ? (
          <MobyInfoCard
            moby={selectedMoby}
            gameId={gameId}
            pvarOverlayDataVersion={pvarOverlayDataVersion}
          />
        ) : null}
      </ColumnLayout>
    </SpaceBetween>
  );
}
