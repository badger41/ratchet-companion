import type { MobySummary } from './gameData';

const EMPTY_MOBYS: MobySummary[] = [];

export type MobyListPayloadBySchema = {
  'uya.mp.mobys.v1': MobyListPayload;
  'dl.mp.mobys.v1': MobyListPayload;
};

export type MobyListSnapshot = {
  [Schema in keyof MobyListPayloadBySchema]: {
    gameId: string;
    schema: Schema;
    payload: MobyListPayloadBySchema[Schema];
  };
}[keyof MobyListPayloadBySchema];

export type MobyListPayload = {
  isAvailable: boolean;
  mobyList: MobyListData | null;
};

export type MobyListData = {
  mobys: MobySummary[];
  staticCount: number;
  dynamicCount: number;
  dynamicCapacity: number;
};

export function getMobysFromSnapshot(snapshot: MobyListSnapshot | null) {
  return snapshot?.payload.mobyList?.mobys ?? EMPTY_MOBYS;
}
