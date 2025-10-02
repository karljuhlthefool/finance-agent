import { ToolCardProps } from './types'

const stringify = (value: unknown): string => {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

export default function JsonExtractCard({ envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-extract-json failed</h4>
        <p className="muted">{envelope.error ?? 'Extraction failed.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result
  const metrics = payload.metrics ?? {}
  const provenance = payload.provenance ?? []
  const method = provenance?.[0]?.meta?.method ?? 'extraction'

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">JSON extracted</div>
          <h3 className="card-title">{method === 'path-based' ? 'Path result' : 'LLM extraction'}</h3>
        </div>
        <span className="badge">mf-extract-json</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          {typeof metrics.t_ms === 'number' && (
            <div className="metric">
              <span className="metric-label">Runtime</span>
              <span className="metric-value">{metrics.t_ms} ms</span>
            </div>
          )}
          {typeof metrics.cost_estimate === 'number' && metrics.cost_estimate > 0 && (
            <div className="metric">
              <span className="metric-label">Cost (est.)</span>
              <span className="metric-value">${metrics.cost_estimate.toFixed(3)}</span>
            </div>
          )}
        </div>

        <pre className="code-block">{stringify(result)}</pre>
      </div>
    </div>
  )
}
