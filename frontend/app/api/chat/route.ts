import { NextRequest } from 'next/server'
import { StreamingTextResponse } from 'ai'

// Hardcoded to avoid Next.js build-time env variable issues
const AGENT_URL = 'http://127.0.0.1:5052'

export async function POST(request: NextRequest) {
  const { messages } = await request.json()
  
  const lastMessage = messages[messages.length - 1]
  const prompt = lastMessage?.content || ''

  console.log('🔗 Connecting to backend:', AGENT_URL)
  console.log('📨 Sending prompt:', prompt.substring(0, 50))

  let response
  try {
    response = await fetch(`${AGENT_URL}/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, messages })
  })
  } catch (error) {
    console.error('❌ Failed to connect to backend:', error)
    throw new Error(`Cannot connect to backend at ${AGENT_URL}: ${error}`)
  }

  if (!response.ok || !response.body) {
    console.error('❌ Backend responded with error:', response.status)
    throw new Error(`Agent service responded with ${response.status}`)
  }

  console.log('✅ Backend responded successfully')

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
                // Text content - handle descriptions vs regular messages differently
                if (event.event === 'agent.text' && event.text) {
                  const text = event.text.trim()
                  const wordCount = text.split(' ').length
                  
                  // Short text (≤12 words) = description for next tool
                  // Only send as data annotation, NOT as text chunk (to avoid duplicate rendering)
                  if (wordCount <= 12) {
                    const dataAnnotation = `2:[${JSON.stringify({
                      type: 'data',
                      event: 'agent.text',
                      text: event.text,
                    })}]\n`
                    controller.enqueue(encoder.encode(dataAnnotation))
                  } 
                  // Long text = regular message content
                  // Send as text chunk for display
                  else {
                    const formatted = `0:${JSON.stringify(event.text)}\n`
                    controller.enqueue(encoder.encode(formatted))
                  }
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
                  
                  console.log('🔧 Forwarding tool-start:', {
                    toolId,
                    has_tool: 'tool' in event,
                    has_args: 'args' in event,
                    tool: event.tool,
                    args: event.args
                  })
                  
                  // Send tool-start as data annotation with ALL fields
                  const dataAnnotation = `2:[${JSON.stringify({
                    type: 'data',
                    event: 'agent.tool-start',
                    tool_id: toolId,
                    tool: event.tool,          // ← ADD THIS
                    cli_tool: event.cli_tool,
                    metadata: event.metadata,
                    args: event.args,          // ← ADD THIS
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
