'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value?: number // 0-100, undefined for indeterminate
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function ProgressBar({ 
  value, 
  className,
  size = 'md',
  variant = 'default'
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }
  
  const variantClasses = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }
  
  const isIndeterminate = value === undefined
  
  return (
    <div className={cn('w-full rounded-full bg-slate-200 overflow-hidden', sizeClasses[size], className)}>
      <div
        className={cn(
          'h-full transition-all duration-300 ease-out',
          variantClasses[variant],
          isIndeterminate && 'w-1/3 animate-[slide_1.5s_ease-in-out_infinite]'
        )}
        style={!isIndeterminate ? { width: `${value}%` } : undefined}
      />
    </div>
  )
}

