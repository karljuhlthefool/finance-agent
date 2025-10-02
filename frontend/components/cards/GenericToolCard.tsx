'use client'

type Props = {
  tool: string
  payload: any
}

export default function GenericToolCard({ tool, payload }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{tool}</div>
      <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  )
}
