'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import { MetricDisplay, formatBytes } from '@/components/visualizations/MetricDisplay'
import { Skeleton } from '@/components/visualizations/Skeleton'

interface MarketDataResultProps {
  result?: Record<string, string> // field name → file path
  metadata?: {
    ticker?: string
    fields?: string[]
  }
  isExpanded: boolean
}

export function MarketDataResult({
  result,
  metadata,
  isExpanded
}: MarketDataResultProps) {
  const { readFile } = useWorkspace()
  const [loadedData, setLoadedData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  
  const ticker = metadata?.ticker || 'Unknown'
  const fields = metadata?.fields || []
  
  // Load data from workspace files
  useEffect(() => {
    if (!result) return
    
    const loadData = async () => {
      setLoading(true)
      const data: Record<string, any> = {}
      
      for (const [field, filePath] of Object.entries(result)) {
        try {
          const content = await readFile(filePath)
          if (content) {
            const parsed = JSON.parse(content)
            data[field] = Array.isArray(parsed) ? parsed[0] : parsed
          }
        } catch (error) {
          console.warn(`Failed to load ${field}:`, error)
        }
      }
      
      setLoadedData(data)
      setLoading(false)
    }
    
    loadData()
  }, [result, readFile])
  
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    )
  }
  
  // Always show compact summary
  const quote = loadedData.quote
  const profile = loadedData.profile
  
  return (
    <div className="space-y-3">
      {/* Compact Summary - Always Visible */}
      <div className="space-y-2">
        {/* Quote Data */}
        {quote && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">💹</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">
                ${quote.price?.toFixed(2) || 'N/A'}
              </span>
              {quote.change && (
                <>
                  <span className={quote.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                  </span>
                  <span className={quote.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {quote.change >= 0 ? '↑' : '↓'}{Math.abs(quote.changesPercentage || 0).toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Profile Data */}
        {profile && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="text-lg">🏢</span>
            <span className="font-medium">{profile.companyName || ticker}</span>
            {profile.industry && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600">{profile.industry}</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-3 pt-3 border-t border-green-100">
          {/* Quote Details */}
          {quote && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Quote Details</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {quote.dayHigh && (
                  <MetricDisplay label="High" value={`$${quote.dayHigh.toFixed(2)}`} />
                )}
                {quote.dayLow && (
                  <MetricDisplay label="Low" value={`$${quote.dayLow.toFixed(2)}`} />
                )}
                {quote.volume && (
                  <MetricDisplay label="Volume" value={`${(quote.volume / 1e6).toFixed(1)}M`} />
                )}
                {quote.marketCap && (
                  <MetricDisplay label="Mkt Cap" value={`$${(quote.marketCap / 1e12).toFixed(2)}T`} />
                )}
              </div>
            </div>
          )}
          
          {/* Profile Details */}
          {profile && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Company Info</div>
              <div className="space-y-1 text-xs text-slate-600">
                {profile.sector && <div><span className="font-medium">Sector:</span> {profile.sector}</div>}
                {profile.ceo && <div><span className="font-medium">CEO:</span> {profile.ceo}</div>}
                {profile.fullTimeEmployees && (
                  <div><span className="font-medium">Employees:</span> {profile.fullTimeEmployees.toLocaleString()}</div>
                )}
                {profile.website && (
                  <div>
                    <span className="font-medium">Website:</span>{' '}
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Other Fields Summary */}
          {Object.keys(loadedData).length > 2 && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 border border-slate-100">
              +{Object.keys(loadedData).length - 2} additional dataset{Object.keys(loadedData).length - 2 !== 1 ? 's' : ''} saved to workspace
            </div>
          )}
        </div>
      )}
    </div>
  )
}

