import { Alert, SpaceBetween } from '@cloudscape-design/components';
import { MobyListModule } from './MobyListModule';
import { PlayerCard } from './PlayerCard';
import type { StatusResponse } from '../models/backendStatus';
import {
  getNumericGameId,
  getRatchetMapSnapshot,
  isRatchetMobyGame,
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
  const detectionGameId = getNumericGameId(status);
  const isUyaGame = isUyaStatus(status);
  const hasMobyList = isRatchetMobyGame(status);
  const ratchetSnapshot = getRatchetMapSnapshot(status);

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
      {hasMobyList ? (
        <MobyListModule
          key={detectionGameId}
          gameId={detectionGameId}
          pvarOverlayDataVersion={pvarOverlayDataVersion}
        />
      ) : null}
    </SpaceBetween>
  );
}
