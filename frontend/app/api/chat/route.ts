import { NextRequest } from 'next/server'
import { StreamingTextResponse } from 'ai'

const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:5052'

export async function POST(request: NextRequest) {
  const { messages } = await request.json()
  
  const lastMessage = messages[messages.length - 1]
  const prompt = lastMessage?.content || ''

  const response = await fetch(`${AGENT_URL}/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, messages })
  })

  if (!response.ok || !response.body) {
    throw new Error(`Agent service responded with ${response.status}`)
  }

  // Parse NDJSON stream and convert to proper AI SDK stream format
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      // Pass through the chunk
      controller.enqueue(chunk)
    }
  })
  
  // Track active tool calls to match results with starts
  const toolCallMap = new Map<string, any>()
  
  const stream = new ReadableStream({
    async start(controller) {
      let buffer = ''
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (!line.trim()) continue
            
            try {
              const event = JSON.parse(line)
              
              // Forward all events from backend
              if (event.type === 'data') {
                // Text content goes as text chunks
                if (event.event === 'agent.text' && event.text) {
                  const formatted = `0:${JSON.stringify(event.text)}\n`
                  controller.enqueue(encoder.encode(formatted))
                } else if (event.event === 'agent.completed' && event.summary) {
                  const formatted = `0:${JSON.stringify(event.summary)}\n`
                  controller.enqueue(encoder.encode(formatted))
                }
                
                // Tool start events - track them and send to UI
                if (event.event === 'agent.tool-start') {
                  const toolId = event.tool_id
                  toolCallMap.set(toolId, {
                    tool: event.tool,
                    cli_tool: event.cli_tool,
                    metadata: event.metadata,
                    args: event.args,
                  })
                  
                  // Send tool-start as data annotation
                  const dataAnnotation = `2:[${JSON.stringify({
                    type: 'data',
                    event: 'agent.tool-start',
                    tool_id: toolId,
                    cli_tool: event.cli_tool,
                    metadata: event.metadata,
                  })}]\n`
                  controller.enqueue(encoder.encode(dataAnnotation))
                }
                
                // Tool result events - match with start and send complete info
                if (event.event === 'agent.tool-result') {
                  const toolId = event.tool_id
                  const toolInfo = toolCallMap.get(toolId)
                  
                  // Send tool-result with complete context
                  const dataAnnotation = `2:[${JSON.stringify({
                    type: 'data',
                    event: 'agent.tool-result',
                    tool_id: toolId,
                    cli_tool: toolInfo?.cli_tool || 'unknown',
                    metadata: toolInfo?.metadata,
                    result: event.result,
                  })}]\n`
                  controller.enqueue(encoder.encode(dataAnnotation))
                  
                  // Clean up
                  toolCallMap.delete(toolId)
                }
                
                // Tool error events
                if (event.event === 'agent.tool-error') {
                  const toolId = event.tool_id
                  const toolInfo = toolCallMap.get(toolId)
                  
                  const dataAnnotation = `2:[${JSON.stringify({
                    type: 'data',
                    event: 'agent.tool-error',
                    tool_id: toolId,
                    cli_tool: toolInfo?.cli_tool || 'unknown',
                    error: event.error,
                  })}]\n`
                  controller.enqueue(encoder.encode(dataAnnotation))
                  
                  toolCallMap.delete(toolId)
                }
                
                // Other log/debug events
                if (event.event === 'agent.log') {
                  const dataAnnotation = `2:[${JSON.stringify(event)}]\n`
                  controller.enqueue(encoder.encode(dataAnnotation))
                }
              }
            } catch (e) {
              console.error('Failed to parse NDJSON line:', line, e)
            }
          }
        }
        
        controller.close()
      } catch (error) {
        console.error('Stream error:', error)
        controller.error(error)
      }
    }
  })

  return new StreamingTextResponse(stream)
}
