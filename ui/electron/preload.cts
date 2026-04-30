import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ratchetCompanion', {
  backendBaseUrl: 'http://127.0.0.1:48123',
})