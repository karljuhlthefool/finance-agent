import { ToolCardProps } from './types'

const getPreview = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() ? value : null
  if (Array.isArray(value)) {
    return value.map(item => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n')
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

export default function FileCard({ envelope, tool }: ToolCardProps) {
  if (!envelope) return null
  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>{tool ?? 'File tool'} failed</h4>
        <p className="muted">{envelope.error ?? 'The filesystem tool reported an error.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const title = (() => {
    switch (tool) {
      case 'Read':
        return 'File preview'
      case 'Write':
        return 'File saved'
      case 'List':
        return 'Directory listing'
      case 'Glob':
        return 'Pattern matches'
      case 'Grep':
        return 'Search results'
      default:
        return 'File operation'
    }
  })()

  const path = payload.path ?? payload.file ?? payload.target ?? payload.directory ?? payload.cwd
  const entries = payload.entries ?? payload.matches ?? payload.results ?? payload.paths
  const preview = payload.content ?? payload.text ?? payload.body ?? payload.value
  const summary = getPreview(preview)

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">{tool ?? 'File tool'}</div>
          <h3 className="card-title">{title}</h3>
        </div>
        {path && <span className="badge">{path.toString().split('/').pop()}</span>}
      </div>

      <div className="card-body">
        {path && (
          <div className="file-item" style={{ padding: '12px 14px' }}>
            <strong>Path</strong>
            <span className="muted" style={{ wordBreak: 'break-all' }}>{path}</span>
          </div>
        )}

        {Array.isArray(entries) && entries.length > 0 && (
          <div>
            <div className="muted">Entries</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              {entries.slice(0, 10).map((entry: any, index: number) => (
                <div key={index} className="file-item">
                  <strong>{typeof entry === 'string' ? entry : JSON.stringify(entry)}</strong>
                </div>
              ))}
              {entries.length > 10 && (
                <span className="muted">…and {entries.length - 10} more</span>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div>
            <div className="muted">Preview</div>
            <pre className="code-block" style={{ marginTop: '8px' }}>{summary}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
