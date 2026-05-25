export type RatchetCompanionOptions = {
  backend: BackendOptions;
  pine: PineOptions;
  polling: PollingOptions;
  appearance: AppearanceOptions;
};

export type BackendOptions = {
  host: string;
  port: number;
};

export type PineOptions = {
  host: string;
  port: number;
  socketPath: string | null;
  timeoutMilliseconds: number;
};

export type PollingOptions = {
  memoryMilliseconds: number;
  websocketStatusMilliseconds: number;
  websocketMemoryMilliseconds: number;
};

export type AppearanceOptions = {
  preserveHexViewColors: boolean;
};

export type ConfigSnapshot = {
  configPath: string;
  effective: RatchetCompanionOptions;
  defaults: RatchetCompanionOptions;
  warnings: string[];
};
