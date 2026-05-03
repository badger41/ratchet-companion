import type {
  ConfigSnapshot,
  RatchetCompanionOptions,
} from '../models/appConfig';
import { getBackendBaseUrl } from './backendStatus';

const backendBaseUrl = getBackendBaseUrl();

export async function getAppConfig() {
  const response = await fetch(`${backendBaseUrl}/api/config`);

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return (await response.json()) as ConfigSnapshot;
}

export async function saveAppConfig(options: RatchetCompanionOptions) {
  const response = await fetch(`${backendBaseUrl}/api/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return (await response.json()) as ConfigSnapshot;
}

export async function resetAppConfig() {
  const response = await fetch(`${backendBaseUrl}/api/config/reset`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return (await response.json()) as ConfigSnapshot;
}
