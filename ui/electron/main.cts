import path from 'node:path'
import fs from 'node:fs'
import { spawn, type ChildProcess } from 'node:child_process'
import { app, BrowserWindow, dialog } from 'electron'

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
const backendBaseUrl = 'http://127.0.0.1:48123'

let logDirectory: string | null = null
let mainLogPath: string | null = null
let backendLogPath: string | null = null

function ensureLogPaths() {
  if (logDirectory && mainLogPath && backendLogPath) {
    return
  }

  logDirectory = path.join(app.getPath('userData'), 'logs')
  fs.mkdirSync(logDirectory, { recursive: true })
  mainLogPath = path.join(logDirectory, 'electron-main.log')
  backendLogPath = path.join(logDirectory, 'backend.log')
}

function serializeLogMessage(message: unknown) {
  if (message instanceof Error) {
    return `${message.name}: ${message.message}\n${message.stack ?? ''}`
  }

  if (typeof message === 'string') {
    return message
  }

  try {
    return JSON.stringify(message)
  } catch {
    return String(message)
  }
}

function writeLog(target: 'main' | 'backend', message: unknown) {
  try {
    ensureLogPaths()
    const entry = `[${new Date().toISOString()}] ${serializeLogMessage(message)}\n`
    const outputPath = target === 'main' ? mainLogPath! : backendLogPath!
    fs.appendFileSync(outputPath, entry, 'utf8')
  } catch (error) {
    console.error('[ratchet-companion] failed to write log', error)
  }
}

function logMain(message: unknown) {
  console.log(`[main] ${serializeLogMessage(message)}`)
  writeLog('main', message)
}

function logBackend(message: unknown) {
  console.log(`[backend] ${serializeLogMessage(message)}`)
  writeLog('backend', message)
}

function startBundledBackend() {
  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged || backendProcess) {
    return
  }

  const backendExecutable = process.platform === 'win32'
    ? 'RatchetCompanion.Host.exe'
    : 'RatchetCompanion.Host'

  const backendPath = path.join(process.resourcesPath, 'backend', backendExecutable)
  const backendWorkingDirectory = path.dirname(backendPath)

  logMain(`Starting bundled backend from ${backendPath}`)

  backendProcess = spawn(backendPath, [], {
    cwd: backendWorkingDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  backendProcess.stdout?.on('data', (chunk) => {
    logBackend(chunk.toString())
  })

  backendProcess.stderr?.on('data', (chunk) => {
    logBackend(chunk.toString())
  })

  backendProcess.on('error', (error) => {
    logMain(`Backend process error: ${serializeLogMessage(error)}`)
  })

  backendProcess.on('exit', (code, signal) => {
    logMain(`Backend process exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`)
    backendProcess = null
  })
}

function stopBundledBackend() {
  if (!backendProcess) {
    return
  }

  logMain('Stopping bundled backend')
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
        logMain(`Bundled backend became ready on attempt ${attempt}`)
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
  logMain('Creating main window')

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
  ensureLogPaths()
  logMain(`App ready. Logs directory: ${logDirectory}`)

  try {
    await createWindow()
  } catch (error) {
    logMain(`Failed to create window: ${serializeLogMessage(error)}`)
    void dialog.showErrorBox(
      'Ratchet Companion failed to start',
      `An error occurred during startup.\n\nLogs: ${logDirectory ?? 'Unavailable'}`,
    )
    throw error
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
}).catch((error) => {
  logMain(`Fatal app startup error: ${serializeLogMessage(error)}`)
  throw error
})

app.on('window-all-closed', () => {
  logMain('All windows closed')
  stopBundledBackend()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  logMain('App before-quit')
  stopBundledBackend()
})

app.on('render-process-gone', (_event, webContents, details) => {
  logMain(`Render process gone for webContents=${webContents.id}: ${JSON.stringify(details)}`)
})

app.on('child-process-gone', (_event, details) => {
  logMain(`Child process gone: ${JSON.stringify(details)}`)
})

process.on('uncaughtException', (error) => {
  logMain(`Uncaught exception: ${serializeLogMessage(error)}`)
})

process.on('unhandledRejection', (reason) => {
  logMain(`Unhandled rejection: ${serializeLogMessage(reason)}`)
})