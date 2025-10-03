'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import LogsCard from '@/components/cards/LogsCard'
import ReportCard from '@/components/cards/ReportCard'
import GenericToolCard from '@/components/cards/GenericToolCard'
import MarketDataCard from '@/components/cards/MarketDataCard'
import ValuationCard from '@/components/cards/ValuationCard'
import CalculationCard from '@/components/cards/CalculationCard'
import { QACard } from '@/components/cards/QACard'
import { FilingExtractCard } from '@/components/cards/FilingExtractCard'
import { EstimatesCard } from '@/components/cards/EstimatesCard'
import ToolChainFlow from '@/components/agent/ToolChainFlow'
import AgentThinkingBubble from '@/components/agent/AgentThinkingBubble'
import SessionTimeline from '@/components/agent/SessionTimeline'
import { useWorkspace } from '@/lib/workspace-context'
import WorkspacePanel from '@/components/workspace/WorkspacePanel'

type ToolResult = {
  ok?: boolean
  data?: any
  error?: string
  tool?: string
}

type AgentDataPart = {
  type: 'data'
  event: string
  [key: string]: any
}

type MessagePart = AgentDataPart | { type: string; text?: string }

export default function Page() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, input, setInput, append, isLoading, data } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      console.log('✅ Message finished:', message)
    },
    onError: (error) => {
      console.error('❌ Chat error:', error)
    }
  })

  // Auto-scroll to bottom when messages or data updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, data])

  // Track tool states (loading → result)
  const [toolStates, setToolStates] = useState<Record<string, any>>({})
  const [toolChain, setToolChain] = useState<any[]>([])
  const [sessionHistory, setSessionHistory] = useState<any[]>([])
  const [agentThinking, setAgentThinking] = useState<any>(null)
  
  // Update tool states when data changes
  useEffect(() => {
    const states: Record<string, any> = {}
    const chain: any[] = []
    let thinking: any = null
    
    data?.forEach((item: any) => {
      if (item.type === 'data') {
        // Handle tool start
        if (item.event === 'agent.tool-start') {
          states[item.tool_id] = {
            toolId: item.tool_id,
            cli_tool: item.cli_tool,
            metadata: item.metadata,
            isLoading: true,
            status: 'active'
          }
          chain.push({
            id: item.tool_id,
            name: item.tool || 'Tool',
            cli_tool: item.cli_tool || 'unknown',
            status: 'active',
            progress: item.progress
          })
        } 
        // Handle tool result
        else if (item.event === 'agent.tool-result') {
          const existing = states[item.tool_id] || {}
          states[item.tool_id] = {
            ...existing,
            toolId: item.tool_id,
            cli_tool: item.cli_tool || existing.cli_tool,
            metadata: item.metadata || existing.metadata,
            result: item.result,
            isLoading: false,
            status: 'complete'
          }
          
          // Update chain
          const chainItem = chain.find(c => c.id === item.tool_id)
          if (chainItem) {
            chainItem.status = 'complete'
            chainItem.duration = item.duration || 1000
          }
          
          // Add to history
          setSessionHistory(prev => [...prev, {
            time: new Date().toLocaleTimeString(),
            tool: item.cli_tool || 'Tool',
            ticker: item.metadata?.ticker,
            status: 'complete',
            duration: item.duration
          }])
        } 
        // Handle tool error
        else if (item.event === 'agent.tool-error') {
          const existing = states[item.tool_id] || {}
          states[item.tool_id] = {
            ...existing,
            toolId: item.tool_id,
            cli_tool: item.cli_tool || existing.cli_tool,
            error: item.error,
            isLoading: false,
            status: 'error'
          }
          
          const chainItem = chain.find(c => c.id === item.tool_id)
          if (chainItem) chainItem.status = 'error'
        }
        // Handle thinking event
        else if (item.event === 'agent.thinking') {
          thinking = {
            message: item.message,
            plan: item.plan
          }
        }
      }
    })
    
    setToolStates(states)
    setToolChain(chain)
    setAgentThinking(thinking)
  }, [data])
  
  const renderToolCard = (toolState: any, idx: number) => {
    const { cli_tool, metadata, result, error, isLoading, toolId } = toolState
    
    // Route to specialized components based on CLI tool type
    switch (cli_tool) {
      case 'mf-market-get':
        return (
          <MarketDataCard
            key={toolId}
            toolId={toolId}
            metadata={metadata}
            result={result}
            isLoading={isLoading}
          />
        )
      
      case 'mf-valuation-basic-dcf':
        return (
          <ValuationCard
            key={toolId}
            toolId={toolId}
            metadata={metadata}
            result={result}
            isLoading={isLoading}
          />
        )
      
      case 'mf-calc-simple':
        return (
          <CalculationCard
            key={toolId}
            toolId={toolId}
            metadata={metadata}
            result={result}
            isLoading={isLoading}
          />
        )
      
      case 'mf-estimates-get':
        return (
          <EstimatesCard
            key={toolId}
            toolCall={{ tool_id: toolId, cli_tool, metadata }}
            result={result}
            isLoading={isLoading}
          />
        )
      
      case 'mf-qa':
        return (
          <QACard
            key={toolId}
            toolCall={{ tool_id: toolId, cli_tool, metadata }}
            result={result}
            isLoading={isLoading}
          />
        )
      
      case 'mf-filing-extract':
        return (
          <FilingExtractCard
            key={toolId}
            toolCall={{ tool_id: toolId, cli_tool, metadata }}
            result={result}
            isLoading={isLoading}
          />
        )
      
      default:
        // Fallback to generic card
        return (
          <GenericToolCard
            key={toolId}
            tool={cli_tool || 'unknown'}
            payload={result || { error, isLoading }}
          />
        )
    }
  }

  const renderPart = (part: MessagePart, idx: number) => {
    if (part.type === 'data') {
      switch (part.event) {
        case 'agent.tool-result.mf_calc_simple':
          return <ReportCard key={idx} result={part.result as ToolResult} />
        case 'agent.tool-start':
        case 'agent.tool-result':
        case 'agent.tool-error':
        case 'agent.thinking':
          // These are handled by toolStates rendering
          return null
        case 'agent.log':
          return <LogsCard key={idx} lines={part.lines ?? []} />
        case 'agent.text':
          return (
            <p key={idx} className="leading-relaxed text-slate-800">
              {part.text}
            </p>
          )
        case 'agent.completed':
          return (
            <div key={idx} className="text-xs text-slate-500">
              ✅ Completed in {part.runtime_ms ?? '–'} ms
            </div>
          )
        default:
          return <GenericToolCard key={idx} tool={part.event} payload={part} />
      }
    }

    if (part.type === 'tool' && (part as any).state === 'result') {
      return (
        <GenericToolCard key={idx} tool={(part as any).name ?? 'tool'} payload={(part as any).result} />
      )
    }

    if (part.type === 'text' || part.type === 'text-delta') {
      return (
        <p key={idx} className="leading-relaxed text-slate-800">
          {part.text}
        </p>
      )
    }

    return null
  }

  return (
    <div className="flex min-h-screen">
      {/* Main content area */}
      <main 
        className="flex-1 flex flex-col gap-3 p-4 transition-all duration-300 max-w-4xl mx-auto text-sm"
      >
        {/* Session Timeline */}
        <SessionTimeline 
        entries={sessionHistory}
        onRerun={(entry) => {
          if (entry.ticker) {
            setInput(`Get data for ${entry.ticker}`)
          }
        }}
      />
      
      <header className="rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">Claude Finance Agent</h1>
        <p className="mt-1 text-xs text-slate-600">
          Chat with the agent and watch CLI-backed tool cards stream in real time.
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="text-slate-500">Messages: {messages.length}</span>
          <span className="text-slate-500">Loading: {isLoading ? 'Yes' : 'No'}</span>
          <a href="/debug" className="text-blue-600 hover:underline">Debug Page →</a>
        </div>
      </header>

      <section className="flex-1 space-y-2 overflow-y-auto pr-1"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        {messages.map((message, msgIdx) => {
          // Get data annotations for this message
          const messageData = data?.filter((d: any) => {
            return true // For now, show all data items with the latest message
          })
          
          return (
            <article key={message.id} className="rounded-xl bg-white p-3 shadow ring-1 ring-slate-200">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {message.role}
              </div>
            <div className="space-y-3">
                {/* Show thinking bubble if agent is thinking */}
                {message.role === 'assistant' && msgIdx === messages.length - 1 && agentThinking && (
                  <AgentThinkingBubble 
                    message={agentThinking.message}
                    plan={agentThinking.plan}
                  />
                )}
                
                {/* Show tool chain if we have tools executing */}
                {message.role === 'assistant' && msgIdx === messages.length - 1 && toolChain.length > 0 && (
                  <ToolChainFlow tools={toolChain} />
                )}
                
                {/* Render tool cards based on tool states */}
                {message.role === 'assistant' && msgIdx === messages.length - 1 && Object.entries(toolStates).map(([toolId, toolState]) => {
                  return renderToolCard(toolState, parseInt(toolId))
                })}
                
                {/* Show other data annotations (non-tool events) */}
                {message.role === 'assistant' && msgIdx === messages.length - 1 && messageData?.map((dataItem: any, idx: number) => {
                  if (dataItem.type === 'data') {
                    return renderPart(dataItem as MessagePart, `data-${idx}`)
                  }
                  return null
                })}
                
                {message.content && (
                  <div className="prose prose-slate prose-sm max-w-none prose-headings:font-semibold prose-p:leading-7 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-4 whitespace-pre-wrap">{children}</p>,
                        ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-5">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-5">{children}</ol>,
                        li: ({ children }) => <li className="leading-7">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold">{children}</h1>,
                        h2: ({ children }) => <h2 className="mb-2 mt-2 text-sm font-semibold">{children}</h2>,
                        h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold">{children}</h3>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              {message.parts?.map((part, idx) => renderPart(part as MessagePart, idx))}
                {!message.content && !message.parts && messageData?.length === 0 && (
                  <pre className="text-xs text-slate-400">
                    {JSON.stringify(message, null, 2)}
                  </pre>
                )}
            </div>
          </article>
          )
        })}

        {!messages.length && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-sm text-slate-500">
            Ask about a ticker, run a valuation, or request a report to see tool cards populate.
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <article className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow ring-1 ring-blue-100">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></div>
              </div>
              <p className="text-xs font-medium text-blue-900">
                Agent is thinking and processing...
              </p>
            </div>
          </article>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </section>

      <form
        className="sticky bottom-6 flex gap-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          if (!input.trim() || isLoading) return
          const userMessage = input
          setInput('')
          await append({ role: 'user', content: userMessage })
        }}
      >
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask the agent to run a CLI tool..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-slate-400 focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800 transition-all"
        >
          Send
        </button>
      </form>
    </main>
      
      {/* Workspace Panel - shares page space */}
      <WorkspacePanel />
    </div>
  )
}
