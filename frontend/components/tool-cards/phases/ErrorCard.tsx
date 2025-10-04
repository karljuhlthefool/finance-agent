'use client'

import { ToolHeader } from '../base/ToolHeader'
import { ToolBody } from '../base/ToolBody'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ErrorCardProps {
  cliTool?: string
  toolName?: string
  metadata?: Record<string, any>
  args?: Record<string, any>
  description?: string
  elapsed: number
  error?: string
  hint?: string
  technicalDetails?: any
  onRetry?: () => void
  className?: string
}

export function ErrorCard({
  cliTool,
  toolName,
  metadata,
  args,
  description,
  elapsed,
  error,
  hint,
  technicalDetails,
  onRetry,
  className
}: ErrorCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <div className={cn(
      'group rounded-md bg-white',
      'ring-1 ring-red-200/60',
      'hover:ring-red-300/80 hover:shadow-sm',
      'transition-all duration-150',
      className
    )}>
      {/* Header */}
      <div className="px-2.5 py-1.5 bg-red-50/30 rounded-t-md">
        <ToolHeader 
          cliTool={cliTool}
          toolName={toolName}
          status="error"
          elapsed={elapsed}
          metadata={metadata}
          args={args}
          description={description}
        />
      </div>
      
      {/* Error Content */}
      <div className="px-2.5 py-2 space-y-1.5">
        {/* Error message */}
        <p className="text-[10px] text-red-700 leading-snug">
          {error || 'Execution failed'}
        </p>
        
        {/* Hint if available */}
        {hint && (
          <p className="text-[9px] text-red-600 bg-red-50 rounded px-1.5 py-1 border border-red-100">
            💡 {hint}
          </p>
        )}
        
        {/* Technical Details (Collapsible) */}
        {technicalDetails && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[9px] text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-0.5 transition-colors"
          >
            <span className="text-[8px]">{showDetails ? '▼' : '▶'}</span>
            <span>Details</span>
          </button>
        )}
        
        {showDetails && technicalDetails && (
          <pre className="text-[8px] bg-red-50/50 rounded px-1.5 py-1 border border-red-100 overflow-x-auto font-mono text-red-700">
            {JSON.stringify(technicalDetails, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

