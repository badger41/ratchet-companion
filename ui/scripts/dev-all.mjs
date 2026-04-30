import { spawn } from 'node:child_process'

const children = []
let shuttingDown = false

function start(name, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
    detached: true,
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
    if (!child.pid) {
      continue
    }

    try {
      process.kill(-child.pid, signal)
      console.log(`[dev] sent ${signal} to ${name} process group ${child.pid}`)
    } catch (error) {
      console.log(`[dev] unable to signal ${name} process group ${child.pid}: ${error.message}`)
    }
  }

  setTimeout(() => {
    for (const { name, child } of children) {
      if (!child.pid) {
        continue
      }

      try {
        process.kill(-child.pid, 'SIGKILL')
        console.log(`[dev] sent SIGKILL to ${name} process group ${child.pid}`)
      } catch {
        // Already exited.
      }
    }

    process.exit(exitCode)
  }, 1500)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start('renderer', 'npm', ['run', 'dev:renderer'])
start('backend', 'npm', ['run', 'dev:backend'])
start('electron', 'npm', ['run', 'dev:electron'])