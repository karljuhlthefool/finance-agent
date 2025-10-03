import React from 'react';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { Sparkline } from '../charts/Sparkline';
import { InsightBubble } from '../agent/InsightBubble';

interface EstimatesCardProps {
  toolCall?: {
    tool_id: string;
    cli_tool: string;
    metadata?: {
      ticker?: string;
      metric?: string;
      years_future?: number;
      years_past?: number;
      currency?: string;
    };
  };
  result?: {
    ok: boolean;
    result?: {
      estimates?: string;
    };
    paths?: string[];
    metrics?: {
      t_ms?: number;
    };
    error?: string;
  };
  isLoading?: boolean;
}

export function EstimatesCard({ toolCall, result, isLoading }: EstimatesCardProps) {
  const metadata = toolCall?.metadata || {};
  const metrics = result?.metrics || {};
  
  const ticker = metadata.ticker || 'N/A';
  const metric = metadata.metric || 'revenue';
  const yearsFuture = metadata.years_future || 5;
  const yearsPast = metadata.years_past || 0;

  // Format metric name
  const formatMetric = (m: string) => {
    const mapping: Record<string, string> = {
      'revenue': 'Revenue',
      'eps': 'EPS',
      'ebitda': 'EBITDA',
      'ebit': 'EBIT',
      'net_income': 'Net Income',
      'fcf': 'Free Cash Flow',
    };
    return mapping[m.toLowerCase()] || m.toUpperCase();
  };

  // Get metric icon
  const getMetricIcon = (m: string) => {
    const iconMap: Record<string, string> = {
      'revenue': '💰',
      'eps': '📈',
      'ebitda': '💵',
      'ebit': '💸',
      'net_income': '💲',
      'fcf': '🏦',
    };
    return iconMap[m.toLowerCase()] || '📊';
  };

  return (
    <div className="estimates-card border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {getMetricIcon(metric)} Analyst Estimates
            </h3>
            <Badge variant="info">{ticker}</Badge>
            {isLoading && (
              <span className="text-xs text-gray-500 animate-pulse">Fetching...</span>
            )}
          </div>
          
          {/* Metric Info */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">{formatMetric(metric)}</span>
            <span className="text-gray-400">•</span>
            <span>
              {yearsPast > 0 && `${yearsPast}Y past + `}
              {yearsFuture}Y forward
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">
            Fetching {formatMetric(metric)} estimates from CapIQ...
          </span>
        </div>
      )}

      {/* Result */}
      {!isLoading && result && (
        <>
          {result.ok ? (
            <div className="space-y-3">
              {/* Insight */}
              <InsightBubble
                insight={`Retrieved consensus ${formatMetric(metric)} estimates for ${ticker} covering ${
                  yearsPast + yearsFuture
                } years from CapIQ`}
                variant="success"
              />

              {/* Estimates Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Data Source</div>
                    <div className="text-sm font-semibold text-gray-900">S&P Capital IQ</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Metric Type</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatMetric(metric)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Horizon</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {yearsFuture}-Year Forward
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Currency</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {metadata.currency === 'usd' ? 'USD' : 'Original'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Placeholder */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Consensus Forecast Trend
                </div>
                <div className="h-12 flex items-center justify-center">
                  {/* Placeholder for future sparkline when we load the actual data */}
                  <div className="text-xs text-gray-500 italic">
                    Estimates data saved to workspace
                  </div>
                </div>
              </div>

              {/* Saved Files */}
              {result.paths && result.paths.length > 0 && (
                <div className="bg-blue-50 rounded p-2 border border-blue-200">
                  <div className="text-xs font-medium text-blue-800 mb-1">
                    💾 Saved estimates data
                  </div>
                  {result.paths.map((path, idx) => (
                    <Tooltip key={idx} content={path}>
                      <div className="text-xs text-blue-700 truncate font-mono">
                        {path.split('/').slice(-2).join('/')}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* Metrics Footer */}
              {metrics.t_ms && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    <Tooltip content="Fetch time">
                      <span>⏱️ {(metrics.t_ms / 1000).toFixed(1)}s</span>
                    </Tooltip>
                  </div>
                  <Badge variant="success">CapIQ</Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="text-sm font-medium text-red-800 mb-1">
                ❌ Failed to fetch estimates
              </div>
              <div className="text-xs text-red-700">{result.error}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

