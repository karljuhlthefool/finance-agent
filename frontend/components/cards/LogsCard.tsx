'use client'

export default function LogsCard({ lines }: { lines: string[] }) {
  if (!lines?.length) return null

  return (
    <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-950/90 p-3 text-xs text-slate-100">
      {lines.join('\n')}
    </pre>
  )
}
