import { useEffect, useState } from 'react';
import {
  getBackendBaseUrl,
  getMemoryWebsocketUrl,
} from '../services/backendStatus';

const backendBaseUrl = getBackendBaseUrl();

type MemoryBlockMessage = {
  address?: number;
  byteCount?: number;
  bytes: string | null;
};

type MemoryBlockSnapshot = {
  address: number;
  byteCount: number;
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
    if (address === null || byteCount <= 0) {
      return;
    }

    let isActive = true;
    const socket = new WebSocket(
      getMemoryWebsocketUrl(backendBaseUrl, address, byteCount),
    );
    socket.binaryType = 'arraybuffer';

    socket.onmessage = ({
      data,
    }: MessageEvent<string | ArrayBuffer | Blob>) => {
      if (!isActive) {
        return;
      }

      void readMemoryBytes(data, address, byteCount)
        .then((decodedBytes) => {
          if (!isActive || decodedBytes === undefined) {
            return;
          }

          setSnapshot((current) => {
            const isCurrentBlock =
              current?.address === address && current.byteCount === byteCount;

            return {
              address,
              byteCount,
              bytes: decodedBytes ?? (isCurrentBlock ? current.bytes : null),
              error: null,
            };
          });
        })
        .catch((err: unknown) => {
          if (!isActive) {
            return;
          }

          setSnapshot((current) => ({
            address,
            byteCount,
            bytes:
              current?.address === address && current.byteCount === byteCount
                ? current.bytes
                : null,
            error:
              err instanceof Error ? err.message : 'Unknown memory payload',
          }));
        });
    };

    socket.onerror = () => {
      if (!isActive) {
        return;
      }

      setSnapshot((current) => ({
        address,
        byteCount,
        bytes:
          current?.address === address && current.byteCount === byteCount
            ? current.bytes
            : null,
        error: 'Memory WebSocket connection failed',
      }));
    };

    socket.onclose = () => {
      if (!isActive) {
        return;
      }

      setSnapshot((current) =>
        current?.address === address && current.byteCount === byteCount
          ? { ...current, error: null }
          : {
              address,
              byteCount,
              bytes: null,
              error: null,
            },
      );
    };

    return () => {
      isActive = false;
      socket.close();
    };
  }, [address, byteCount]);

  return snapshot?.address === address && snapshot.byteCount === byteCount
    ? { bytes: snapshot.bytes, error: snapshot.error }
    : { bytes: null, error: null };
}

async function readMemoryBytes(
  data: string | ArrayBuffer | Blob,
  address: number,
  byteCount: number,
) {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  const payload = JSON.parse(data) as MemoryBlockMessage;
  if (
    (payload.address !== undefined && payload.address !== address) ||
    (payload.byteCount !== undefined && payload.byteCount !== byteCount)
  ) {
    return undefined;
  }

  return payload.bytes ? decodeBase64(payload.bytes) : null;
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
