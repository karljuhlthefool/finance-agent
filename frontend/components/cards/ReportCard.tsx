import { ToolCardProps } from './types'

export default function ReportCard({ envelope, tool }: ToolCardProps) {
  if (!envelope) return null
  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>{tool ?? 'Report'} failed</h4>
        <p className="muted">{envelope.error ?? 'The report tool returned an error.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? envelope
  const summary = payload.summary ?? payload.result ?? payload.output ?? payload

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">{tool ?? 'Report'}</div>
          <h3 className="card-title">Narrative summary</h3>
        </div>
        {tool && <span className="badge">{tool}</span>}
      </div>
      <div className="card-body">
        <p className="message-text">{typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2)}</p>
      </div>
    </div>
  )
}
