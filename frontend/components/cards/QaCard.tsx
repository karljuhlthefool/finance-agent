import { ToolCardProps } from './types'

const stringify = (value: unknown): string => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

export default function QaCard({ envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-qa failed</h4>
        <p className="muted">{envelope.error ?? 'Question answering failed.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const metrics = payload.metrics ?? {}
  const paths: string[] = payload.paths ?? []

  const displayResult = stringify(result)
  const isJson = typeof result !== 'string'

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Document Q&A</div>
          <h3 className="card-title">Answer</h3>
        </div>
        <span className="badge">mf-qa</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          {typeof metrics.chunks === 'number' && (
            <div className="metric">
              <span className="metric-label">Chunks</span>
              <span className="metric-value">{metrics.chunks}</span>
            </div>
          )}
          {typeof metrics.t_ms === 'number' && (
            <div className="metric">
              <span className="metric-label">Runtime</span>
              <span className="metric-value">{metrics.t_ms} ms</span>
            </div>
          )}
          {typeof metrics.cost_usd === 'number' && (
            <div className="metric">
              <span className="metric-label">Cost</span>
              <span className="metric-value">${metrics.cost_usd.toFixed(4)}</span>
            </div>
          )}
        </div>

        <pre className={`code-block ${isJson ? '' : 'code-block--text'}`}>{displayResult}</pre>

        {paths.length > 0 && (
          <div className="file-list" style={{ marginTop: '12px' }}>
            {paths.slice(0, 3).map(path => (
              <div key={path} className="file-item">
                <strong>Saved output</strong>
                <span className="muted">{path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
