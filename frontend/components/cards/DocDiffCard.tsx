import { ToolCardProps } from './types'

const formatNumber = (value: number | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return value.toLocaleString()
}

export default function DocDiffCard({ envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-doc-diff failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to diff documents.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const diffSummary = result.diff_summary ?? {}
  const outputFile = result.output_file ?? payload.paths?.[0]

  const lineStats = diffSummary.stats ?? diffSummary

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Documents compared</div>
          <h3 className="card-title">Diff summary</h3>
        </div>
        <span className="badge">mf-doc-diff</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Lines added</span>
            <span className="metric-value">{formatNumber(lineStats.lines_added ?? lineStats.added)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Lines removed</span>
            <span className="metric-value">{formatNumber(lineStats.lines_removed ?? lineStats.removed)}</span>
          </div>
          {typeof lineStats.total_changes === 'number' && (
            <div className="metric">
              <span className="metric-label">Total changes</span>
              <span className="metric-value">{formatNumber(lineStats.total_changes)}</span>
            </div>
          )}
        </div>

        {Array.isArray(diffSummary.added) && diffSummary.added.length > 0 && (
          <div>
            <div className="muted">Sample additions</div>
            <ul className="preview-list">
              {diffSummary.added.slice(0, 3).map((line: string, index: number) => (
                <li key={index}>+ {line}</li>
              ))}
            </ul>
          </div>
        )}

        {outputFile && (
          <div className="file-list" style={{ marginTop: '12px' }}>
            <div className="file-item">
              <strong>Detailed diff</strong>
              <span className="muted">{outputFile}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
