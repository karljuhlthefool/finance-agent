'use client'

import { useEffect, useState } from 'react'

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warning' | 'error' | 'tool'
  message: string
  data?: any
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    // Connect to backend logs stream
    const eventSource = new EventSource('http://127.0.0.1:5052/logs/stream')

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log('📡 Connected to logs stream')
    }

    eventSource.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data)
        setLogs(prev => [...prev, logEntry])
        
        // Auto-scroll to bottom
        if (autoScroll) {
          setTimeout(() => {
            const container = document.getElementById('logs-container')
            if (container) {
              container.scrollTop = container.scrollHeight
            }
          }, 50)
        }
      } catch (e) {
        console.error('Failed to parse log:', e)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      console.error('❌ Lost connection to logs stream')
    }

    return () => {
      eventSource.close()
    }
  }, [autoScroll])

  const clearLogs = () => setLogs([])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      case 'tool': return 'text-blue-500'
      case 'debug': return 'text-gray-500'
      default: return 'text-slate-300'
    }
  }

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-900/20'
      case 'warning': return 'bg-yellow-900/20'
      case 'tool': return 'bg-blue-900/20'
      default: return 'bg-slate-900/50'
    }
  }

  return (
    <main className="flex h-screen flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">🔍 Live Backend Logs</h1>
            <p className="text-sm text-slate-400">
              Real-time view of agent execution, tool calls, and system events
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            <button
              onClick={() => {
                const logsText = logs.map(l => 
                  `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}${l.data ? '\n' + JSON.stringify(l.data, null, 2) : ''}`
                ).join('\n\n')
                navigator.clipboard.writeText(logsText)
                alert('Logs copied to clipboard!')
              }}
              className="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-500"
            >
              📋 Copy All
            </button>
            <button
              onClick={clearLogs}
              className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
            >
              Clear
            </button>
            <a
              href="/"
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500"
            >
              ← Back to Chat
            </a>
          </div>
        </div>
      </header>

      {/* Logs Container */}
      <div
        id="logs-container"
        className="flex-1 overflow-y-auto p-4 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            Waiting for logs... Send a message in the chat to see activity.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`rounded p-2 ${getLevelBg(log.level)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-slate-500">{log.timestamp}</span>
                  <span className={`font-semibold uppercase ${getLevelColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="flex-1 text-slate-200">{log.message}</span>
                </div>
                {log.data && (
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-slate-400">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 p-2 text-center text-xs text-slate-500">
        Total logs: {logs.length} | Errors: {logs.filter(l => l.level === 'error').length} | 
        Tool calls: {logs.filter(l => l.level === 'tool').length}
      </footer>
    </main>
  )
}

