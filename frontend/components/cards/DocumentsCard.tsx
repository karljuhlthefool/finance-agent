import { ToolCardProps } from './types'

const formatBytes = (bytes: number | undefined | null): string => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const order = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** order
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(decimals)} ${units[order]}`
}

export default function DocumentsCard({ envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-documents-get failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to retrieve filing.'}</p>
        {envelope.stderr && <pre className="code-block">{envelope.stderr}</pre>}
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const metrics = payload.metrics ?? {}
  const provenance = payload.provenance ?? []
  const paths: string[] = payload.paths ?? []

  const filingDate = result.filing_date ?? result.filingDate
  const form = result.form ?? 'Filing'
  const mainText = result.main_text ?? result.mainText
  const exhibitsIndex = result.exhibits_index ?? result.exhibitsIndex

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Filing downloaded</div>
          <h3 className="card-title">{form}</h3>
        </div>
        <span className="badge">mf-documents-get</span>
      </div>

      <div className="card-body">
        <div className="metric-row">
          {filingDate && (
            <div className="metric">
              <span className="metric-label">Filing date</span>
              <span className="metric-value">{filingDate}</span>
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
              <span className="metric-label">Bytes</span>
              <span className="metric-value">{formatBytes(metrics.bytes)}</span>
            </div>
          )}
          {typeof metrics.downloaded === 'number' && (
            <div className="metric">
              <span className="metric-label">Files saved</span>
              <span className="metric-value">{metrics.downloaded}</span>
            </div>
          )}
        </div>

        <div className="file-list" style={{ marginTop: '12px' }}>
          {mainText && (
            <div className="file-item">
              <strong>Main text</strong>
              <span className="muted">{mainText}</span>
            </div>
          )}
          {exhibitsIndex && (
            <div className="file-item">
              <strong>Exhibits index</strong>
              <span className="muted">{exhibitsIndex}</span>
            </div>
          )}
          {paths
            .filter(path => path !== mainText && path !== exhibitsIndex)
            .map(path => (
              <div key={path} className="file-item">
                <strong>Saved artifact</strong>
                <span className="muted">{path}</span>
              </div>
            ))}
        </div>

        {provenance?.length > 0 && (
          <div className="provenance">
            <div className="muted">Provenance</div>
            <ul className="pill-list">
              {provenance.slice(0, 4).map((item: any, index: number) => (
                <li key={index} className="pill">
                  {item?.source ?? 'Source'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
