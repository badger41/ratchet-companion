import pvarOverlay from './pvar_overlay.json';

type PvarOverlayEntry = {
  Name?: string;
  RCVersion?: number;
  MobyOClass?: number;
};

type RCMobyLookup = Map<number, Map<number, string>>;

const entries = (pvarOverlay as PvarOverlayEntry[]).filter(
  (
    entry,
  ): entry is Required<
    Pick<PvarOverlayEntry, 'Name' | 'MobyOClass' | 'RCVersion'>
  > &
    PvarOverlayEntry =>
    typeof entry.Name === 'string' &&
    typeof entry.MobyOClass === 'number' &&
    typeof entry.RCVersion === 'number',
);

const mobyNamesByVersion = entries.reduce<RCMobyLookup>((lookup, entry) => {
  const versionLookup =
    lookup.get(entry.RCVersion) ?? new Map<number, string>();
  versionLookup.set(entry.MobyOClass, entry.Name);
  lookup.set(entry.RCVersion, versionLookup);
  return lookup;
}, new Map<number, Map<number, string>>());

export function getMobyName(oClass: number, rcVersion: number): string | null {
  if (rcVersion !== null) {
    const versionName = mobyNamesByVersion.get(rcVersion)?.get(oClass);
    if (versionName) {
      return versionName;
    }
  }

  for (const versionLookup of mobyNamesByVersion.values()) {
    const fallbackName = versionLookup.get(oClass);
    if (fallbackName) {
      return fallbackName;
    }
  }

  return null;
}
