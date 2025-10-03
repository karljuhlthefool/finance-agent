'use client'

import Badge from '../ui/Badge'

type ToolNode = {
  id: string
  name: string
  cli_tool: string
  status: 'pending' | 'active' | 'complete' | 'error'
  duration?: number
  progress?: number
}

type ToolChainFlowProps = {
  tools: ToolNode[]
  className?: string
}

export default function ToolChainFlow({ tools, className = '' }: ToolChainFlowProps) {
  if (!tools || tools.length === 0) return null

  return (
    <div className={`
      rounded-xl border border-slate-200 bg-white p-4 shadow-sm
      animate-in fade-in slide-in-from-top-4 duration-300
      ${className}
    `}>
      <div className="mb-3 text-xs font-medium text-slate-600">Tool Execution Pipeline</div>
      
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tools.map((tool, idx) => (
          <div key={tool.id} className="flex items-center gap-2">
            <ToolNodeCard tool={tool} />
            {idx < tools.length - 1 && (
              <div className="flex items-center">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path
                    d="M 5 10 L 15 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-300"
                  />
                  <path
                    d="M 12 7 L 15 10 L 12 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-slate-300"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ToolNodeCard({ tool }: { tool: ToolNode }) {
  const iconMap: Record<string, string> = {
    'mf-market-get': '📊',
    'mf-valuation-basic-dcf': '💰',
    'mf-calc-simple': '🧮',
    'mf-qa': '💬',
    'mf-filing-extract': '📄',
    'mf-estimates-get': '📈',
    'bash': '⚙️',
  }

  const statusConfig = {
    pending: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-600'
    },
    active: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-900'
    },
    complete: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-900'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900'
    }
  }

  const { bg, border, text } = statusConfig[tool.status]
  const icon = iconMap[tool.cli_tool] || '🔧'

  return (
    <div className={`
      relative flex flex-col items-center min-w-[100px] p-3 rounded-lg border-2
      ${bg} ${border}
      transition-all duration-300
    `}>
      {/* Icon */}
      <div className="text-2xl mb-1">{icon}</div>
      
      {/* Tool name */}
      <div className={`text-xs font-medium text-center ${text} mb-1`}>
        {tool.cli_tool.replace('mf-', '')}
      </div>
      
      {/* Status indicator */}
      {tool.status === 'complete' && tool.duration && (
        <Badge variant="success" size="sm">
          {(tool.duration / 1000).toFixed(1)}s
        </Badge>
      )}
      
      {tool.status === 'active' && (
        <div className="w-full mt-2">
          {tool.progress !== undefined ? (
            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${tool.progress}%` }}
              />
            </div>
          ) : (
            <div className="flex gap-0.5 justify-center">
              <div className="h-1 w-1 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
              <div className="h-1 w-1 animate-bounce rounded-full bg-blue-500"></div>
            </div>
          )}
        </div>
      )}
      
      {tool.status === 'pending' && (
        <Badge variant="default" size="sm">pending</Badge>
      )}
      
      {tool.status === 'error' && (
        <Badge variant="error" size="sm">error</Badge>
      )}
    </div>
  )
}

