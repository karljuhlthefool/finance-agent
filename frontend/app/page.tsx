'use client'

import { FormEvent, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import BashCard from '@/components/cards/BashCard'
import CalcCard from '@/components/cards/CalcCard'
import DocDiffCard from '@/components/cards/DocDiffCard'
import DocumentsCard from '@/components/cards/DocumentsCard'
import EstimatesCard from '@/components/cards/EstimatesCard'
import FileCard from '@/components/cards/FileCard'
import GenericToolCard from '@/components/cards/GenericToolCard'
import JsonExtractCard from '@/components/cards/JsonExtractCard'
import JsonInspectCard from '@/components/cards/JsonInspectCard'
import LogsCard from '@/components/cards/LogsCard'
import MarketDataCard from '@/components/cards/MarketDataCard'
import QaCard from '@/components/cards/QaCard'
import ReportSaveCard from '@/components/cards/ReportSaveCard'
import ValuationCard from '@/components/cards/ValuationCard'
import { ToolEnvelope } from '@/components/cards/types'

type DataEvent = {
  type: 'data'
  event: string
  tool?: string
  result?: unknown
  args?: Record<string, unknown>
  lines?: string[]
  text?: string
  summary?: string
  runtime_ms?: number
  [key: string]: unknown
}

type MessagePart = DataEvent | { type: string; text?: string; [key: string]: unknown }

type Message = {
  id: string
  role: 'user' | 'assistant' | string
  parts?: MessagePart[]
  content?: string
}

const normalizeToolName = (tool?: string): string => {
  if (!tool) return ''
  return tool.replace(/^mcp__[^_]+__/, '')
}

const extractEnvelope = (payload: unknown): ToolEnvelope | null => {
  if (!payload) return null
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (obj.hookSpecificOutput && typeof obj.hookSpecificOutput === 'object') {
      const normalized = (obj.hookSpecificOutput as any).normalized
      if (normalized) return normalized as ToolEnvelope
    }
    if (obj.normalized) return obj.normalized as ToolEnvelope
    if (obj.json) return obj.json as ToolEnvelope
    if ('ok' in obj || 'data' in obj || 'error' in obj || 'stderr' in obj) {
      return obj as ToolEnvelope
    }
  }
  return { ok: true, data: payload }
}

const ToolStartIndicator = ({ tool, args }: { tool?: string; args?: Record<string, unknown> }) => (
  <div className="tool-start">
    <span aria-hidden>🔧</span>
    <span>
      Running <strong>{normalizeToolName(tool) || 'tool'}</strong>
      {args && Object.keys(args).length > 0 && (
        <span className="muted" style={{ marginLeft: '6px' }}>
          {Object.entries(args)
            .slice(0, 3)
            .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
            .join(', ')}
          {Object.keys(args).length > 3 && ' …'}
        </span>
      )}
    </span>
  </div>
)

const CompletedSummary = ({ summary, runtime }: { summary?: unknown; runtime?: number }) => {
  const summaryText = typeof summary === 'string' ? summary : summary ? JSON.stringify(summary) : undefined
  return (
    <div className="status-chip">
      <span aria-hidden>✅</span>
      Completed {runtime ? `in ${runtime} ms` : ''}
      {summaryText && <span className="muted" style={{ marginLeft: '6px' }}>{summaryText}</span>}
    </div>
  )
}

export default function Page() {
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    api: '/api/chat',
    streamMode: 'stream-data'
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim()) return
    await sendMessage({ content: input })
    setInput('')
  }

  const renderPart = (part: MessagePart, idx: number) => {
    if (part.type === 'data') {
      if (part.event === 'agent.tool-start') {
        return <ToolStartIndicator key={idx} tool={part.tool as string | undefined} args={part.args as Record<string, unknown> | undefined} />
      }

      if (part.event === 'agent.tool-result') {
        const toolName = normalizeToolName(part.tool as string | undefined)
        const envelope = extractEnvelope(part.result)
        switch (toolName) {
          case 'mf_calc_simple':
            return <CalcCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_market_get':
            return <MarketDataCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_documents_get':
            return <DocumentsCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_estimates_get':
            return <EstimatesCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_json_inspect':
            return <JsonInspectCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_extract_json':
            return <JsonExtractCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_doc_diff':
            return <DocDiffCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_valuation_basic_dcf':
            return <ValuationCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_qa':
            return <QaCard key={idx} tool={toolName} envelope={envelope} />
          case 'mf_report_save':
            return <ReportSaveCard key={idx} tool={toolName} envelope={envelope} />
          case 'Bash':
            return <BashCard key={idx} tool={toolName} envelope={envelope} />
          case 'Read':
          case 'Write':
          case 'List':
          case 'Glob':
          case 'Grep':
            return <FileCard key={idx} tool={toolName} envelope={envelope} />
          default:
            return <GenericToolCard key={idx} tool={toolName || part.tool?.toString()} envelope={envelope} />
        }
      }

      if (part.event.startsWith('agent.tool-result.')) {
        return null
      }

      if (part.event === 'agent.log') {
        return <LogsCard key={idx} lines={(part.lines as string[]) ?? []} title={<span>Live log</span>} />
      }

      if (part.event === 'agent.text') {
        return (
          <p key={idx} className="message-text">
            {part.text as string}
          </p>
        )
      }

      if (part.event === 'agent.completed') {
        return <CompletedSummary key={idx} summary={part.summary as string | undefined} runtime={part.runtime_ms as number | undefined} />
      }

      if (part.event === 'agent.unknown') {
        return <GenericToolCard key={idx} tool="agent-event" envelope={extractEnvelope(part.payload)} />
      }
    }

    if (part.type === 'tool' && (part as any).state === 'result') {
      const toolName = normalizeToolName((part as any).name)
      return <GenericToolCard key={idx} tool={toolName} envelope={extractEnvelope((part as any).result)} />
    }

    if ((part.type === 'text' || part.type === 'text-delta') && part.text) {
      return (
        <p key={idx} className="message-text">
          {part.text}
        </p>
      )
    }

    return null
  }

  const renderedMessages = useMemo(() => {
    return (messages as Message[]).map(message => {
      const isUser = message.role === 'user'
      const className = `message-card ${isUser ? 'message-card--user' : 'message-card--assistant'}`
      const hasParts = message.parts && message.parts.length > 0
      return (
        <article key={message.id} className={className}>
          <div className="message-header">
            <span className="message-role">{isUser ? 'You' : 'Assistant'}</span>
          </div>
          <div className="message-content">
            {hasParts
              ? message.parts!.map((part, idx) => renderPart(part as MessagePart, idx))
              : message.content && <p className="message-text">{message.content}</p>}
          </div>
        </article>
      )
    })
  }, [messages])

  return (
    <main className="chat-shell">
      <header className="chat-header">
        <h1>Claude Finance Agent</h1>
        <p>
          A sleek control surface for orchestrating CLI-backed workflows. Chat with the agent, trigger tools, and
          watch structured cards update live as results stream back from the workspace.
        </p>
      </header>

      <section className="chat-window">
        {renderedMessages}
        {!messages.length && (
          <div className="empty-state">
            Ask about a ticker, request an ETL run, or compute a delta to see interactive tool cards stream in.
          </div>
        )}
      </section>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask the agent to run a market query or report…"
          aria-label="Message the agent"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </main>
  )
}
