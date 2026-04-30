import net from 'node:net'

const ports = [
  { port: 5173, name: 'Vite renderer' },
  { port: 48123, name: '.NET backend' },
]

const isPortOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })

    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.once('error', () => {
      resolve(false)
    })
  })

const occupied = []

for (const entry of ports) {
  if (await isPortOpen(entry.port)) {
    occupied.push(entry)
  }
}

if (occupied.length > 0) {
  console.error('Cannot start Ratchet Companion dev mode.')
  console.error('The following required dev ports are already in use:')

  for (const entry of occupied) {
    console.error(`- ${entry.port} (${entry.name})`)
  }

  console.error('')
  console.error('This usually means a previous dev session is still running.')
  console.error('Stop the old session first, then run `npm run dev` again.')
  process.exit(1)
}
