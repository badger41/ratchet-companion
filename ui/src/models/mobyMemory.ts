import type { PlayerPosition } from './gameData';

const MOBY_MEMORY_SIZE = 0x100;
const POSITION_OFFSET = 0x10;
const P_CLASS_OFFSET = 0x24;
const P_UPDATE_OFFSET = 0x64;
const P_VAR_OFFSET = 0x68;

export const mobyMemoryByteCount = MOBY_MEMORY_SIZE;

export type MobyMemory = {
  position: PlayerPosition;
  pClass: number;
  pUpdate: number;
  pVar: number;
};

export function parseMobyMemory(bytes: Uint8Array | null): MobyMemory | null {
  if (!bytes || bytes.byteLength < MOBY_MEMORY_SIZE) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    position: {
      x: view.getFloat32(POSITION_OFFSET, true),
      y: view.getFloat32(POSITION_OFFSET + 0x4, true),
      z: view.getFloat32(POSITION_OFFSET + 0x8, true),
    },
    pClass: view.getUint32(P_CLASS_OFFSET, true),
    pUpdate: view.getUint32(P_UPDATE_OFFSET, true),
    pVar: view.getUint32(P_VAR_OFFSET, true),
  };
}
