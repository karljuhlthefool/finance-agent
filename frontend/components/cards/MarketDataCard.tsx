import { ToolCardProps } from './types'

const formatBytes = (bytes: number | undefined): string => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`
}

export default function MarketDataCard({ envelope }: ToolCardProps) {
  if (!envelope) return null
  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-market-get failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to fetch market data.'}</p>
        {envelope.stderr && <pre className="code-block" style={{ marginTop: '12px' }}>{envelope.stderr}</pre>}
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const paths: string[] = payload.paths ?? []
  const metrics = payload.metrics ?? {}
  const provenance = payload.provenance ?? []
  const ticker = payload.ticker ?? provenance?.[0]?.ticker ?? 'Requested ticker'
  const fields = Array.isArray(payload.fields) ? payload.fields : Object.keys(result)

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Market dataset fetched</div>
          <h3 className="card-title">{ticker}</h3>
        </div>
        <span className="badge">mf-market-get</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          {fields?.length > 0 && (
            <div className="metric">
              <span className="metric-label">Fields</span>
              <span className="metric-value">{fields.join(', ')}</span>
            </div>
          )}
          {typeof metrics.t_ms === 'number' && (
            <div className="metric">
              <span className="metric-label">Runtime</span>
              <span className="metric-value">{metrics.t_ms} ms</span>
            </div>
          )}
          {typeof metrics.bytes === 'number' && (
            <div className="metric">
              <span className="metric-label">Payload size</span>
              <span className="metric-value">{formatBytes(metrics.bytes)}</span>
            </div>
          )}
        </div>

        {paths?.length > 0 && (
          <div>
            <div className="muted">Saved files</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              {paths.map(path => (
                <div key={path} className="file-item">
                  <strong>{path}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {provenance?.length > 0 && (
          <div>
            <div className="muted">Provenance</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              {provenance.slice(0, 3).map((entry: any, index: number) => (
                <div key={index} className="file-item">
                  <strong>{entry?.source ?? 'Source'}</strong>
                  {entry?.fetched_at && <span className="muted">{entry.fetched_at}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
