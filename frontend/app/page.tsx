'use client'

import { FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import LogsCard from '@/components/cards/LogsCard'
import ReportCard from '@/components/cards/ReportCard'
import GenericToolCard from '@/components/cards/GenericToolCard'

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
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    api: '/api/chat',
    streamMode: 'stream-data'
  })

  const renderPart = (part: MessagePart, idx: number) => {
    if (part.type === 'data') {
      switch (part.event) {
        case 'agent.tool-result.mf_calc_simple':
          return <ReportCard key={idx} result={part.result as ToolResult} />
        case 'agent.tool-start':
          return (
            <div key={idx} className="text-sm text-slate-600">
              🔧 Running <strong>{part.tool}</strong>
            </div>
          )
        case 'agent.tool-result':
          return <GenericToolCard key={idx} tool={part.tool} payload={part.result as ToolResult} />
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 p-6">
      <header className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">Claude Finance Agent</h1>
        <p className="mt-1 text-sm text-slate-600">
          Chat with the agent and watch CLI-backed tool cards stream in real time.
        </p>
      </header>

      <section className="flex-1 space-y-4">
        {messages.map(message => (
          <article key={message.id} className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-200">
            <div className="space-y-3">
              {message.parts?.map((part, idx) => renderPart(part as MessagePart, idx))}
            </div>
          </article>
        ))}

        {!messages.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-slate-500">
            Ask about a ticker, run a valuation, or request a report to see tool cards populate.
          </div>
        )}
      </section>

      <form
        className="sticky bottom-6 flex gap-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          if (!input.trim()) return
          await sendMessage({ content: input })
          setInput('')
        }}
      >
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask the agent to run a CLI tool..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base shadow-inner focus:border-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isLoading}
        >
          {isLoading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </main>
  )
}
