import { ToolCardProps } from './types'

const formatNumber = (value: unknown): string => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    const abs = Math.abs(value)
    const formatter = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: abs < 1 ? 4 : abs < 100 ? 3 : 2
    })
    return formatter.format(value)
  }
  return String(value)
}

const formatPercent = (value: unknown): string | null => {
  if (typeof value !== 'number') return null
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    signDisplay: 'always'
  })
  return `${formatter.format(value)}%`
}

export default function CalcCard({ envelope }: ToolCardProps) {
  if (!envelope) return null
  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-calc-simple failed</h4>
        <p className="muted">{envelope.error ?? 'Unknown failure while running the calculator.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const metrics = payload.metrics ?? {}
  const paths: string[] = payload.paths ?? []
  const provenance = payload.provenance ?? []
  const opSource =
    provenance?.[0]?.meta?.operation ??
    provenance?.[0]?.operation ??
    payload.operation ??
    payload.mode ??
    'calculation'
  const operation = typeof opSource === 'string' ? opSource : 'calculation'

  const highlight = (() => {
    if (typeof result.delta_pct === 'number' || typeof result.delta_abs === 'number') {
      return {
        label: 'Delta',
        value: formatPercent(result.delta_pct) ?? formatNumber(result.delta_abs),
        secondary: typeof result.delta_abs === 'number' ? `${formatNumber(result.delta_abs)} abs` : null
      }
    }
    if (typeof result.sum === 'number') {
      return { label: 'Total', value: formatNumber(result.sum), secondary: `${result.count ?? ''} values` }
    }
    if (typeof result.average === 'number') {
      return { label: 'Average', value: formatNumber(result.average), secondary: `${result.count ?? ''} samples` }
    }
    return null
  })()

  const growthSeries: Array<{ date: string; value: number; delta_pct?: number }> | null = Array.isArray(result.growth)
    ? result.growth.slice(0, 4)
    : null

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Deterministic calculation</div>
          <h3 className="card-title">{operation.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())}</h3>
        </div>
        <span className="badge">mf-calc-simple</span>
      </div>

      <div className="card-body">
        {highlight && (
          <div className="metric">
            <span className="metric-label">{highlight.label}</span>
            <span className="metric-value">{highlight.value}</span>
            {highlight.secondary && <div className="muted">{highlight.secondary}</div>}
          </div>
        )}

        <div className="metric-row">
          {result.current !== undefined && (
            <div className="metric">
              <span className="metric-label">Current</span>
              <span className="metric-value">{formatNumber(result.current)}</span>
            </div>
          )}
          {result.previous !== undefined && (
            <div className="metric">
              <span className="metric-label">Previous</span>
              <span className="metric-value">{formatNumber(result.previous)}</span>
            </div>
          )}
          {typeof metrics.t_ms === 'number' && (
            <div className="metric">
              <span className="metric-label">Runtime</span>
              <span className="metric-value">{metrics.t_ms} ms</span>
            </div>
          )}
        </div>

        {growthSeries && growthSeries.length > 0 && (
          <div>
            <div className="muted">Recent growth samples</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              {growthSeries.map((entry, index) => (
                <div key={index} className="file-item">
                  <strong>{entry.date}</strong>
                  <span className="muted">Value: {formatNumber(entry.value)}</span>
                  {typeof entry.delta_pct === 'number' && (
                    <span className="muted">Δ {formatPercent(entry.delta_pct)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {paths?.length > 0 && (
          <div>
            <div className="muted">Saved outputs</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              {paths.map(path => (
                <div key={path} className="file-item">
                  <strong>{path}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
