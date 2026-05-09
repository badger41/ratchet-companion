import { spawn } from 'node:child_process'

const children = []
let shuttingDown = false
const isWindows = process.platform === 'win32'
const npmCommand = 'npm'

function start(name, command, args) {
  console.log(`[dev] starting ${name}: ${command} ${args.join(' ')}`)

  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
    detached: !isWindows,
  })

  children.push({ name, child })

  child.on('exit', (code, signal) => {
    console.log(`[dev] ${name} exited code=${code ?? 'null'} signal=${signal ?? 'null'}`)

    if (shuttingDown) {
      return
    }

    if (name === 'electron') {
      shutdown('SIGTERM', code ?? 0)
      return
    }

    if (code && code !== 0) {
      shutdown('SIGTERM', 1)
    }
  })

  child.on('error', (error) => {
    console.error(`[dev] failed to start ${name}: ${error.message}`)
    shutdown('SIGTERM', 1)
  })
}

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  console.log(`[dev] shutting down children with ${signal}`)

  for (const { name, child } of children) {
    stopChild(name, child, signal)
  }

  setTimeout(() => {
    for (const { name, child } of children) {
      stopChild(name, child, 'SIGKILL')
    }

    process.exit(exitCode)
  }, 1500)
}

function stopChild(name, child, signal) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return
  }

  if (isWindows) {
    const taskkill = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      shell: false,
    })

    taskkill.on('error', (error) => {
      console.log(`[dev] unable to stop ${name} pid ${child.pid}: ${error.message}`)
    })
    return
  }

  try {
    process.kill(-child.pid, signal)
    console.log(`[dev] sent ${signal} to ${name} process group ${child.pid}`)
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      console.log(`[dev] unable to signal ${name} process group ${child.pid}: ${error.message}`)
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start('renderer', npmCommand, ['run', 'dev:renderer'])
start('backend', npmCommand, ['run', 'dev:backend'])
start('electron', npmCommand, ['run', 'dev:electron'])
