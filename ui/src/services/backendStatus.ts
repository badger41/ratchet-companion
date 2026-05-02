export function getBackendBaseUrl() {
  return window.ratchetCompanion?.backendBaseUrl ?? 'http://127.0.0.1:48123';
}

export function getStatusWebsocketUrl(baseUrl: string) {
  return baseUrl.replace(/^http/, 'ws') + '/ws/status';
}
