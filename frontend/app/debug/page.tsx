'use client'

import { useState } from 'react'

export default function DebugPage() {
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rawData, setRawData] = useState<any[]>([])

  const testBackend = async () => {
    setLoading(true)
    setResponse('')
    setRawData([])
    
    try {
      const res = await fetch('http://localhost:5052/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Say hello briefly' })
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line)
                setRawData(prev => [...prev, json])
              } catch (e) {
                console.error('Parse error:', e)
              }
            }
          }
        }
      }

      setResponse('✓ Backend test complete')
    } catch (error: any) {
      setResponse('✗ Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testFrontendAPI = async () => {
    setLoading(true)
    setResponse('')
    setRawData([])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: 'Say hello briefly' }] 
        })
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let text = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: false })
        }
      }

      setResponse(text || '(empty response)')
      setRawData([{ type: 'text', content: text }])
    } catch (error: any) {
      setResponse('✗ Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">Debug Panel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Test backend and frontend API connections
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={testBackend}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
          >
            Test Backend (Port 5051)
          </button>
          
          <button
            onClick={testFrontendAPI}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-slate-400"
          >
            Test Frontend API
          </button>
        </div>

        {loading && (
          <div className="rounded-lg bg-yellow-50 p-4 text-center text-yellow-800">
            Loading...
          </div>
        )}

        {response && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="font-semibold text-slate-900">Response</h2>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-100 p-4 text-sm">
              {response}
            </pre>
          </div>
        )}

        {rawData.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="font-semibold text-slate-900">
              Raw Data ({rawData.length} items)
            </h2>
            <div className="mt-2 space-y-2">
              {rawData.map((item, idx) => (
                <details key={idx} className="rounded bg-slate-100 p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Item {idx + 1}: {item.event || item.type || 'unknown'}
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-slate-100 p-4 text-sm">
          <h3 className="font-semibold">Quick Checks:</h3>
          <ul className="mt-2 space-y-1 text-slate-700">
            <li>• Backend: <code>curl http://localhost:5052/health</code></li>
            <li>• Frontend: <code>curl http://localhost:3000</code></li>
            <li>• Logs: <code>tail -f /tmp/backend.log /tmp/frontend.log</code></li>
          </ul>
        </div>
      </div>
    </div>
  )
}


