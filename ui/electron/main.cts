import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
const backendBaseUrl = 'http://127.0.0.1:48123'

function startBundledBackend() {
  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged || backendProcess) {
    return
  }

  const backendExecutable = process.platform === 'win32'
    ? 'RatchetCompanion.Host.exe'
    : 'RatchetCompanion.Host'

  const backendPath = path.join(process.resourcesPath, 'backend', backendExecutable)
  const backendWorkingDirectory = path.dirname(backendPath)

  backendProcess = spawn(backendPath, [], {
    cwd: backendWorkingDirectory,
    stdio: 'ignore',
    detached: false,
  })

  backendProcess.on('exit', () => {
    backendProcess = null
  })
}

function stopBundledBackend() {
  if (!backendProcess) {
    return
  }

  backendProcess.kill()
  backendProcess = null
}

async function waitForBundledBackendReady() {
  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged) {
    return
  }

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      const response = await fetch(`${backendBaseUrl}/api/health`)

      if (response.ok) {
        return
      }
    } catch {
      // Backend is still starting up.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Bundled backend did not become ready in time')
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0b1020',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  startBundledBackend()

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
    return
  }

  await waitForBundledBackendReady()
  await mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
}

app.whenReady().then(async () => {
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopBundledBackend()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopBundledBackend()
})