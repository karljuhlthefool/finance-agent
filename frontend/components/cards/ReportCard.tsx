'use client'

type Props = {
  result: {
    ok?: boolean
    data?: any
    error?: string
  }
}

export default function ReportCard({ result }: Props) {
  if (!result?.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Error: {result?.error ?? 'Unknown failure'}
      </div>
    )
  }

  const summary = result.data?.summary ?? result.data?.result ?? result.data
  const series = result.data?.growth ?? result.data?.series

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Report</h3>
      {summary && (
        <p className="mt-2 text-sm text-slate-700">
          {typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2)}
        </p>
      )}
      {Array.isArray(series) && series.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {series.slice(0, 5).map((entry: any, index: number) => (
            <li key={index} className="rounded bg-slate-100 px-2 py-1 font-mono">
              {JSON.stringify(entry)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
