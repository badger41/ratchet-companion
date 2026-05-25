import path from 'node:path';
import fs from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { app, BrowserWindow, dialog } from 'electron';
import {
  defaultBackendBaseUrl,
  defaultBackendHost,
  defaultBackendPort,
} from './backendConfig.cjs';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendBaseUrl = defaultBackendBaseUrl;

let logDirectory: string | null = null;
let mainLogPath: string | null = null;
let backendLogPath: string | null = null;

function getFallbackUserDataDirectory() {
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA ?? process.env.LOCALAPPDATA ?? process.cwd(),
      'Ratchet Companion',
    );
  }

  if (process.platform === 'darwin') {
    return path.join(
      process.env.HOME ?? process.cwd(),
      'Library',
      'Application Support',
      'Ratchet Companion',
    );
  }

  return path.join(
    process.env.XDG_CONFIG_HOME ??
      path.join(process.env.HOME ?? process.cwd(), '.config'),
    'Ratchet Companion',
  );
}

function getUserDataDirectory() {
  try {
    return app.getPath('userData');
  } catch {
    return getFallbackUserDataDirectory();
  }
}

function readSettingSection(settings: Record<string, unknown>, name: string) {
  const value =
    settings[name] ?? settings[name.charAt(0).toLowerCase() + name.slice(1)];
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function readStringSetting(
  settings: Record<string, unknown>,
  pascalName: string,
  fallback: string,
) {
  const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
  const value = settings[pascalName] ?? settings[camelName];

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
}

function readNumberSetting(
  settings: Record<string, unknown>,
  pascalName: string,
  fallback: number,
) {
  const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
  const value = settings[pascalName] ?? settings[camelName];

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  return fallback;
}

function getConfiguredBackendBaseUrl() {
  const settingsPath = path.join(getUserDataDirectory(), 'settings.json');

  try {
    if (!fs.existsSync(settingsPath)) {
      return defaultBackendBaseUrl;
    }

    const settings = JSON.parse(
      fs.readFileSync(settingsPath, 'utf8'),
    ) as Record<string, unknown>;
    const backend = readSettingSection(settings, 'Backend');
    const host = readStringSetting(backend, 'Host', defaultBackendHost);
    const port = readNumberSetting(backend, 'Port', defaultBackendPort);

    if (port < 1 || port > 65535) {
      return defaultBackendBaseUrl;
    }

    return `http://${host}:${port}`;
  } catch (error) {
    logMain(
      `Unable to read backend URL from settings.json: ${serializeLogMessage(error)}`,
    );
    return defaultBackendBaseUrl;
  }
}

function getExternalPvarOverlayPath() {
  if (!app.isPackaged) {
    return path.resolve(__dirname, '..', 'src', 'data', 'pvar_overlay.json');
  }

  if (process.platform === 'win32' && process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'pvar_overlay.json');
  }

  const appExecutablePath =
    process.platform === 'linux' && process.env.APPIMAGE
      ? process.env.APPIMAGE
      : process.execPath;

  return path.join(path.dirname(appExecutablePath), 'pvar_overlay.json');
}

function ensureLogPaths() {
  if (logDirectory && mainLogPath && backendLogPath) {
    return;
  }

  logDirectory = path.join(getUserDataDirectory(), 'logs');
  fs.mkdirSync(logDirectory, { recursive: true });
  mainLogPath = path.join(logDirectory, 'electron-main.log');
  backendLogPath = path.join(logDirectory, 'backend.log');
}

function serializeLogMessage(message: unknown) {
  if (message instanceof Error) {
    return `${message.name}: ${message.message}\n${message.stack ?? ''}`;
  }

  if (typeof message === 'string') {
    return message;
  }

  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function writeLog(target: 'main' | 'backend', message: unknown) {
  try {
    ensureLogPaths();
    const entry = `[${new Date().toISOString()}] ${serializeLogMessage(message)}\n`;
    const outputPath = target === 'main' ? mainLogPath! : backendLogPath!;
    fs.appendFileSync(outputPath, entry, 'utf8');
  } catch (error) {
    console.error('[ratchet-companion] failed to write log', error);
  }
}

function writeConsole(target: 'main' | 'backend', message: unknown) {
  const entry = `[ratchet-companion][${target}] ${serializeLogMessage(message)}\n`;

  try {
    process.stdout.write(entry);
  } catch {
    console.log(entry);
  }
}

function logMain(message: unknown) {
  writeConsole('main', message);
  writeLog('main', message);
}

function logBackend(message: unknown) {
  writeConsole('backend', message);
  writeLog('backend', message);
}

function startBundledBackend() {
  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged || backendProcess) {
    return;
  }

  const backendExecutable =
    process.platform === 'win32'
      ? 'RatchetCompanion.Host.exe'
      : 'RatchetCompanion.Host';

  const backendPath = path.join(
    process.resourcesPath,
    'backend',
    backendExecutable,
  );
  const backendWorkingDirectory = path.dirname(backendPath);
  const pvarOverlayPath = getExternalPvarOverlayPath();

  logMain(`Starting bundled backend from ${backendPath}`);
  logMain(`Using pvar overlay file ${pvarOverlayPath}`);

  backendProcess = spawn(backendPath, [], {
    cwd: backendWorkingDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: {
      ...process.env,
      RATCHET_COMPANION_LOG_DIR: logDirectory ?? backendWorkingDirectory,
      RATCHET_COMPANION_PVAR_OVERLAY_PATH: pvarOverlayPath,
    },
  });

  backendProcess.stdout?.on('data', (chunk) => {
    logBackend(chunk.toString());
  });

  backendProcess.stderr?.on('data', (chunk) => {
    logBackend(chunk.toString());
  });

  backendProcess.on('error', (error) => {
    logMain(`Backend process error: ${serializeLogMessage(error)}`);
  });

  backendProcess.on('exit', (code, signal) => {
    logMain(
      `Backend process exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
    );
    backendProcess = null;
  });
}

function stopBundledBackend() {
  if (!backendProcess) {
    return;
  }

  logMain('Stopping bundled backend');
  backendProcess.kill();
  backendProcess = null;
}

async function waitForBundledBackendReady() {
  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged) {
    return;
  }

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      const response = await fetch(`${backendBaseUrl}/api/health`);

      if (response.ok) {
        logMain(`Bundled backend became ready on attempt ${attempt}`);
        return;
      }
    } catch {
      // Backend is still starting up.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Bundled backend did not become ready in time');
}

const createWindow = async () => {
  logMain('Creating main window');

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
      additionalArguments: [`--ratchet-backend-base-url=${backendBaseUrl}`],
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  startBundledBackend();

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  await waitForBundledBackendReady();
  await mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
};

logMain(
  `Electron main module loaded. platform=${process.platform} packaged=${app.isPackaged}`,
);

app
  .whenReady()
  .then(async () => {
    backendBaseUrl = getConfiguredBackendBaseUrl();
    logMain(`App ready. Logs directory: ${logDirectory}`);

    try {
      await createWindow();
    } catch (error) {
      logMain(`Failed to create window: ${serializeLogMessage(error)}`);
      void dialog.showErrorBox(
        'Ratchet Companion failed to start',
        `An error occurred during startup.\n\nLogs: ${logDirectory ?? 'Unavailable'}`,
      );
      throw error;
    }

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  })
  .catch((error) => {
    logMain(`Fatal app startup error: ${serializeLogMessage(error)}`);
    throw error;
  });

app.on('window-all-closed', () => {
  logMain('All windows closed');
  stopBundledBackend();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logMain('App before-quit');
  stopBundledBackend();
});

app.on('render-process-gone', (_event, webContents, details) => {
  logMain(
    `Render process gone for webContents=${webContents.id}: ${JSON.stringify(details)}`,
  );
});

app.on('child-process-gone', (_event, details) => {
  logMain(`Child process gone: ${JSON.stringify(details)}`);
});

process.on('uncaughtException', (error) => {
  logMain(`Uncaught exception: ${serializeLogMessage(error)}`);
});

process.on('unhandledRejection', (reason) => {
  logMain(`Unhandled rejection: ${serializeLogMessage(reason)}`);
});
