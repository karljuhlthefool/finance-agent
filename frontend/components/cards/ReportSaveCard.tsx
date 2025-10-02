import { ToolCardProps } from './types'

export default function ReportSaveCard({ envelope }: ToolCardProps) {
  if (!envelope) return null
  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-report-save failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to persist the report to disk.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const reportPath: string | undefined = result.report_path ?? result.reportPath
  const metadataPath: string | undefined = result.metadata_path ?? result.metadataPath

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Report saved</div>
          <h3 className="card-title">{result.type ? result.type.toString().toUpperCase() : 'Agent analysis'}</h3>
        </div>
        <span className="badge">mf-report-save</span>
      </div>

      <div className="card-body">
        {result.word_count !== undefined && (
          <div className="metric-row">
            <div className="metric">
              <span className="metric-label">Word count</span>
              <span className="metric-value">{result.word_count}</span>
            </div>
            {result.line_count !== undefined && (
              <div className="metric">
                <span className="metric-label">Line count</span>
                <span className="metric-value">{result.line_count}</span>
              </div>
            )}
          </div>
        )}

        <div className="file-list">
          {reportPath && (
            <div className="file-item">
              <strong>Markdown report</strong>
              <span className="muted">{reportPath}</span>
            </div>
          )}
          {metadataPath && (
            <div className="file-item">
              <strong>Metadata</strong>
              <span className="muted">{metadataPath}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
