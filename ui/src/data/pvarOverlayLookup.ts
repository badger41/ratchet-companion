import pvarOverlay from './pvar_overlay.json';

type PvarOverlayEntry = {
  Name?: string;
  RCVersion?: number;
  MobyOClass?: number;
  Overlay?: PvarOverlayField[];
};

type RCMobyLookup = Map<number, Map<number, string>>;
type RCPvarOverlayLookup = Map<number, Map<number, PvarOverlayField[]>>;

export type PvarOverlayField = {
  Name?: string;
  DataType?: string;
  Offset?: number;
  DataSize?: number;
  Count?: number;
  Order?: number;
};

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

const pvarFieldsByVersion = entries.reduce<RCPvarOverlayLookup>(
  (lookup, entry) => {
    const overlayFields = (entry.Overlay ?? [])
      .filter(
        (
          field,
        ): field is Required<
          Pick<PvarOverlayField, 'Name' | 'DataType' | 'Offset'>
        > &
          PvarOverlayField =>
          typeof field.Name === 'string' &&
          typeof field.DataType === 'string' &&
          typeof field.Offset === 'number',
      )
      .sort((left, right) => {
        const leftOrder = left.Order ?? left.Offset;
        const rightOrder = right.Order ?? right.Offset;
        return leftOrder - rightOrder || left.Offset - right.Offset;
      });

    if (overlayFields.length === 0) {
      return lookup;
    }

    const versionLookup =
      lookup.get(entry.RCVersion) ?? new Map<number, PvarOverlayField[]>();
    versionLookup.set(entry.MobyOClass, overlayFields);
    lookup.set(entry.RCVersion, versionLookup);
    return lookup;
  },
  new Map<number, Map<number, PvarOverlayField[]>>(),
);

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

export function getPvarOverlayFields(
  oClass: number,
  rcVersion: number,
): PvarOverlayField[] {
  if (rcVersion !== null) {
    const versionFields = pvarFieldsByVersion.get(rcVersion)?.get(oClass);
    if (versionFields) {
      return versionFields;
    }
  }

  for (const versionLookup of pvarFieldsByVersion.values()) {
    const fallbackFields = versionLookup.get(oClass);
    if (fallbackFields) {
      return fallbackFields;
    }
  }

  return [];
}
