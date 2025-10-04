'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToolStore, type ToolPhase } from '@/lib/tool-store'
import { IntentCard } from '../tool-cards/phases/IntentCard'
import { ExecutionCard } from '../tool-cards/phases/ExecutionCard'
import { ErrorCard } from '../tool-cards/phases/ErrorCard'
import { ResultCard } from '../tool-cards/phases/ResultCard'

interface ToolCardProps {
  toolId: string
}

export function ToolCard({ toolId }: ToolCardProps) {
  const tool = useToolStore((state) => state.tools[toolId])
  const setElapsed = useToolStore((state) => state.setElapsed)
  
  // Update elapsed time
  useEffect(() => {
    if (!tool || tool.phase === 'complete' || tool.phase === 'error') return
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - tool.startTime
      setElapsed(toolId, elapsed)
    }, 100) // Update every 100ms
    
    return () => clearInterval(interval)
  }, [tool, toolId, setElapsed])
  
  if (!tool) return null
  
  // Render appropriate card based on phase
  const renderPhase = () => {
    const commonProps = {
      cliTool: tool.cliTool,
      toolName: tool.tool,
      metadata: tool.metadata,
      args: tool.args,
      description: tool.description,
      elapsed: tool.elapsed,
    }
    
    switch (tool.phase) {
      case 'intent':
        return (
          <IntentCard
            {...commonProps}
          />
        )
      
      case 'executing':
      case 'processing':
        return (
          <ExecutionCard
            {...commonProps}
            progress={tool.progress}
            status={tool.status}
          />
        )
      
      case 'error':
        return (
          <ErrorCard
            {...commonProps}
            error={tool.result?.error}
            hint={tool.result?.hint}
            technicalDetails={tool.result}
          />
        )
      
      case 'complete':
        return (
          <ResultCard
            toolId={toolId}
            {...commonProps}
            result={tool.result}
            isExpanded={tool.isExpanded}
          />
        )
      
      default:
        return null
    }
  }
  
  const phaseComponent = renderPhase()
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${toolId}-${tool.phase}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.15 }}
      >
        {phaseComponent}
      </motion.div>
    </AnimatePresence>
  )
}

