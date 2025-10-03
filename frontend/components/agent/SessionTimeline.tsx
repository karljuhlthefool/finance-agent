'use client'

import { useState } from 'react'

type TimelineEntry = {
  time: string
  tool: string
  ticker?: string
  status: 'complete' | 'error'
  duration?: number
}

type SessionTimelineProps = {
  entries: TimelineEntry[]
  onRerun?: (entry: TimelineEntry) => void
  className?: string
}

export default function SessionTimeline({ 
  entries, 
  onRerun,
  className = '' 
}: SessionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!entries || entries.length === 0) return null

  return (
    <div className={`
      fixed left-4 top-24 z-40 
      ${isExpanded ? 'w-64' : 'w-12'}
      transition-all duration-300
      ${className}
    `}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          flex items-center justify-center w-12 h-12 
          rounded-full bg-white shadow-lg border border-slate-200
          hover:bg-slate-50 transition-colors
        "
      >
        <span className="text-xl">{isExpanded ? '←' : '📋'}</span>
      </button>

      {/* Timeline panel */}
      {isExpanded && (
        <div className="
          mt-4 rounded-xl bg-white shadow-xl border border-slate-200 
          max-h-[calc(100vh-200px)] overflow-hidden flex flex-col
          animate-in slide-in-from-left-4 duration-300
        ">
          {/* Header */}
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Session History</h3>
            <p className="text-xs text-slate-600 mt-0.5">{entries.length} tool calls</p>
          </div>

          {/* Entries */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="
                    group p-3 rounded-lg border border-slate-200 
                    hover:border-slate-300 hover:shadow-sm transition-all
                    bg-white
                  "
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{entry.time}</span>
                        {entry.status === 'complete' ? (
                          <span className="text-xs text-green-600">✓</span>
                        ) : (
                          <span className="text-xs text-red-600">✗</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-900 truncate mt-1">
                        {entry.tool}
                      </div>
                      {entry.ticker && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          {entry.ticker}
                        </div>
                      )}
                      {entry.duration && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {(entry.duration / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rerun button (appears on hover) */}
                  {onRerun && (
                    <button
                      onClick={() => onRerun(entry)}
                      className="
                        mt-2 w-full text-xs text-blue-600 
                        opacity-0 group-hover:opacity-100 transition-opacity
                        hover:text-blue-700 font-medium
                      "
                    >
                      ↻ Rerun
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200">
            <button className="w-full text-xs text-slate-600 hover:text-slate-900 font-medium">
              Export Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

