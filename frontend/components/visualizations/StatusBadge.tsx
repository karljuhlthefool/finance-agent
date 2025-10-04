'use client'

import { cn } from '@/lib/utils'

export type ToolStatus = 'idle' | 'intent' | 'executing' | 'processing' | 'complete' | 'error'

interface StatusBadgeProps {
  status: ToolStatus
  className?: string
  showIcon?: boolean
  showText?: boolean
}

export function StatusBadge({ 
  status, 
  className,
  showIcon = true,
  showText = false
}: StatusBadgeProps) {
  const config = {
    idle: {
      icon: '○',
      text: 'Idle',
      classes: 'bg-slate-100 text-slate-600 border-slate-300'
    },
    intent: {
      icon: '◌',
      text: 'Preparing',
      classes: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    executing: {
      icon: '●',
      text: 'Running',
      classes: 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse'
    },
    processing: {
      icon: '◐',
      text: 'Processing',
      classes: 'bg-purple-100 text-purple-700 border-purple-300'
    },
    complete: {
      icon: '✓',
      text: 'Complete',
      classes: 'bg-green-100 text-green-700 border-green-300'
    },
    error: {
      icon: '✗',
      text: 'Error',
      classes: 'bg-red-100 text-red-700 border-red-300'
    }
  }
  
  const { icon, text, classes } = config[status]
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border',
      classes,
      className
    )}>
      {showIcon && <span>{icon}</span>}
      {showText && <span>{text}</span>}
    </span>
  )
}

