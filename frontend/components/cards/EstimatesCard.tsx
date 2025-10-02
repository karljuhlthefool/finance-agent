import { ToolCardProps } from './types'

const formatNumber = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(2)
}

export default function EstimatesCard({ envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-estimates-get failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to fetch estimates.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const metrics = payload.metrics ?? {}
  const provenance = payload.provenance ?? []
  const path = result.estimates ?? result.path ?? payload.paths?.[0]
  const provTicker = provenance?.[0]?.meta?.ticker ?? provenance?.[0]?.meta?.symbol
  const ticker = payload.ticker ?? provTicker ?? 'Ticker'
  const metric = payload.metric ?? provenance?.[0]?.meta?.metric ?? 'Metric'

  const preview = Array.isArray(result.preview) ? result.preview : undefined

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Estimates retrieved</div>
          <h3 className="card-title">{ticker} · {metric}</h3>
        </div>
        <span className="badge">mf-estimates-get</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          {typeof metrics.t_ms === 'number' && (
            <div className="metric">
              <span className="metric-label">Runtime</span>
              <span className="metric-value">{metrics.t_ms} ms</span>
            </div>
          )}
          {typeof metrics.cost_estimate === 'number' && (
            <div className="metric">
              <span className="metric-label">Cost</span>
              <span className="metric-value">${metrics.cost_estimate.toFixed(2)}</span>
            </div>
          )}
        </div>

        {path && (
          <div className="file-list" style={{ marginTop: '12px' }}>
            <div className="file-item">
              <strong>Saved JSON</strong>
              <span className="muted">{path}</span>
            </div>
          </div>
        )}

        {preview && preview.length > 0 && (
          <div>
            <div className="muted">Preview</div>
            <div className="preview-grid">
              {preview.slice(0, 6).map((entry: any, index: number) => (
                <div key={index} className="preview-cell">
                  <span className="muted">{entry?.period ?? entry?.label ?? `Year ${index + 1}`}</span>
                  <strong>{formatNumber(entry?.value ?? entry?.estimate)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
