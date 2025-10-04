'use client'

import { ToolHeader } from '../base/ToolHeader'
import { ToolBody } from '../base/ToolBody'
import { cn } from '@/lib/utils'

interface IntentCardProps {
  cliTool?: string
  toolName?: string
  metadata?: Record<string, any>
  args?: Record<string, any>
  description?: string
  elapsed: number
  className?: string
}

export function IntentCard({
  cliTool,
  toolName,
  metadata,
  args,
  description,
  elapsed,
  className
}: IntentCardProps) {
  return (
    <div className={cn(
      'rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200',
      'hover:shadow-md',
      className
    )}>
      <ToolHeader 
        cliTool={cliTool}
        toolName={toolName}
        status="intent"
        elapsed={elapsed}
        metadata={metadata}
        args={args}
        description={description}
      />
      
      {/* Show preparing message briefly */}
      {elapsed < 200 && (
        <ToolBody>
          <div className="text-xs text-slate-500 italic">
            Preparing request...
          </div>
        </ToolBody>
      )}
    </div>
  )
}

