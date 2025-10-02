import { ToolCardProps, ToolEnvelope } from './types'

const normalizePayload = (payload: ToolEnvelope | null): ToolEnvelope => {
  if (!payload) return {}
  if ((payload as any).hookSpecificOutput?.normalized) {
    return (payload as any).hookSpecificOutput.normalized
  }
  if ((payload as any).normalized) {
    return (payload as any).normalized
  }
  if ((payload as any).json) {
    return (payload as any).json
  }
  return payload
}

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

export default function GenericToolCard({ tool, envelope }: ToolCardProps) {
  const normalized = normalizePayload(envelope ?? {})

  if (normalized && normalized.ok === false) {
    return (
      <div className="card error-card">
        <h4>{tool ?? 'Tool'} failed</h4>
        <p className="muted">{normalized.error ?? 'The tool returned an error.'}</p>
      </div>
    )
  }

  const label = tool ?? normalized.tool ?? 'Tool result'
  const data = normalized.data ?? normalized
  const serialized = stringify(data)

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">{label}</div>
          <h3 className="card-title">Structured output</h3>
        </div>
        <span className="badge">{label}</span>
      </div>
      <div className="card-body">
        <pre className="code-block">{serialized}</pre>
      </div>
    </div>
  )
}
