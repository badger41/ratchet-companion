export type PlayerPosition = {
  x: number;
  y: number;
  z: number;
};

export type MobySummary = {
  pointer: number;
  oClass: number;
  name?: string | null;
  isDynamic: boolean;
  netObjectPointer?: number;
  pvar: MobyPvarSummary | null;
  netObject?: MobyNetObjectSummary | null;
};

export type MobyPvarSummary = {
  pointer: number;
  byteCount: number;
  name: string;
};

export type MobyNetObjectSummary = {
  pointer: number;
  dataType: string;
  byteCount: number;
  fields: MobyNetObjectField[];
};

export type MobyNetObjectField = {
  name: string;
  offset: number;
  byteCount: number;
  dataType: string;
  category: string;
};
