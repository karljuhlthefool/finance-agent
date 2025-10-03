'use client'

import { useWorkspace } from '@/lib/workspace-context'

type Props = {
  tool: string
  payload: any
}

export default function GenericToolCard({ tool, payload }: Props) {
  const { setSelectedFile, setIsExpanded } = useWorkspace()
  
  const openFile = (path: string) => {
    // Extract relative path from absolute path
    // Agent returns paths like: /absolute/path/to/runtime/workspace/data/market/AAPL/file.json
    // We need: data/market/AAPL/file.json
    const workspacePart = path.split('/runtime/workspace/')[1] || path.split('/workspace/')[1]
    if (workspacePart) {
      setSelectedFile(workspacePart)
      setIsExpanded(true)
    } else {
      // Fallback: try to use the path as-is if it looks relative
      if (!path.startsWith('/')) {
        setSelectedFile(path)
        setIsExpanded(true)
      }
    }
  }
  
  // Check if payload has paths array
  const hasPaths = payload && Array.isArray(payload.paths) && payload.paths.length > 0
  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 font-semibold text-slate-700 text-sm flex items-center gap-2">
        <span>🔧</span>
        <span>{tool}</span>
      </div>
      
      {hasPaths && (
        <div className="mb-3 border-t border-slate-200 pt-2">
          <div className="text-xs text-slate-600 mb-1 font-medium">Files created:</div>
          <div className="flex flex-col gap-1">
            {payload.paths.map((path: string, idx: number) => (
              <button
                key={idx}
                onClick={() => openFile(path)}
                className="text-left text-xs text-blue-600 hover:text-blue-800 hover:underline bg-white px-2 py-1 rounded border border-blue-200 hover:border-blue-400 transition-colors flex items-center gap-2"
                title={path}
              >
                <span>📄</span>
                <span className="truncate">{path.split('/').pop()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  )
}
