import { useEffect, useMemo, useState } from 'react'

type StatusResponse = {
  backend: string
  connection: {
    isSessionActive: boolean
    isProcessRunning: boolean
    isConnectedToPine: boolean
    processName: string | null
    processId: number | null
  }
  detection: {
    gameId: string
    displayName: string
    version: { region: string; build: string } | null
    isSupported: boolean
  }
  module: {
    gameId: string
    displayName: string
    capabilities: string[]
  } | null
}

function normalizeStatusResponse(input: unknown): StatusResponse {
  const source = input as Record<string, any>
  const connection = (source.connection ?? source.Connection ?? {}) as Record<string, any>
  const detection = (source.detection ?? source.Detection ?? {}) as Record<string, any>
  const version = (detection.version ?? detection.Version ?? null) as Record<string, any> | null
  const module = (source.module ?? source.Module ?? null) as Record<string, any> | null

  return {
    backend: source.backend ?? source.Backend ?? 'Unknown',
    connection: {
      isSessionActive: connection.isSessionActive ?? connection.IsSessionActive ?? false,
      isProcessRunning: connection.isProcessRunning ?? connection.IsProcessRunning ?? false,
      isConnectedToPine: connection.isConnectedToPine ?? connection.IsConnectedToPine ?? false,
      processName: connection.processName ?? connection.ProcessName ?? null,
      processId: connection.processId ?? connection.ProcessId ?? null,
    },
    detection: {
      gameId: detection.gameId ?? detection.GameId ?? 'Unknown',
      displayName: detection.displayName ?? detection.DisplayName ?? 'Unknown',
      version: version
        ? {
            region: version.region ?? version.Region ?? 'Unknown',
            build: version.build ?? version.Build ?? 'Unknown',
          }
        : null,
      isSupported: detection.isSupported ?? detection.IsSupported ?? false,
    },
    module: module
      ? {
          gameId: module.gameId ?? module.GameId ?? 'Unknown',
          displayName: module.displayName ?? module.DisplayName ?? 'Unknown',
          capabilities: module.capabilities ?? module.Capabilities ?? [],
        }
      : null,
  }
}

const backendBaseUrl = window.ratchetCompanion?.backendBaseUrl ?? 'http://127.0.0.1:48123'

type StatusDotProps = {
  label: string
  isActive: boolean
  activeText: string
  inactiveText: string
}

function StatusDot({ label, isActive, activeText, inactiveText }: StatusDotProps) {
  return (
    <div className="status-pill" title={`${label}: ${isActive ? activeText : inactiveText}`}>
      <span className={`status-dot ${isActive ? 'is-active' : 'is-inactive'}`} aria-hidden="true" />
      <span className="status-pill-label">{label}</span>
    </div>
  )
}

export function BackendStatusCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isSessionActive = status?.connection?.isSessionActive ?? false
  const isProcessRunning = status?.connection?.isProcessRunning ?? false
  const isConnectedToPine = status?.connection?.isConnectedToPine ?? false
  const loadedGame = status?.detection?.displayName ?? 'No title detected'
  const discSerial = status?.detection?.version?.build ?? 'No serial'

  const websocketUrl = useMemo(() => backendBaseUrl.replace('http://', 'ws://') + '/ws/status', [])

  useEffect(() => {
    const socket = new WebSocket(websocketUrl)

    socket.onmessage = (event) => {
      try {
        const payload = normalizeStatusResponse(JSON.parse(event.data))
        setStatus(payload)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown websocket payload')
      }
    }

    socket.onerror = () => {
      setError('WebSocket connection failed')
    }

    socket.onclose = () => {
      setError((current) => current ?? 'WebSocket disconnected')
    }

    return () => {
      socket.close()
    }
  }, [websocketUrl])

  const toggleConnection = async () => {
    try {
      setIsPending(true)

      const endpoint = isSessionActive ? '/api/session/disconnect' : '/api/session/connect'
      const response = await fetch(`${backendBaseUrl}${endpoint}`, { method: 'POST' })

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`)
      }

      const payload = (await response.json()) as { connected: boolean }

      setStatus((current) =>
        current
          ? {
              ...current,
              connection: {
                ...current.connection,
                isSessionActive: payload.connected,
              },
            }
          : current,
      )

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section className="status-bar-shell">
      <div className="status-bar" role="status" aria-live="polite">
        <button className="connect-button" onClick={toggleConnection} disabled={isPending}>
          {isPending ? 'Working...' : isSessionActive ? 'Disconnect' : 'Connect'}
        </button>

        <div className="status-divider" aria-hidden="true" />

        <StatusDot
          label="PCSX2"
          isActive={isProcessRunning}
          activeText="Detected"
          inactiveText="Not detected"
        />

        <div className="status-divider" aria-hidden="true" />

        <StatusDot
          label="PINE"
          isActive={isConnectedToPine}
          activeText="Connected"
          inactiveText="Not connected"
        />

        <div className="status-divider" aria-hidden="true" />

        <div className="game-status" title={`${discSerial} - ${loadedGame}`}>
          <span className="game-status-serial">{discSerial}</span>
          <span className="game-status-separator">-</span>
          <span className="game-status-title">{loadedGame}</span>
        </div>
      </div>

      {error ? <p className="error">Unable to query backend: {error}</p> : null}
    </section>
  )
}