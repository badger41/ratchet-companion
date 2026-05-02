import type { MobySummary, PlayerPosition } from './gameData';

// UI mirror of backend GameDataSnapshot schemas. Add each backend Schema value
// here with its camelCase Payload type so consumers can narrow by snapshot.schema.
export type GameDataPayloadBySchema = {
  'uya.map-id.v1': UyaMapIdPayload;
};

export type GameDataSnapshot = {
  [Schema in keyof GameDataPayloadBySchema]: {
    gameId: string;
    schema: Schema;
    payload: GameDataPayloadBySchema[Schema];
  };
}[keyof GameDataPayloadBySchema];

export type KnownGameDataSchema = keyof GameDataPayloadBySchema;

export type UyaMapIdPayload = {
  currentMapId: number | null;
  isAvailable: boolean;
  playerPosition: PlayerPosition | null;
  mobyList: UyaMobyListData | null;
};

export type UyaMobyListData = {
  mobys: MobySummary[];
  staticCount: number;
  dynamicCount: number;
  dynamicCapacity: number;
};
