'use client'

import { SparklineWithLabel } from '../charts/Sparkline'
import { TrendBadge } from '../ui/Badge'
import InsightBubble from '../agent/InsightBubble'

type CalculationCardProps = {
  toolId: string
  metadata?: {
    description?: string
    operation?: string
  }
  result?: {
    ok?: boolean
    result?: {
      summary?: string
      result?: any
      data?: any
      series?: Array<{
        date: string
        value: number
        delta_pct?: number
      }>
    }
    paths?: string[]
  }
  isLoading?: boolean
}

export default function CalculationCard({ toolId, metadata, result, isLoading }: CalculationCardProps) {
  const summary = result?.result?.summary
  const data = result?.result?.result || result?.result?.data
  const series = result?.result?.series || data?.growth || []
  
  // Detect trend from series
  const detectTrend = (values: number[]) => {
    if (values.length < 2) return 'neutral'
    const recent = values.slice(-3)
    const isAccelerating = recent.every((v, i) => i === 0 || v > recent[i - 1])
    const isDecelerating = recent.every((v, i) => i === 0 || v < recent[i - 1])
    
    if (isAccelerating) return 'accelerating'
    if (isDecelerating) return 'decelerating'
    return values[values.length - 1] > values[0] ? 'up' : 'down'
  }
  
  // Parse growth data if available
  const growthMetrics = Array.isArray(series) && series.length > 0 ? series : []
  
  return (
    <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧮</span>
          <div>
            <h3 className="text-lg font-semibold text-green-900">Calculation</h3>
            <p className="text-xs text-green-700 mt-0.5">
              {metadata?.description || metadata?.operation || 'Running analysis'}
            </p>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.3s]"></div>
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500 [animation-delay:-0.15s]"></div>
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-500"></div>
          </div>
        )}
      </div>
      
      {!result && isLoading && (
        <div className="text-sm text-green-600 py-8 text-center">
          Processing calculation...
        </div>
      )}
      
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          {summary && (
            <div className="rounded-lg bg-white p-4 shadow-sm border border-green-200">
              <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
            </div>
          )}
          
          {/* Growth Metrics with Sparklines */}
          {growthMetrics.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">Growth Trends</div>
              
              {growthMetrics.slice(0, 5).map((item: any, idx: number) => {
                // Extract values for sparkline
                const values = [item.revenueGrowth, item.netIncomeGrowth, item.ebitgrowth]
                  .filter(v => v !== undefined)
                  .map(v => v * 100) // Convert to percentage
                
                if (values.length === 0) return null
                
                const trend = detectTrend(values)
                const currentValue = values[values.length - 1]
                
                return (
                  <div key={idx} className="rounded-lg bg-white p-3 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600">
                        {item.date || `Period ${idx + 1}`}
                      </span>
                      <TrendBadge trend={trend as any} />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {item.revenueGrowth !== undefined && (
                        <div>
                          <div className="text-slate-500">Revenue</div>
                          <div className={`font-semibold ${item.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(item.revenueGrowth * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {item.netIncomeGrowth !== undefined && (
                        <div>
                          <div className="text-slate-500">Net Income</div>
                          <div className={`font-semibold ${item.netIncomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(item.netIncomeGrowth * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {item.ebitgrowth !== undefined && (
                        <div>
                          <div className="text-slate-500">EBIT</div>
                          <div className={`font-semibold ${item.ebitgrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(item.ebitgrowth * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Raw Data (if no structured format) */}
          {!growthMetrics.length && data && (
            <div className="rounded-lg bg-green-100/50 p-3 border border-green-200">
              <pre className="max-h-48 overflow-y-auto text-xs font-mono text-green-900 whitespace-pre-wrap break-words">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Insight */}
      {result && growthMetrics.length > 0 && (
        <div className="mt-4">
          <InsightBubble type="observation">
            Analyzed {growthMetrics.length} periods of growth data. 
            {growthMetrics[0]?.revenueGrowth !== undefined && 
              ` Latest revenue growth: ${(growthMetrics[0].revenueGrowth * 100).toFixed(1)}%.`
            }
          </InsightBubble>
        </div>
      )}
    </div>
  )
}
