import type { GameDataSnapshot } from './gameDataSnapshot';

export type StatusResponse = {
  backend: string;
  connection: {
    isSessionActive: boolean;
    isProcessRunning: boolean;
    isConnectedToPine: boolean;
    processName: string | null;
    processId: number | null;
  };
  detection: {
    gameId: string | number;
    displayName: string;
    version: { region: string; build: string } | null;
    isSupported: boolean;
  };
  module: {
    gameId: string;
    displayName: string;
    capabilities: string[];
  } | null;
  gameData?: GameDataSnapshot | null;
};
