import { defaultBackendBaseUrl } from './backendDefaults';

export function getBackendBaseUrl() {
  return window.ratchetCompanion?.backendBaseUrl ?? defaultBackendBaseUrl;
}

export function getStatusWebsocketUrl(baseUrl: string) {
  return baseUrl.replace(/^http/, 'ws') + '/ws/status';
}

export function getMobyListWebsocketUrl(baseUrl: string) {
  return baseUrl.replace(/^http/, 'ws') + '/ws/mobys';
}

export function getMemoryWebsocketUrl(
  baseUrl: string,
  address: number,
  byteCount: number,
) {
  const url = new URL(baseUrl.replace(/^http/, 'ws') + '/ws/memory');
  url.searchParams.set('address', String(address));
  url.searchParams.set('byteCount', String(byteCount));
  return url.toString();
}
