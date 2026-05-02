import { useEffect, useState } from 'react';
import {
  getBackendBaseUrl,
  getMemoryWebsocketUrl,
} from '../services/backendStatus';

const backendBaseUrl = getBackendBaseUrl();

type MemoryBlockMessage = {
  address: number;
  byteCount: number;
  bytes: string | null;
};

type MemoryBlockSnapshot = {
  address: number;
  bytes: Uint8Array | null;
  error: string | null;
};

export type MemoryBlockState = {
  bytes: Uint8Array | null;
  error: string | null;
};

export function useMemoryBlock(
  address: number | null,
  byteCount: number,
): MemoryBlockState {
  const [snapshot, setSnapshot] = useState<MemoryBlockSnapshot | null>(null);

  useEffect(() => {
    if (address === null) {
      return;
    }

    const socket = new WebSocket(
      getMemoryWebsocketUrl(backendBaseUrl, address, byteCount),
    );

    socket.onmessage = ({ data }: { data: string }) => {
      try {
        const payload = JSON.parse(data) as MemoryBlockMessage;
        setSnapshot({
          address,
          bytes: payload.bytes ? decodeBase64(payload.bytes) : null,
          error: null,
        });
      } catch (err) {
        setSnapshot({
          address,
          bytes: null,
          error: err instanceof Error ? err.message : 'Unknown memory payload',
        });
      }
    };

    socket.onerror = () => {
      setSnapshot({
        address,
        bytes: null,
        error: 'Memory WebSocket connection failed',
      });
    };

    socket.onclose = () => {
      setSnapshot((current) =>
        current?.address === address && current.error
          ? current
          : {
              address,
              bytes: null,
              error: 'Memory WebSocket disconnected',
            },
      );
    };

    return () => {
      socket.close();
    };
  }, [address, byteCount]);

  return snapshot?.address === address
    ? { bytes: snapshot.bytes, error: snapshot.error }
    : { bytes: null, error: null };
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
