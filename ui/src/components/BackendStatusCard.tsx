import {
  Alert,
  ColumnLayout,
  SpaceBetween,
} from '@cloudscape-design/components';
import { useMemo, useState } from 'react';
import { MobyListCard } from './MobyListCard';
import { MobyInfoCard } from './MobyInfoCard';
import { PlayerCard } from './PlayerCard';
import type { MobySummary } from '../models/gameData';
import type { StatusResponse } from '../models/backendStatus';
import {
  getNumericGameId,
  getRatchetMapSnapshot,
  isRatchetMobyStatus,
  isUyaStatus,
} from '../models/uyaMapSnapshot';

type BackendStatusCardProps = {
  status: StatusResponse | null;
  error: string | null;
};

export function BackendStatusCard({ status, error }: BackendStatusCardProps) {
  const [selectedMobyPointer, setSelectedMobyPointer] = useState<number | null>(
    null,
  );
  const detectionGameId = getNumericGameId(status);
  const isUyaGame = isUyaStatus(status);
  const hasMobySnapshot = isRatchetMobyStatus(status);
  const ratchetSnapshot = getRatchetMapSnapshot(status);
  const selectedMoby = useMemo(
    () =>
      ratchetSnapshot?.mobys.find(
        (moby) => moby.pointer === selectedMobyPointer,
      ) ?? null,
    [selectedMobyPointer, ratchetSnapshot?.mobys],
  );

  return (
    <SpaceBetween size="l">
      {error ? (
        <Alert type="error">Unable to query backend: {error}</Alert>
      ) : null}

      {isUyaGame ? (
        <PlayerCard
          title="Local Player"
          position={ratchetSnapshot?.playerPosition ?? null}
        />
      ) : null}
      {hasMobySnapshot ? (
        <ColumnLayout columns={selectedMoby ? 2 : 1}>
          <MobyListCard
            title="Mobys"
            mobys={ratchetSnapshot?.mobys ?? []}
            gameId={detectionGameId}
            showAllocationTabs={detectionGameId !== 4}
            selectedMoby={selectedMoby}
            onSelectedMobyChange={(moby: MobySummary | null) =>
              setSelectedMobyPointer(moby?.pointer ?? null)
            }
          />
          {selectedMoby ? (
            <MobyInfoCard moby={selectedMoby} gameId={detectionGameId} />
          ) : null}
        </ColumnLayout>
      ) : null}
    </SpaceBetween>
  );
}
