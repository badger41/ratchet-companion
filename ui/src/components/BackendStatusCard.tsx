import { Alert, SpaceBetween } from '@cloudscape-design/components';
import { MobyListCard } from './MobyListCard';
import { PlayerCard } from './PlayerCard';
import type { StatusResponse } from '../models/backendStatus';
import {
  getNumericGameId,
  getUyaMapSnapshot,
  isUyaStatus,
} from '../models/uyaMapSnapshot';

type BackendStatusCardProps = {
  status: StatusResponse | null;
  error: string | null;
};

export function BackendStatusCard({ status, error }: BackendStatusCardProps) {
  const detectionGameId = getNumericGameId(status);
  const isUyaGame = isUyaStatus(status);
  const uyaSnapshot = getUyaMapSnapshot(status);

  return (
    <SpaceBetween size="l">
      {error ? (
        <Alert type="error">Unable to query backend: {error}</Alert>
      ) : null}

      {isUyaGame ? (
        <PlayerCard
          title="Local Player"
          position={uyaSnapshot?.playerPosition ?? null}
        />
      ) : null}
      {isUyaGame ? (
        <MobyListCard
          title="Mobys"
          mobys={uyaSnapshot?.mobys ?? []}
          gameId={detectionGameId}
        />
      ) : null}
    </SpaceBetween>
  );
}
