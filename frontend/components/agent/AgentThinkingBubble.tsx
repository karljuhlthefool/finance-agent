'use client'

type AgentThinkingBubbleProps = {
  message?: string
  plan?: string[]
  className?: string
}

export default function AgentThinkingBubble({ 
  message, 
  plan, 
  className = '' 
}: AgentThinkingBubbleProps) {
  return (
    <div className={`
      rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm
      animate-in fade-in slide-in-from-bottom-4 duration-500
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <div className="flex gap-1 mt-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></div>
        </div>
        
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-700 mb-2">
            {message || 'Thinking...'}
          </div>
          
          {plan && plan.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-slate-600 font-medium">Plan:</div>
              <ol className="space-y-1 text-xs text-slate-600">
                {plan.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400 font-medium">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

