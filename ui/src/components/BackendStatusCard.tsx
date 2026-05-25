import {
  Alert,
  ColumnLayout,
  SpaceBetween,
} from '@cloudscape-design/components';
import { useEffect, useMemo, useState } from 'react';
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
  pvarOverlayDataVersion: number;
};

export function BackendStatusCard({
  status,
  error,
  pvarOverlayDataVersion,
}: BackendStatusCardProps) {
  const [selectedMobyPointer, setSelectedMobyPointer] = useState<number | null>(
    null,
  );
  const [lastMobys, setLastMobys] = useState<MobySummary[]>([]);
  const detectionGameId = getNumericGameId(status);
  const isUyaGame = isUyaStatus(status);
  const hasMobySnapshot = isRatchetMobyStatus(status);
  const ratchetSnapshot = getRatchetMapSnapshot(status);
  const liveMobys = ratchetSnapshot?.mobys ?? [];
  const displayMobys = liveMobys.length > 0 ? liveMobys : lastMobys;

  useEffect(() => {
    if (liveMobys.length > 0) {
      setLastMobys(liveMobys);
    }
  }, [liveMobys]);

  const selectedMoby = useMemo(
    () =>
      displayMobys.find((moby) => moby.pointer === selectedMobyPointer) ?? null,
    [selectedMobyPointer, displayMobys],
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
            mobys={displayMobys}
            gameId={detectionGameId}
            showAllocationTabs={detectionGameId !== 4}
            selectedMoby={selectedMoby}
            onSelectedMobyChange={(moby: MobySummary | null) =>
              setSelectedMobyPointer(moby?.pointer ?? null)
            }
          />
          {selectedMoby ? (
            <MobyInfoCard
              moby={selectedMoby}
              gameId={detectionGameId}
              pvarOverlayDataVersion={pvarOverlayDataVersion}
            />
          ) : null}
        </ColumnLayout>
      ) : null}
    </SpaceBetween>
  );
}
