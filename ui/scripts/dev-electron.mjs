import { spawn, spawnSync } from 'node:child_process'

const backendUrl = 'http://127.0.0.1:48123/api/health'
const rendererUrl = 'http://127.0.0.1:5173/'
const isWindows = process.platform === 'win32'
const electronCommand =
  isWindows
    ? '.\\node_modules\\.bin\\electron.cmd'
    : './node_modules/.bin/electron'
const npmCommand = 'npm'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(url, label, attempts = 60) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      console.log(`[dev:electron] ${label} ready (${response.status}) on attempt ${attempt}`)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`[dev:electron] waiting for ${label} (${attempt}/${attempts}): ${message}`)
      await sleep(500)
    }
  }

  throw new Error(`Timed out waiting for ${label}`)
}

function buildElectronMain() {
  console.log('[dev:electron] building Electron main process')

  const result = spawnSync(npmCommand, ['run', 'build:electron'], {
    stdio: 'inherit',
    shell: isWindows,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`Electron main build failed with exit code ${result.status ?? 'unknown'}`)
  }
}

try {
  console.log('[dev:electron] starting preflight')
  console.log(`[dev:electron] ELECTRON_RUN_AS_NODE=${process.env.ELECTRON_RUN_AS_NODE ?? '<unset>'}`)

  buildElectronMain()

  await waitFor('http://127.0.0.1:5173', 'renderer')
  await waitFor(backendUrl, 'backend')

  const child = spawn(
    electronCommand,
    ['.'],
    {
      stdio: 'inherit',
      shell: isWindows,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: undefined,
        VITE_DEV_SERVER_URL: rendererUrl,
      },
    },
  )

  console.log(`[dev:electron] spawned electron pid=${child.pid ?? 'unknown'}`)

  child.on('exit', (code, signal) => {
    console.log(`[dev:electron] electron exited code=${code ?? 'null'} signal=${signal ?? 'null'}`)
    process.exit(code ?? 0)
  })

  child.on('error', (error) => {
    console.error(`[dev:electron] failed to spawn electron: ${error.message}`)
    process.exit(1)
  })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[dev:electron] startup failed: ${message}`)
  process.exit(1)
}
