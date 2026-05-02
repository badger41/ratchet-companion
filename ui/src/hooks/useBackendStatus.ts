import { useEffect, useState } from 'react';
import type { StatusResponse } from '../models/backendStatus';
import {
  getBackendBaseUrl,
  getStatusWebsocketUrl,
} from '../services/backendStatus';

const backendBaseUrl = getBackendBaseUrl();
const websocketUrl = getStatusWebsocketUrl(backendBaseUrl);

export type BackendStatusState = {
  status: StatusResponse | null;
  error: string | null;
  isPending: boolean;
  toggleConnection: () => Promise<void>;
};

export function useBackendStatus(): BackendStatusState {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(websocketUrl);

    socket.onmessage = ({ data }: { data: string }) => {
      try {
        const payload = JSON.parse(data) as StatusResponse;
        setStatus(payload);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Unknown websocket payload',
        );
      }
    };

    socket.onerror = () => {
      setError('WebSocket connection failed');
    };

    socket.onclose = () => {
      setError((current) => current ?? 'WebSocket disconnected');
    };

    return () => {
      socket.close();
    };
  }, []);

  const toggleConnection = async () => {
    try {
      setIsPending(true);

      const endpoint = status?.connection.isSessionActive
        ? '/api/session/disconnect'
        : '/api/session/connect';
      const response = await fetch(`${backendBaseUrl}${endpoint}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const payload = (await response.json()) as { connected: boolean };

      setStatus((current) =>
        current
          ? {
              ...current,
              connection: {
                ...current.connection,
                isSessionActive: payload.connected,
              },
            }
          : current,
      );

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPending(false);
    }
  };

  return { status, error, isPending, toggleConnection };
}
