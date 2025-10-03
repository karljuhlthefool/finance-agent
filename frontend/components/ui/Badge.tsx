'use client'

import { ReactNode } from 'react'

type BadgeProps = {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '' 
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {children}
    </span>
  )
}

export function TrendBadge({ 
  trend, 
  className = '' 
}: { 
  trend: 'up' | 'down' | 'neutral' | 'accelerating' | 'decelerating'
  className?: string 
}) {
  const config = {
    up: { icon: '📈', label: 'Increasing', variant: 'success' as const },
    down: { icon: '📉', label: 'Declining', variant: 'error' as const },
    neutral: { icon: '➡️', label: 'Stable', variant: 'default' as const },
    accelerating: { icon: '🚀', label: 'Accelerating', variant: 'success' as const },
    decelerating: { icon: '⚠️', label: 'Decelerating', variant: 'warning' as const },
  }

  const { icon, label, variant } = config[trend]

  return (
    <Badge variant={variant} size="sm" className={className}>
      <span className="mr-1">{icon}</span>
      {label}
    </Badge>
  )
}

