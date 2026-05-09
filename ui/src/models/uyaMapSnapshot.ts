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

export function isRatchetMobyStatus(status: StatusResponse | null) {
  return (
    status?.gameData?.schema === 'uya.map-id.v1' ||
    status?.gameData?.schema === 'dl.mp.mobys.v1'
  );
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

export function getRatchetMapSnapshot(
  status: StatusResponse | null,
): UyaMapSnapshot | null {
  if (status?.gameData?.schema === 'uya.map-id.v1') {
    return getUyaMapSnapshot(status);
  }

  if (status?.gameData?.schema === 'dl.mp.mobys.v1') {
    const payload = status.gameData.payload;

    return {
      currentMapId: null,
      playerPosition: null,
      mobys: payload.mobyList?.mobys ?? [],
    };
  }

  return null;
}
