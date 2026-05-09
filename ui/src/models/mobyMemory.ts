import type { PlayerPosition } from './gameData';

const MOBY_MEMORY_SIZE = 0x100;
const POSITION_OFFSET = 0x10;
const P_CLASS_OFFSET = 0x24;
const UYA_P_UPDATE_OFFSET = 0x64;
const UYA_P_VAR_OFFSET = 0x68;
const DL_P_UPDATE_OFFSET = 0xa8;
const DL_P_VAR_OFFSET = 0xac;

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
  const layout = getMobyMemoryLayout();

  return {
    position: {
      x: view.getFloat32(POSITION_OFFSET, true),
      y: view.getFloat32(POSITION_OFFSET + 0x4, true),
      z: view.getFloat32(POSITION_OFFSET + 0x8, true),
    },
    pClass: view.getUint32(P_CLASS_OFFSET, true),
    pUpdate: view.getUint32(layout.pUpdateOffset, true),
    pVar: view.getUint32(layout.pVarOffset, true),
  };
}

export function parseMobyMemoryForGame(
  bytes: Uint8Array | null,
  gameId: number,
): MobyMemory | null {
  if (!bytes || bytes.byteLength < MOBY_MEMORY_SIZE) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const layout = getMobyMemoryLayout(gameId);

  return {
    position: {
      x: view.getFloat32(POSITION_OFFSET, true),
      y: view.getFloat32(POSITION_OFFSET + 0x4, true),
      z: view.getFloat32(POSITION_OFFSET + 0x8, true),
    },
    pClass: view.getUint32(P_CLASS_OFFSET, true),
    pUpdate: view.getUint32(layout.pUpdateOffset, true),
    pVar: view.getUint32(layout.pVarOffset, true),
  };
}

function getMobyMemoryLayout(gameId = 3) {
  if (gameId === 4) {
    return {
      pUpdateOffset: DL_P_UPDATE_OFFSET,
      pVarOffset: DL_P_VAR_OFFSET,
    };
  }

  return {
    pUpdateOffset: UYA_P_UPDATE_OFFSET,
    pVarOffset: UYA_P_VAR_OFFSET,
  };
}
