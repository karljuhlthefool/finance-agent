'use client'

import { useState } from 'react'
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ComposedChart,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartResultProps {
  result?: {
    chart?: {
      type: 'line' | 'bar' | 'area' | 'pie' | 'combo'
      data: Array<Record<string, any>>
      title?: string
      xLabel?: string
      yLabel?: string
      seriesName?: string
      colors?: string[]
      formatY?: 'currency' | 'percent' | 'number'
      secondarySeries?: Array<Record<string, any>>
      secondarySeriesName?: string
    }
    data_points?: number
  }
  isExpanded: boolean
}

export function ChartResult({ result, isExpanded }: ChartResultProps) {
  const [showData, setShowData] = useState(false)

  if (!result?.chart) {
    return (
      <div className="text-xs text-slate-500 italic">
        No chart data available
      </div>
    )
  }

  const { chart } = result
  const { type, data, title, xLabel, yLabel, seriesName, colors, formatY, secondarySeries, secondarySeriesName } = chart

  // Format functions for different Y-axis types
  const formatYAxis = (value: number) => {
    if (formatY === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)
    }
    if (formatY === 'percent') {
      return `${value.toFixed(1)}%`
    }
    // Default number formatting
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  // Custom tooltip for better UX
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold text-slate-900 mb-1">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-slate-700">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span>{formatYAxis(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  // Render different chart types
  const renderChart = () => {
    const chartColors = colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: xLabel, position: 'insideBottom', offset: -5, fontSize: 11, fill: '#475569' }}
                height={60}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569', style: { textAnchor: 'middle' } }}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} verticalAlign="bottom" />
              <Line
                type="monotone"
                dataKey="y"
                name={seriesName || 'Value'}
                stroke={chartColors[0]}
                strokeWidth={2}
                dot={{ fill: chartColors[0], r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: xLabel, position: 'insideBottom', offset: -5, fontSize: 11, fill: '#475569' }}
                height={60}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569', style: { textAnchor: 'middle' } }}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} verticalAlign="bottom" />
              <Bar
                dataKey="y"
                name={seriesName || 'Value'}
                fill={chartColors[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 50 }}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: xLabel, position: 'insideBottom', offset: -5, fontSize: 11, fill: '#475569' }}
                height={60}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569', style: { textAnchor: 'middle' } }}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} verticalAlign="bottom" />
              <Area
                type="monotone"
                dataKey="y"
                name={seriesName || 'Value'}
                stroke={chartColors[0]}
                strokeWidth={2}
                fill="url(#colorArea)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${formatYAxis(entry.value)}`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'combo':
        // Merge data for combo chart
        const comboData = data.map((item, idx) => ({
          ...item,
          y2: secondarySeries?.[idx]?.y || null,
        }))

        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={comboData} margin={{ top: 10, right: 40, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: xLabel, position: 'insideBottom', offset: -5, fontSize: 11, fill: '#475569' }}
                height={60}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#475569', style: { textAnchor: 'middle' } }}
                width={70}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} verticalAlign="bottom" />
              <Bar
                yAxisId="left"
                dataKey="y"
                name={seriesName || 'Primary'}
                fill={chartColors[0]}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="y2"
                name={secondarySeriesName || 'Secondary'}
                stroke={chartColors[1]}
                strokeWidth={2}
                dot={{ fill: chartColors[1], r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )

      default:
        return <div className="text-xs text-red-500">Unknown chart type: {type}</div>
    }
  }

  return (
    <div className="space-y-3">
      {/* Chart title */}
      {title && (
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      )}

      {/* Chart visualization */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        {renderChart()}
      </div>

      {/* Compact summary when not expanded */}
      {!isExpanded && (
        <div className="text-xs text-slate-600">
          {result.data_points || data.length} data points • {type} chart
        </div>
      )}

      {/* Expanded view: show raw data */}
      {isExpanded && (
        <div className="space-y-2">
          <button
            onClick={() => setShowData(!showData)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showData ? 'Hide' : 'Show'} Data Table
          </button>

          {showData && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {type === 'pie' ? (
                      <>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Name</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">Value</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">{xLabel || 'X'}</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">{yLabel || 'Y'}</th>
                        {type === 'combo' && (
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Y2</th>
                        )}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {type === 'pie' ? (
                        <>
                          <td className="px-3 py-2 text-slate-700">{row.name}</td>
                          <td className="px-3 py-2 text-right text-slate-900 font-medium">
                            {formatYAxis(row.value)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-slate-700">{row.x}</td>
                          <td className="px-3 py-2 text-right text-slate-900 font-medium">
                            {formatYAxis(row.y)}
                          </td>
                          {type === 'combo' && secondarySeries && (
                            <td className="px-3 py-2 text-right text-slate-900 font-medium">
                              {formatYAxis(secondarySeries[idx]?.y || 0)}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

