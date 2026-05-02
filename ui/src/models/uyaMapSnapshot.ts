import type { StatusResponse } from './backendStatus';
import type { MobySummary, PlayerPosition } from './gameData';

const UYA_GAME_ID = '3';
const UYA_GAME_KEY = 'UYA';

export type UyaMapSnapshot = {
  currentMapId: string | null;
  playerPosition: PlayerPosition | null;
  mobys: MobySummary[];
};

export function isUyaStatus(status: StatusResponse | null) {
  const gameId = String(status?.detection.gameId ?? 'Unknown');
  return gameId === UYA_GAME_ID || gameId === UYA_GAME_KEY;
}

export function getNumericGameId(status: StatusResponse | null) {
  return Number(status?.detection.gameId ?? 0);
}

export function getUyaMapSnapshot(
  status: StatusResponse | null,
): UyaMapSnapshot | null {
  if (status?.gameData?.schema !== 'uya.map-id.v1') {
    return null;
  }

  const payload = status.gameData.payload;

  return {
    currentMapId: payload.isAvailable
      ? String(payload.currentMapId ?? '—')
      : null,
    playerPosition: payload.playerPosition,
    mobys: payload.mobyList?.mobys ?? [],
  };
}
