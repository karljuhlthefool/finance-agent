'use client'

import { ReactNode } from 'react'

type ProgressIndicatorProps = {
  type: 'indeterminate' | 'determinate' | 'steps'
  value?: number
  max?: number
  message?: string
  steps?: Array<{ label: string; status: 'done' | 'active' | 'pending' }>
  className?: string
}

export default function ProgressIndicator({ 
  type, 
  value, 
  max = 100, 
  message,
  steps,
  className = '' 
}: ProgressIndicatorProps) {
  if (type === 'indeterminate') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></div>
        </div>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    )
  }

  if (type === 'determinate') {
    const percentage = Math.min(100, Math.max(0, (value || 0) / max * 100))
    
    return (
      <div className={`w-full ${className}`}>
        {message && <div className="mb-2 text-sm text-slate-600">{message}</div>}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1 text-right text-xs text-slate-500">
          {Math.round(percentage)}%
        </div>
      </div>
    )
  }

  if (type === 'steps' && steps) {
    return (
      <div className={`space-y-2 ${className}`}>
        {steps.map((step, idx) => {
          const Icon = step.status === 'done' ? '✓' : step.status === 'active' ? '⏳' : '○'
          const color = step.status === 'done' ? 'text-green-600' : step.status === 'active' ? 'text-blue-600' : 'text-slate-400'
          
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className={`text-lg ${color}`}>{Icon}</span>
              <span className={`text-sm ${step.status === 'active' ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return null
}

