'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToolCard } from './ToolCard'
import { useToolStore } from '@/lib/tool-store'

interface ToolChainGroupProps {
  toolIds: string[]
}

export function ToolChainGroup({ toolIds }: ToolChainGroupProps) {
  const [showAll, setShowAll] = useState(false)
  const tools = useToolStore((state) => state.tools)
  
  if (toolIds.length === 0) return null
  
  // Get the latest tool (last in the array)
  const latestToolId = toolIds[toolIds.length - 1]
  const previousToolIds = toolIds.slice(0, -1)
  
  // Count completed vs active tools
  const completedCount = previousToolIds.filter(id => {
    const tool = tools[id]
    return tool && (tool.phase === 'complete' || tool.phase === 'error')
  }).length
  
  // If only one tool, show it directly with no grouping UI
  if (toolIds.length === 1) {
    return (
      <div className="max-w-2xl">
        <ToolCard toolId={latestToolId} />
      </div>
    )
  }
  
  return (
    <div className="space-y-1 max-w-2xl">
      {/* Latest/Current tool - always visible at top */}
      <ToolCard toolId={latestToolId} />
      
      {/* Previous tools - collapsible below */}
      {previousToolIds.length > 0 && (
        <div className="space-y-0.5">
          {/* Collapse/Expand button */}
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-left px-2 py-0.5 rounded text-[10px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <span className="text-slate-400 text-[9px]">{showAll ? '▼' : '▶'}</span>
            <span>
              {showAll ? 'Hide' : 'Show'} {previousToolIds.length} previous tool{previousToolIds.length !== 1 ? 's' : ''}
              {completedCount > 0 && <span className="text-green-600 ml-1 text-[9px]">({completedCount} done)</span>}
            </span>
          </button>
          
          {/* Previous tools list */}
          <AnimatePresence>
            {showAll && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1 overflow-hidden"
              >
                {previousToolIds.map((toolId) => (
                  <div key={toolId} className="opacity-60">
                    <ToolCard toolId={toolId} />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

