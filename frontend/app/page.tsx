'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { useToolStore } from '@/lib/tool-store'
import { ToolChainGroup } from '@/components/agent/ToolChainGroup'
import { useWorkspace } from '@/lib/workspace-context'
import WorkspacePanel from '@/components/workspace/WorkspacePanel'

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

  // Get tool store actions
  const addTool = useToolStore((state) => state.addTool)
  const updateTool = useToolStore((state) => state.updateTool)
  const setPhase = useToolStore((state) => state.setPhase)
  const setResult = useToolStore((state) => state.setResult)
  const tools = useToolStore((state) => state.tools)

  // Auto-scroll to bottom when messages or data updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, data])

  // Track last agent text for description (using ref to avoid stale closures)
  const lastAgentTextRef = useRef<string | null>(null)
  // Track processed events to prevent reprocessing
  const processedEventsRef = useRef<Set<string>>(new Set())
  
  // Process streaming data to update tool states
  useEffect(() => {
    console.log('🔄 useEffect triggered, data length:', data?.length)
    console.log('🔄 Full data array:', JSON.stringify(data, null, 2))
    
    data?.forEach((event: any, index: number) => {
      // Create unique key for each event
      const eventKey = `${index}-${event.event}-${event.tool_id || event.text?.slice(0, 20) || Math.random()}`
      
      // Skip if already processed
      if (processedEventsRef.current.has(eventKey)) {
        console.log(`  ⏭️ Skipping already processed event ${index}`)
        return
      }
      
      // Mark as processed
      processedEventsRef.current.add(eventKey)
      
      if (event.type === 'data') {
        console.log(`📦 Processing NEW event ${index}:`, event.event, event.tool_id || '')
        
        // Agent text (might be description for next tool)
        if (event.event === 'agent.text') {
          const text = event.text?.trim()
          const wordCount = text ? text.split(' ').length : 0
          console.log('  💬 Agent text received:', {
            text: text,
            wordCount: wordCount,
            willCapture: text && wordCount <= 12
          })
          
          if (text && wordCount <= 12) {
            // If it's short (< 12 words), it's likely a description
            lastAgentTextRef.current = text
            console.log('  ✅ Captured as potential description!', text)
          } else {
            // Long text, clear description
            lastAgentTextRef.current = null
            console.log('  ❌ Not captured (too long or empty)', { wordCount })
          }
        }
        
        // Tool started
        else if (event.event === 'agent.tool-start') {
          console.log('  🔧 TOOL START detected:', event.tool_id, event.cli_tool)
          console.log('  📋 EVENT RAW:', JSON.stringify(event, null, 2))
          console.log('  🎯 KEY CHECK:', {
            hasToolField: 'tool' in event,
            hasArgsField: 'args' in event,
            tool: event.tool,
            args: event.args,
            metadata: event.metadata
          })
          
          // Extract description from tool args (for Bash tool) or use last agent text as fallback
          const toolDescription = event.args?.description || lastAgentTextRef.current || undefined
          
          console.log('  🎯 ATTACHING DESCRIPTION:', {
            fromToolArgs: event.args?.description,
            fromLastText: lastAgentTextRef.current,
            willUse: toolDescription
          })
          
          addTool(event.tool_id, {
            tool: event.tool,
            cliTool: event.cli_tool,
            metadata: event.metadata,
            args: event.args,
            description: toolDescription,
            phase: 'intent',
          })
          
          console.log('  ✅ Tool added with description:', toolDescription ? `"${toolDescription}"` : '(none)')
          
          // Clear description after using it
          lastAgentTextRef.current = null
          
          // Transition to executing after brief intent display
          // Use a flag-based approach instead of setTimeout
          const toolId = event.tool_id
          setTimeout(() => {
            console.log('  ⏩ Attempting transition to executing:', toolId)
            // setPhaseIfStillIntent will only transition if phase is still 'intent'
            setPhase(toolId, 'executing', true) // true = conditional
          }, 150)
        }
        
        // Tool completed
        else if (event.event === 'agent.tool-result') {
          console.log('  ✅ TOOL RESULT detected:', event.tool_id)
          console.log('  📄 Result data:', event.result)
          setResult(event.tool_id, event.result)
          console.log('  ✓ setResult called for:', event.tool_id)
        }
        
        // Tool error
        else if (event.event === 'agent.tool-error') {
          console.log('  ❌ TOOL ERROR detected:', event.tool_id, event.error)
          setResult(event.tool_id, {
            ok: false,
            error: event.error,
          })
          console.log('  ✓ setResult (error) called for:', event.tool_id)
        }
      } else {
        console.log('  ⚠️  Event type is NOT "data":', event.type)
      }
    })
  }, [data, addTool, setPhase, setResult])

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Main content area */}
      <main 
        className="flex-1 flex flex-col gap-3 p-4 transition-all duration-300 max-w-4xl mx-auto"
      >
        <header className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">Claude Finance Agent</h1>
        <p className="mt-1 text-xs text-slate-600">
            Ask questions and watch tools execute in real-time
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span>Messages: {messages.length}</span>
            <span>•</span>
            <span>Tools: {Object.keys(tools).length}</span>
            <span>•</span>
            <span>{isLoading ? '⏳ Processing...' : '✓ Ready'}</span>
        </div>
      </header>

        <section 
          className="flex-1 space-y-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {messages.map((message) => (
            <article 
              key={message.id} 
              className="rounded-xl bg-white p-4 shadow-sm border border-slate-200"
            >
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {message.role}
              </div>
              
              <div className="space-y-3">
                {/* Show tool chain for assistant messages */}
                {message.role === 'assistant' && Object.keys(tools).length > 0 && (
                  <ToolChainGroup toolIds={Object.keys(tools)} />
                )}
                
                {/* Show text content */}
                {message.content && (
                  <div className="prose prose-sm max-w-none">
                    <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}

        {!messages.length && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-8 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Start a Conversation
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Ask about stocks, run valuations, analyze filings, or request reports
              </p>
              <div className="space-y-2 text-xs text-left max-w-md mx-auto">
                <div className="text-slate-500 font-medium">Try asking:</div>
                <div className="space-y-1 text-slate-600">
                  <div>• &ldquo;Get market data for Apple&rdquo;</div>
                  <div>• &ldquo;Run a DCF valuation on MSFT&rdquo;</div>
                  <div>• &ldquo;What are Tesla&apos;s main risk factors?&rdquo;</div>
                  <div>• &ldquo;Compare revenue growth for GOOGL and META&rdquo;</div>
                </div>
              </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
            <article className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></div>
              </div>
              <p className="text-xs font-medium text-blue-900">
                  Agent is thinking...
              </p>
            </div>
          </article>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </section>

      <form
          className="sticky bottom-0 flex gap-3 rounded-2xl bg-white p-4 shadow-lg border border-slate-200"
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
            placeholder="Ask the agent anything..."
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          disabled={isLoading}
        />
        <button
          type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </form>
    </main>
      
      {/* Workspace Panel */}
      <WorkspacePanel />
    </div>
  )
}
