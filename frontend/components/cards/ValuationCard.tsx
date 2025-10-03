'use client'

import { useState } from 'react'
import Badge from '../ui/Badge'
import { ComparisonGauge } from '../charts/Gauge'
import Waterfall from '../charts/Waterfall'
import InsightBubble from '../agent/InsightBubble'

type ValuationCardProps = {
  toolId: string
  metadata?: {
    ticker?: string
    description?: string
  }
  result?: {
    ok?: boolean
    result?: {
      scenarios?: {
        base?: { per_share: number; npv: number }
        bull?: { per_share: number; npv: number }
        bear?: { per_share: number; npv: number }
      }
      valuation?: {
        dcf_value?: number
        current_price?: number
        upside_pct?: number
      }
      summary?: string
    }
    paths?: string[]
  }
  isLoading?: boolean
}

export default function ValuationCard({ toolId, metadata, result, isLoading }: ValuationCardProps) {
  const [scenario, setScenario] = useState<'bear' | 'base' | 'bull'>('base')
  
  const ticker = metadata?.ticker || 'Unknown'
  const valuation = result?.result?.valuation
  const scenarios = result?.result?.scenarios
  const summary = result?.result?.summary
  
  // Get current scenario values
  const currentScenario = scenarios?.[scenario]
  const fairValue = currentScenario?.per_share || valuation?.dcf_value || 0
  const currentPrice = valuation?.current_price || 0
  const upside = currentPrice > 0 ? ((fairValue - currentPrice) / currentPrice) * 100 : 0
  
  const formatCurrency = (value: number) => {
    if (!value) return 'N/A'
    return `$${value.toFixed(2)}`
  }
  
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }
  
  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <h3 className="text-lg font-semibold text-purple-900">DCF Valuation</h3>
            <p className="text-xs text-purple-700 mt-0.5">
              {metadata?.description || `Analyzing ${ticker}`}
            </p>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]"></div>
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]"></div>
            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500"></div>
          </div>
        )}
      </div>
      
      {!result && isLoading && (
        <div className="text-sm text-purple-600 py-8 text-center">
          Running DCF analysis with multiple scenarios...
        </div>
      )}
      
      {result && (scenarios || valuation) && (
        <div className="space-y-4">
          {/* Scenario Selector */}
          {scenarios && (
            <div className="flex gap-2 p-1 bg-white rounded-lg border border-purple-200">
              {(['bear', 'base', 'bull'] as const).map((s) => {
                const isActive = scenario === s
                const colors = {
                  bear: 'from-red-50 to-red-100 border-red-300 text-red-700',
                  base: 'from-blue-50 to-blue-100 border-blue-300 text-blue-700',
                  bull: 'from-green-50 to-green-100 border-green-300 text-green-700'
                }
                
                return (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className={`
                      flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all
                      ${isActive 
                        ? `bg-gradient-to-br ${colors[s]} border shadow-sm` 
                        : 'text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >
                    <div className="capitalize">{s}</div>
                    {scenarios[s] && (
                      <div className="text-xs font-semibold mt-0.5">
                        {formatCurrency(scenarios[s].per_share)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          
          {/* Main Valuation Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white p-4 shadow-sm border border-purple-200">
              <div className="text-xs text-slate-500 mb-1">Fair Value (DCF)</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(fairValue)}
              </div>
            </div>
            
            <div className="rounded-lg bg-white p-4 shadow-sm border border-purple-200">
              <div className="text-xs text-slate-500 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-slate-700">
                {formatCurrency(currentPrice)}
              </div>
            </div>
          </div>
          
          {/* Upside/Downside Indicator */}
          {currentPrice > 0 && (
            <div className={`
              rounded-lg p-4
              ${upside >= 0 
                ? 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200' 
                : 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200'
              }
            `}>
              <div className="text-xs font-medium text-slate-600 mb-1">
                {upside >= 0 ? 'Upside Potential' : 'Downside Risk'}
              </div>
              <div className={`text-3xl font-bold ${upside >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercent(upside)}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {upside >= 0 
                  ? `${ticker} trading below fair value` 
                  : `${ticker} trading above fair value`
                }
              </div>
            </div>
          )}
          
          {/* DCF Waterfall (simplified) */}
          {currentScenario?.npv && (
            <div className="rounded-lg bg-white p-4 border border-purple-200">
              <div className="text-sm font-medium text-slate-700 mb-3">Valuation Breakdown</div>
              <Waterfall 
                data={[
                  { label: 'Op. FCF', value: currentScenario.npv * 0.4, type: 'positive' },
                  { label: 'Terminal', value: currentScenario.npv * 0.6, type: 'positive' },
                  { label: 'EV', value: currentScenario.npv, type: 'total' }
                ]}
              />
            </div>
          )}
          
          {/* Summary */}
          {summary && (
            <div className="rounded-lg bg-white p-4 border border-purple-200">
              <div className="text-sm font-medium text-slate-700 mb-2">Analysis</div>
              <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Insight */}
      {result && (scenarios || valuation) && currentPrice > 0 && (
        <div className="mt-4">
          <InsightBubble type={Math.abs(upside) > 30 ? 'warning' : 'observation'}>
            {Math.abs(upside) > 30 
              ? `⚠️ Significant ${upside > 0 ? 'upside' : 'downside'} of ${Math.abs(upside).toFixed(0)}% suggests ${upside > 0 ? 'undervaluation' : 'overvaluation'}. Consider market conditions and risks.`
              : `Fair value ${formatCurrency(fairValue)} is ${Math.abs(upside).toFixed(0)}% ${upside > 0 ? 'above' : 'below'} current price. Relatively aligned with market.`
            }
          </InsightBubble>
        </div>
      )}
    </div>
  )
}
