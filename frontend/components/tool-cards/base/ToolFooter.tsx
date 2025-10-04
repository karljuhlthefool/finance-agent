'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { useWorkspace } from '@/lib/workspace-context'

interface ToolFooterProps {
  paths?: string[]
  metrics?: {
    bytes?: number
    t_ms?: number
    fields_fetched?: number
    [key: string]: any
  }
  children?: ReactNode
  className?: string
}

export function ToolFooter({ paths, metrics, children, className }: ToolFooterProps) {
  const { setSelectedFile, setIsExpanded } = useWorkspace()
  
  const handleFileClick = (path: string) => {
    // Extract workspace-relative path
    const workspacePart = path.split('/runtime/workspace/')[1] 
      || path.split('/workspace/')[1] 
      || path
    
    setSelectedFile(workspacePart)
    setIsExpanded(true)
  }
  
  if (!paths && !children && !metrics) return null
  
  return (
    <div className={cn(
      'px-3 pb-3 pt-2 border-t border-slate-100 space-y-2',
      className
    )}>
      {/* File Paths */}
      {paths && paths.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-600">
            📁 Files ({paths.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {paths.map((path, idx) => {
              const fileName = path.split('/').pop() || path
              const shortPath = path.split('/').slice(-2).join('/')
              
              return (
                <button
                  key={idx}
                  onClick={() => handleFileClick(path)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors font-mono"
                  title={path}
                >
                  {shortPath}
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Custom content */}
      {children}
    </div>
  )
}

