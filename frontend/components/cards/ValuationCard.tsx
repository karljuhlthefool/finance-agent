import { ToolCardProps } from './types'

const formatCurrency = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function ValuationCard({ envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>mf-valuation-basic-dcf failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to run valuation.'}</p>
      </div>
    )
  }

  const payload = envelope.data ?? {}
  const result = payload.result ?? {}
  const scenarios: Array<{ name: string; npv: number; per_share: number }> = result.scenarios ?? []
  const tablePath = result.table ?? payload.paths?.[0]
  const metrics = payload.metrics ?? {}

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">DCF scenarios</div>
          <h3 className="card-title">Valuation summary</h3>
        </div>
        <span className="badge">mf-valuation-basic-dcf</span>
      </div>

      <div className="card-body">
        {Array.isArray(scenarios) && scenarios.length > 0 && (
          <div className="scenario-grid">
            {scenarios.map((scenario, index) => (
              <div key={index} className="scenario-card">
                <span className="muted">{scenario.name}</span>
                <strong>{formatCurrency(scenario.per_share)}</strong>
                <span className="muted">Equity value {formatCurrency(scenario.npv)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="metric-row">
          {typeof metrics.t_ms === 'number' && (
            <div className="metric">
              <span className="metric-label">Runtime</span>
              <span className="metric-value">{metrics.t_ms} ms</span>
            </div>
          )}
        </div>

        {tablePath && (
          <div className="file-list" style={{ marginTop: '12px' }}>
            <div className="file-item">
              <strong>Scenario table</strong>
              <span className="muted">{tablePath}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
