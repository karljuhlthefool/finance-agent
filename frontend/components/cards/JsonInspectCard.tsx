import { ToolCardProps } from './types'

const stringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

export default function JsonInspectCard({ envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-json-inspect failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to inspect JSON.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const summary = result.summary ?? {}
  const hints: string[] = result.path_hints ?? []
  const structure = result.structure ?? {}

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">JSON inspected</div>
          <h3 className="card-title">{summary.top_level_type ?? 'Structure'}</h3>
        </div>
        <span className="badge">mf-json-inspect</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          {Array.isArray(summary.top_level_keys) && summary.top_level_keys.length > 0 && (
            <div className="metric">
              <span className="metric-label">Top level keys</span>
              <span className="metric-value">{summary.top_level_keys.slice(0, 4).join(', ')}</span>
            </div>
          )}
          {typeof summary.total_keys === 'number' && (
            <div className="metric">
              <span className="metric-label">Total keys</span>
              <span className="metric-value">{summary.total_keys}</span>
            </div>
          )}
          {typeof payload.metrics?.t_ms === 'number' && (
            <div className="metric">
              <span className="metric-label">Runtime</span>
              <span className="metric-value">{payload.metrics.t_ms} ms</span>
            </div>
          )}
        </div>

        {hints.length > 0 && (
          <div>
            <div className="muted">Suggested paths</div>
            <ul className="pill-list">
              {hints.slice(0, 12).map((hint, index) => (
                <li key={index} className="pill">
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="details" open>
          <summary>Structure preview</summary>
          <pre className="code-block">{stringify(structure)}</pre>
        </details>
      </div>
    </div>
  )
}
