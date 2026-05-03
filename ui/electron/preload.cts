import { contextBridge } from 'electron';
import { defaultBackendBaseUrl } from './backendConfig.cjs';

function getBackendBaseUrl() {
  const argument = process.argv.find((value) =>
    value.startsWith('--ratchet-backend-base-url='),
  );

  return argument?.split('=')[1] || defaultBackendBaseUrl;
}

contextBridge.exposeInMainWorld('ratchetCompanion', {
  backendBaseUrl: getBackendBaseUrl(),
});
