export type PlayerPosition = {
  x: number;
  y: number;
  z: number;
};

export type MobySummary = {
  pointer: number;
  oClass: number;
  isDynamic: boolean;
  pvar: MobyPvarSummary | null;
};

export type MobyPvarSummary = {
  pointer: number;
  byteCount: number;
  name: string;
};
