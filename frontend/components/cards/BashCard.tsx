import { ToolCardProps } from './types'

const getText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

export default function BashCard({ envelope, tool }: ToolCardProps) {
  if (!envelope) return null
  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>{tool ?? 'Bash'} failed</h4>
        <p className="muted">{envelope.error ?? 'The command returned a non-zero exit code.'}</p>
        {envelope.stderr && <pre className="code-block" style={{ marginTop: '12px' }}>{envelope.stderr}</pre>}
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const command = payload.command ?? payload.cmd
  const stdout = getText(payload.stdout ?? payload.output ?? payload.data)
  const stderr = getText(payload.stderr ?? envelope.stderr)
  const exitCode = payload.exitCode ?? payload.exit_code

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Shell command</div>
          <h3 className="card-title">{command ?? 'Bash execution'}</h3>
        </div>
        <span className="badge">{tool ?? 'Bash'}</span>
      </div>
      <div className="card-body">
        {exitCode !== undefined && (
          <div className="metric-row">
            <div className="metric">
              <span className="metric-label">Exit code</span>
              <span className="metric-value">{exitCode}</span>
            </div>
          </div>
        )}
        {stdout && (
          <div>
            <div className="muted">Stdout</div>
            <pre className="code-block" style={{ marginTop: '8px' }}>{stdout}</pre>
          </div>
        )}
        {stderr && stderr.trim().length > 0 && (
          <div>
            <div className="muted">Stderr</div>
            <pre className="code-block" style={{ marginTop: '8px', background: '#1f2937' }}>{stderr}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
