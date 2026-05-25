import { setPvarOverlayEntries } from '../data/pvarOverlayLookup';
import { getBackendBaseUrl } from './backendStatus';

let lastSerializedEntries: string | null = null;

export async function loadPvarOverlay() {
  const response = await fetch(`${getBackendBaseUrl()}/api/pvar-overlay`);

  if (!response.ok) {
    throw new Error(`Failed to load pvar overlay: ${response.status}`);
  }

  const entries = (await response.json()) as unknown;

  if (!Array.isArray(entries)) {
    throw new Error('Failed to load pvar overlay: response was not an array');
  }

  const serializedEntries = JSON.stringify(entries);

  if (serializedEntries === lastSerializedEntries) {
    return false;
  }

  lastSerializedEntries = serializedEntries;
  setPvarOverlayEntries(entries);
  return true;
}
