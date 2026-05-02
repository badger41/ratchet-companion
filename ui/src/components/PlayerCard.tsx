type PlayerPosition = {
  x: number
  y: number
  z: number
}

type PlayerCardProps = {
  title: string
  position: PlayerPosition | null
}

function formatCoordinate(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—'
}

export function PlayerCard({ title, position }: PlayerCardProps) {
  return (
    <section className="player-card-shell">
      <div className="player-card">
        <div className="player-card-header">
          <h2>{title}</h2>
          <span className={`player-card-badge ${position ? 'is-live' : 'is-empty'}`}>
            {position ? 'Live' : 'Unavailable'}
          </span>
        </div>

        <div className="player-card-grid">
          <div className="player-stat">
            <span className="player-stat-label">X</span>
            <span className="player-stat-value">{formatCoordinate(position?.x)}</span>
          </div>

          <div className="player-stat">
            <span className="player-stat-label">Y</span>
            <span className="player-stat-value">{formatCoordinate(position?.y)}</span>
          </div>

          <div className="player-stat">
            <span className="player-stat-label">Z</span>
            <span className="player-stat-value">{formatCoordinate(position?.z)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}