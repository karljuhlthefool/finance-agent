'use client'

import { useState } from 'react'

interface GenericResultProps {
  result?: any
  isExpanded: boolean
}

export function GenericResult({ result, isExpanded }: GenericResultProps) {
  const [showRaw, setShowRaw] = useState(false)
  
  if (!result) {
    return (
      <div className="text-xs text-slate-500 italic">
        No result data available
      </div>
    )
  }
  
  // Try to show a nice summary if result has common fields
  const hasData = typeof result === 'object' && result !== null
  
  return (
    <div className="space-y-2">
      {/* Compact Summary */}
      <div className="text-sm text-slate-700">
        {hasData && Object.keys(result).length > 0 ? (
          <div className="text-xs">
            {Object.keys(result).length} field{Object.keys(result).length !== 1 ? 's' : ''} returned
          </div>
        ) : (
          <div className="text-xs text-slate-500">Result: {String(result)}</div>
        )}
      </div>
      
      {/* Expanded View */}
      {isExpanded && hasData && (
        <div className="space-y-2">
          {/* Key-value preview */}
          {!showRaw && (
            <div className="space-y-1 text-xs">
              {Object.entries(result).slice(0, 5).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium text-slate-600 min-w-[100px]">{key}:</span>
                  <span className="text-slate-800 truncate">
                    {typeof value === 'object' 
                      ? `{${Object.keys(value as object).length} fields}`
                      : String(value)}
                  </span>
                </div>
              ))}
              {Object.keys(result).length > 5 && (
                <div className="text-xs text-slate-500 italic">
                  +{Object.keys(result).length - 5} more fields
                </div>
              )}
            </div>
          )}
          
          {/* Raw JSON toggle */}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showRaw ? 'Hide' : 'Show'} Raw JSON
          </button>
          
          {showRaw && (
            <pre className="text-xs bg-slate-50 rounded p-2 border border-slate-200 overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

