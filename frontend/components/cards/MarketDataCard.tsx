'use client'

import { useState } from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs'
import ProgressIndicator from '../ui/ProgressIndicator'
import Badge from '../ui/Badge'
import MiniLineChart from '../charts/MiniLineChart'
import InsightBubble from '../agent/InsightBubble'

type MarketDataCardProps = {
  toolId: string
  metadata?: {
    ticker?: string
    fields?: string[]
    description?: string
  }
  result?: {
    ok?: boolean
    result?: Record<string, string>
    paths?: string[]
    metrics?: {
      bytes?: number
      t_ms?: number
      fields_fetched?: number
    }
  }
  isLoading?: boolean
}

export default function MarketDataCard({ toolId, metadata, result, isLoading }: MarketDataCardProps) {
  const { setSelectedFile, setIsExpanded } = useWorkspace()
  const [activeTab, setActiveTab] = useState('overview')
  
  const ticker = metadata?.ticker || 'Unknown'
  const fields = metadata?.fields || []
  const paths = result?.paths || []
  const metrics = result?.metrics
  
  const openFile = (path: string) => {
    const workspacePart = path.split('/runtime/workspace/')[1] || path.split('/workspace/')[1]
    if (workspacePart) {
      setSelectedFile(workspacePart)
      setIsExpanded(true)
    }
  }
  
  // Parse data from result paths
  const pricesData = paths.find(p => p.includes('prices'))
  const fundamentalsData = paths.find(p => p.includes('fundamentals'))
  const ratiosData = paths.find(p => p.includes('ratios'))
  const analystData = paths.find(p => p.includes('analyst'))
  
  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-blue-900">{ticker}</h3>
              {isLoading ? (
                <Badge variant="info" size="sm">Fetching...</Badge>
              ) : result?.ok ? (
                <Badge variant="success" size="sm">Complete</Badge>
              ) : (
                <Badge variant="error" size="sm">Error</Badge>
              )}
            </div>
            <p className="text-xs text-blue-700 mt-0.5">
              {metadata?.description || `Market data for ${ticker}`}
            </p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
            📊 Chart
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
            🔍 Compare
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="mb-4">
          <ProgressIndicator 
            type="steps" 
            steps={fields.slice(0, 5).map((field, idx) => ({
              label: field,
              status: idx < 2 ? 'done' : idx === 2 ? 'active' : 'pending'
            }))}
          />
        </div>
      )}
      
      {/* Metrics Bar */}
      {metrics && !isLoading && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          {metrics.fields_fetched && (
            <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm border border-blue-100">
              <div className="text-xs text-slate-500">Fields</div>
              <div className="text-lg font-semibold text-blue-900">{metrics.fields_fetched}</div>
            </div>
          )}
          {metrics.t_ms && (
            <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm border border-blue-100">
              <div className="text-xs text-slate-500">Time</div>
              <div className="text-lg font-semibold text-blue-900">{(metrics.t_ms / 1000).toFixed(1)}s</div>
            </div>
          )}
          {metrics.bytes && (
            <div className="rounded-lg bg-white px-3 py-2 text-center shadow-sm border border-blue-100">
              <div className="text-xs text-slate-500">Size</div>
              <div className="text-lg font-semibold text-blue-900">{(metrics.bytes / 1024).toFixed(0)}KB</div>
            </div>
          )}
        </div>
      )}
      
      {/* Tabbed Content */}
      {result && !isLoading && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" icon="📈">Overview</TabsTrigger>
            <TabsTrigger value="fundamentals" icon="💰">Fundamentals</TabsTrigger>
            <TabsTrigger value="analysts" icon="👥">Analysts</TabsTrigger>
            <TabsTrigger value="files" icon="📂" count={paths.length}>Files</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="space-y-4">
              {/* Price Chart Placeholder */}
              {pricesData && (
                <div className="rounded-lg bg-white p-4 border border-blue-100">
                  <div className="text-sm font-medium text-slate-700 mb-2">Price History</div>
                  <div className="h-24 flex items-center justify-center text-sm text-slate-500">
                    <button 
                      onClick={() => openFile(pricesData)}
                      className="text-blue-600 hover:underline"
                    >
                      View price data →
                    </button>
                  </div>
                </div>
              )}
              
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white p-3 border border-blue-100">
                  <div className="text-xs text-slate-500">Market Cap</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">View data</div>
                </div>
                <div className="rounded-lg bg-white p-3 border border-blue-100">
                  <div className="text-xs text-slate-500">P/E Ratio</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">View ratios</div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="fundamentals">
            <div className="space-y-3">
              {fundamentalsData ? (
                <button
                  onClick={() => openFile(fundamentalsData)}
                  className="w-full text-left rounded-lg bg-white p-4 border border-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-900">Quarterly Financials</div>
                  <div className="text-xs text-slate-600 mt-1">Income statement, balance sheet, cash flow</div>
                </button>
              ) : (
                <div className="text-sm text-slate-500 text-center py-4">
                  No fundamental data available
                </div>
              )}
              
              {ratiosData && (
                <button
                  onClick={() => openFile(ratiosData)}
                  className="w-full text-left rounded-lg bg-white p-4 border border-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-900">Financial Ratios</div>
                  <div className="text-xs text-slate-600 mt-1">Liquidity, profitability, leverage metrics</div>
                </button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analysts">
            <div className="space-y-3">
              {analystData ? (
                <button
                  onClick={() => openFile(analystData)}
                  className="w-full text-left rounded-lg bg-white p-4 border border-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-900">Analyst Coverage</div>
                  <div className="text-xs text-slate-600 mt-1">Ratings, estimates, price targets</div>
                </button>
              ) : (
                <div className="text-sm text-slate-500 text-center py-4">
                  No analyst data available
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="files">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {paths.map((path, idx) => {
                const fileName = path.split('/').pop() || path
                return (
                  <button
                    key={idx}
                    onClick={() => openFile(path)}
                    className="flex w-full items-center gap-3 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-blue-400 hover:bg-blue-50"
                    title={path}
                  >
                    <span className="text-lg">📄</span>
                    <span className="flex-1 truncate font-mono text-xs text-blue-700">{fileName}</span>
                    <span className="text-xs text-slate-500">→</span>
                  </button>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Insight (if data shows something interesting) */}
      {result && !isLoading && metrics && (
        <div className="mt-4">
          <InsightBubble type="observation">
            Fetched {metrics.fields_fetched} data types for {ticker} in {metrics.t_ms ? (metrics.t_ms / 1000).toFixed(1) : '?'}s.
            All data saved to workspace for analysis.
          </InsightBubble>
        </div>
      )}
    </div>
  )
}
