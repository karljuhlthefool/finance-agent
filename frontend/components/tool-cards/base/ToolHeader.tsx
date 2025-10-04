'use client'

import { cn } from '@/lib/utils'
import { StatusBadge, type ToolStatus } from '@/components/visualizations/StatusBadge'
import { MetricDisplay, formatDuration } from '@/components/visualizations/MetricDisplay'
import { getToolConfig } from '@/lib/tool-store'

interface ToolHeaderProps {
  cliTool?: string
  toolName?: string
  status: ToolStatus
  elapsed: number
  metadata?: Record<string, any>
  args?: Record<string, any>
  description?: string
  className?: string
}

export function ToolHeader({
  cliTool,
  toolName,
  status,
  elapsed,
  metadata,
  args,
  description,
  className
}: ToolHeaderProps) {
  const config = getToolConfig(cliTool, toolName, metadata)
  
  // Get display args (prefer metadata for CLI tools, args for others)
  const displayArgs = metadata && Object.keys(metadata).length > 0 ? metadata : args
  
  // Format args for display (key: value pairs)
  const formatArgValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    const strValue = String(value)
    // Abbreviate long file paths - show just the filename
    if (strValue.includes('/') && strValue.length > 40) {
      const parts = strValue.split('/')
      return parts[parts.length - 1]
    }
    return strValue
  }
  
  // Filter out non-relevant metadata
  const relevantArgs = displayArgs ? Object.entries(displayArgs).filter(([key]) => 
    !['ok', 'result', 'paths', 'metrics', 'provenance'].includes(key)
  ) : []
  
  return (
    <div className={cn(
      'flex items-start justify-between gap-2 min-w-0',
      className
    )}>
      {/* Left: Icon + Name + Args + Description */}
      <div className="flex items-start gap-1.5 min-w-0 flex-1">
        <span className="text-sm flex-shrink-0 mt-[1px]">{config.icon}</span>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          {/* Tool name */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-700 leading-none">
              {config.name}
            </span>
            {elapsed > 0 && (
              <span className="text-[9px] text-slate-400 font-mono">
                {formatDuration(elapsed)}
              </span>
            )}
          </div>
          
          {/* Description - if provided */}
          {description && (
            <div className="text-[10px] text-slate-600 italic leading-tight">
              {description}
            </div>
          )}
          
          {/* Arguments - compact inline with clear key=value format */}
          {relevantArgs.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] leading-none">
              {relevantArgs.map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-0.5">
                  <span className="font-semibold text-slate-600">{key}</span>
                  <span className="text-slate-400">=</span>
                  <span className="text-slate-700 font-mono bg-slate-50 px-1 rounded">{formatArgValue(value)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Right: Status indicator */}
      <div className="flex-shrink-0 mt-[1px]">
        {status === 'complete' && (
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100">
            <span className="text-green-600 text-[10px]">✓</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-100">
            <span className="text-red-600 text-[10px]">✗</span>
          </div>
        )}
        {(status === 'intent' || status === 'executing') && (
          <StatusBadge status={status} showIcon />
        )}
      </div>
    </div>
  )
}

