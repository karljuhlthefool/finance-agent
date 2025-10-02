import { NextRequest } from 'next/server'
import { streamText, tool } from 'ai'
import { z } from 'zod'

const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:5051'

async function forwardToAgent(payload: unknown) {
  const response = await fetch(`${AGENT_URL}/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok || !response.body) {
    throw new Error(`Agent service responded with ${response.status}`)
  }

  return response.body
}

const runCalcSimple = tool({
  description: 'Run deterministic finance calculations (delta, growth, etc.)',
  parameters: z.object({
    operation: z.string().default('delta'),
    current: z.number(),
    previous: z.number(),
    mode: z.string().default('percent')
  }),
  execute: async ({ operation, current, previous, mode }) => ({
    forwardToAgent: {
      tool: 'mf_calc_simple',
      args: { operation, current, previous, mode }
    }
  })
})

const fetchMarket = tool({
  description: 'Fetch market data files using mf-market-get',
  parameters: z.object({
    ticker: z.string(),
    fields: z.array(z.string()).default(['prices']),
    range: z.string().default('1y')
  }),
  execute: async ({ ticker, fields, range }) => ({
    forwardToAgent: {
      tool: 'mf_market_get',
      args: { ticker, fields, range }
    }
  })
})

export async function POST(request: NextRequest) {
  const { messages } = await request.json()

  const result = await streamText({
    model: {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-7-sonnet'
    },
    messages,
    tools: { runCalcSimple, fetchMarket }
  })

  const pythonStream = await forwardToAgent({ prompt: messages?.at(-1)?.content, messages })

  return result.toDataStreamResponse({
    data: pythonStream
  })
}
