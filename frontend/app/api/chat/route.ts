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

const forward = (toolName: string, args: Record<string, unknown>) => ({
  forwardToAgent: {
    tool: toolName,
    args
  }
})

const runCalcSimple = tool({
  description: 'Run deterministic finance calculations (delta, growth, etc.)',
  parameters: z.object({
    operation: z.string().default('delta'),
    current: z.number(),
    previous: z.number(),
    mode: z.string().default('percent')
  }),
  execute: async ({ operation, current, previous, mode }) => forward('mf_calc_simple', { operation, current, previous, mode })
})

const fetchMarket = tool({
  description: 'Fetch market data files using mf-market-get',
  parameters: z.object({
    ticker: z.string(),
    fields: z.array(z.string()).default(['prices']),
    range: z.string().default('1y')
  }),
  execute: async ({ ticker, fields, range }) => forward('mf_market_get', { ticker, fields, range })
})

const fetchFiling = tool({
  description: 'Download the latest SEC filing via mf-documents-get',
  parameters: z.object({
    ticker: z.string(),
    type: z.string().default('10-K'),
    exhibit_limit: z.number().int().min(0).max(50).default(25)
  }),
  execute: async ({ ticker, type, exhibit_limit }) =>
    forward('mf_documents_get', { ticker, type, exhibit_limit })
})

const fetchEstimates = tool({
  description: 'Fetch analyst estimates via mf-estimates-get',
  parameters: z.object({
    ticker: z.string(),
    metric: z.string().default('revenue'),
    years_future: z.number().int().min(1).max(10).default(5),
    years_past: z.number().int().min(0).max(10).default(0)
  }),
  execute: async ({ ticker, metric, years_future, years_past }) =>
    forward('mf_estimates_get', { ticker, metric, years_future, years_past })
})

const inspectJson = tool({
  description: 'Inspect a JSON file to understand its schema',
  parameters: z.object({
    json_file: z.string(),
    max_depth: z.number().int().min(1).max(6).default(3)
  }),
  execute: async ({ json_file, max_depth }) => forward('mf_json_inspect', { json_file, max_depth })
})

const extractJson = tool({
  description: 'Extract values from JSON via mf-extract-json',
  parameters: z.object({
    json_file: z.string().optional(),
    json_data: z.record(z.any()).optional(),
    path: z.string().optional(),
    instruction: z.string().optional()
  }),
  execute: async ({ json_file, json_data, path, instruction }) =>
    forward('mf_extract_json', { json_file, json_data, path, instruction })
})

const diffDocuments = tool({
  description: 'Compare two documents or sections',
  parameters: z.object({
    document1: z.string(),
    document2: z.string(),
    section: z.string().optional(),
    type: z.enum(['line', 'char', 'both']).default('line')
  }),
  execute: async ({ document1, document2, section, type }) =>
    forward('mf_doc_diff', { document1, document2, section, type })
})

const runValuation = tool({
  description: 'Run a discounted cash flow valuation',
  parameters: z.object({
    ticker: z.string(),
    shares_outstanding: z.number(),
    wacc: z.number().default(0.1),
    years: z.number().int().min(3).max(10).default(5)
  }),
  execute: async ({ ticker, shares_outstanding, wacc, years }) =>
    forward('mf_valuation_basic_dcf', { ticker, shares_outstanding, wacc, years })
})

const runQa = tool({
  description: 'Answer questions over filings using mf-qa',
  parameters: z.object({
    instruction: z.string(),
    document_paths: z.array(z.string()).optional(),
    inline_text: z.string().optional(),
    model: z.string().optional()
  }),
  execute: async ({ instruction, document_paths, inline_text, model }) =>
    forward('mf_qa', { instruction, document_paths, inline_text, model })
})

export async function POST(request: NextRequest) {
  const { messages } = await request.json()

  const result = await streamText({
    model: {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-7-sonnet'
    },
    messages,
    tools: {
      runCalcSimple,
      fetchMarket,
      fetchFiling,
      fetchEstimates,
      inspectJson,
      extractJson,
      diffDocuments,
      runValuation,
      runQa
    }
  })

  const pythonStream = await forwardToAgent({ prompt: messages?.at(-1)?.content, messages })

  return result.toDataStreamResponse({
    data: pythonStream
  })
}
