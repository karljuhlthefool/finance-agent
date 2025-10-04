'use client'

import { cn } from '@/lib/utils'

interface MetricDisplayProps {
  label?: string
  value: string | number
  icon?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MetricDisplay({
  label,
  value,
  icon,
  variant = 'default',
  size = 'sm',
  className
}: MetricDisplayProps) {
  const variantClasses = {
    default: 'text-slate-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  return (
    <div className={cn('flex items-center gap-1', sizeClasses[size], className)}>
      {icon && <span className="opacity-70">{icon}</span>}
      {label && <span className="text-slate-500">{label}:</span>}
      <span className={cn('font-medium', variantClasses[variant])}>
        {value}
      </span>
    </div>
  )
}

// Helper functions for common formats
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function formatCount(count: number, singular: string, plural?: string): string {
  const label = count === 1 ? singular : (plural || `${singular}s`)
  return `${count} ${label}`
}

