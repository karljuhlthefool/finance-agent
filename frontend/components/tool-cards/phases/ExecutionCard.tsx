'use client'

import { ToolHeader } from '../base/ToolHeader'
import { ToolBody } from '../base/ToolBody'
import { ProgressBar } from '@/components/visualizations/ProgressBar'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { getToolConfig } from '@/lib/tool-store'

interface ExecutionCardProps {
  cliTool?: string
  toolName?: string
  metadata?: Record<string, any>
  args?: Record<string, any>
  description?: string
  elapsed: number
  progress?: number
  status?: string
  className?: string
}

export function ExecutionCard({
  cliTool,
  toolName,
  metadata,
  args,
  description,
  elapsed,
  progress,
  status,
  className
}: ExecutionCardProps) {
  // Progressive status messages based on elapsed time
  const [currentStatus, setCurrentStatus] = useState(status || 'Starting...')
  
  useEffect(() => {
    if (status) {
      setCurrentStatus(status)
      return
    }
    
    // Auto-generate status messages if not provided
    if (elapsed < 500) {
      setCurrentStatus('Preparing request...')
    } else if (elapsed < 2000) {
      setCurrentStatus('Executing command...')
    } else if (elapsed < 5000) {
      setCurrentStatus('Processing data...')
    } else if (elapsed < 10000) {
      setCurrentStatus('Finalizing...')
    } else if (elapsed < 30000) {
      setCurrentStatus('Still working...')
    } else if (elapsed < 60000) {
      setCurrentStatus('Taking longer than expected...')
    } else {
      setCurrentStatus('Long-running operation...')
    }
  }, [elapsed, status])
  
  // Get tool-specific color
  const toolConfig = getToolConfig(cliTool)
  const colorMap: Record<string, { border: string; bg: string; text: string; dot: string }> = {
    blue: { border: 'border-blue-200', bg: 'from-blue-50', text: 'text-blue-900', dot: 'bg-blue-500' },
    green: { border: 'border-green-200', bg: 'from-green-50', text: 'text-green-900', dot: 'bg-green-500' },
    purple: { border: 'border-purple-200', bg: 'from-purple-50', text: 'text-purple-900', dot: 'bg-purple-500' },
    yellow: { border: 'border-yellow-200', bg: 'from-yellow-50', text: 'text-yellow-900', dot: 'bg-yellow-500' },
    orange: { border: 'border-orange-200', bg: 'from-orange-50', text: 'text-orange-900', dot: 'bg-orange-500' },
    indigo: { border: 'border-indigo-200', bg: 'from-indigo-50', text: 'text-indigo-900', dot: 'bg-indigo-500' },
    cyan: { border: 'border-cyan-200', bg: 'from-cyan-50', text: 'text-cyan-900', dot: 'bg-cyan-500' },
    teal: { border: 'border-teal-200', bg: 'from-teal-50', text: 'text-teal-900', dot: 'bg-teal-500' },
    pink: { border: 'border-pink-200', bg: 'from-pink-50', text: 'text-pink-900', dot: 'bg-pink-500' },
    slate: { border: 'border-slate-200', bg: 'from-slate-50', text: 'text-slate-900', dot: 'bg-slate-500' },
    gray: { border: 'border-gray-200', bg: 'from-gray-50', text: 'text-gray-900', dot: 'bg-gray-500' },
  }
  const colors = colorMap[toolConfig.color] || colorMap.blue
  
  return (
    <div className={cn(
      'rounded-lg border bg-gradient-to-br to-white shadow-sm',
      colors.border,
      colors.bg,
      className
    )}>
      <ToolHeader 
        cliTool={cliTool}
        toolName={toolName}
        status="executing"
        elapsed={elapsed}
        metadata={metadata}
        args={args}
        description={description}
      />
      
      <ToolBody>
        {/* Compact progress indicator */}
        <ProgressBar 
          value={progress}
          variant="default"
          size="sm"
        />
      </ToolBody>
    </div>
  )
}

