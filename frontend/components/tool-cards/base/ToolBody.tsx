'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface ToolBodyProps {
  children: ReactNode
  className?: string
}

export function ToolBody({ children, className }: ToolBodyProps) {
  return (
    <div className={cn('px-2 pb-2', className)}>
      {children}
    </div>
  )
}

