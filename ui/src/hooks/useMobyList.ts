import { useEffect, useState } from 'react';
import type { MobyListSnapshot } from '../models/mobyListSnapshot';
import {
  getBackendBaseUrl,
  getMobyListWebsocketUrl,
} from '../services/backendStatus';

const backendBaseUrl = getBackendBaseUrl();
const websocketUrl = getMobyListWebsocketUrl(backendBaseUrl);

export type MobyListState = {
  snapshot: MobyListSnapshot | null;
  error: string | null;
};

type MobyListInternalState = MobyListState & {
  gameId: number;
};

export function useMobyList(gameId: number): MobyListState {
  const [state, setState] = useState<MobyListInternalState>({
    gameId: 0,
    snapshot: null,
    error: null,
  });

  useEffect(() => {
    if (!isMobyListGame(gameId)) {
      return;
    }

    let isCurrent = true;
    const socket = new WebSocket(websocketUrl);

    socket.onmessage = ({ data }: { data: string }) => {
      try {
        const payload = JSON.parse(data) as unknown;
        if (!isCurrent) {
          return;
        }

        const snapshot =
          isMobyListSnapshot(payload) && isSnapshotForGame(payload, gameId)
            ? payload
            : null;

        setState({
          gameId,
          snapshot,
          error: null,
        });
      } catch (err) {
        if (!isCurrent) {
          return;
        }

        setState((current) => ({
          gameId,
          snapshot: current.gameId === gameId ? current.snapshot : null,
          error:
            err instanceof Error
              ? err.message
              : 'Unknown moby websocket payload',
        }));
      }
    };

    socket.onerror = () => {
      if (isCurrent) {
        setState((current) => ({
          gameId,
          snapshot: current.gameId === gameId ? current.snapshot : null,
          error: 'Moby list WebSocket connection failed',
        }));
      }
    };

    socket.onclose = () => {
      if (isCurrent) {
        setState((current) => ({
          gameId,
          snapshot: current.gameId === gameId ? current.snapshot : null,
          error: current.error ?? 'Moby list WebSocket disconnected',
        }));
      }
    };

    return () => {
      isCurrent = false;
      socket.close();
    };
  }, [gameId]);

  if (!isMobyListGame(gameId) || state.gameId !== gameId) {
    return { snapshot: null, error: null };
  }

  return { snapshot: state.snapshot, error: state.error };
}

function isMobyListGame(gameId: number) {
  return gameId === 3 || gameId === 4;
}

function isMobyListSnapshot(value: unknown): value is MobyListSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const snapshot = value as { schema?: unknown; payload?: unknown };
  return (
    (snapshot.schema === 'uya.mp.mobys.v1' ||
      snapshot.schema === 'dl.mp.mobys.v1') &&
    typeof snapshot.payload === 'object' &&
    snapshot.payload !== null
  );
}

function isSnapshotForGame(snapshot: MobyListSnapshot, gameId: number) {
  const snapshotGameId = String(snapshot.gameId);

  if (gameId === 3) {
    return snapshotGameId === '3' || snapshotGameId === 'UYA';
  }

  if (gameId === 4) {
    return snapshotGameId === '4' || snapshotGameId === 'DL';
  }

  return false;
}
