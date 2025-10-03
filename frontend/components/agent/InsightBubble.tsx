'use client'

import { ReactNode } from 'react'

type InsightBubbleProps = {
  type: 'observation' | 'warning' | 'action' | 'success'
  children: ReactNode
  icon?: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export default function InsightBubble({ 
  type, 
  children, 
  icon,
  dismissible = false,
  onDismiss,
  className = '' 
}: InsightBubbleProps) {
  const config = {
    observation: {
      icon: icon || '💡',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900'
    },
    warning: {
      icon: icon || '⚠️',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900'
    },
    action: {
      icon: icon || '🎯',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900'
    },
    success: {
      icon: icon || '✅',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900'
    }
  }

  const { icon: defaultIcon, bg, border, text } = config[type]

  return (
    <div className={`
      ${bg} ${border} border rounded-lg p-3 
      animate-in slide-in-from-bottom-2 duration-300
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{defaultIcon}</span>
        <div className={`flex-1 text-sm leading-relaxed ${text}`}>
          {children}
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${text} hover:opacity-70 transition-opacity`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

