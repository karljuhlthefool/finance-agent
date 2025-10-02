import { ReactNode } from 'react'

export default function LogsCard({ lines, title }: { lines: string[]; title?: ReactNode }) {
  if (!lines?.length) return null

  return (
    <div>
      {title && <div className="muted" style={{ marginBottom: '6px' }}>{title}</div>}
      <div className="log-card">{lines.join('\n')}</div>
    </div>
  )
}
