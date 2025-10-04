'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace-context'

interface DataPoint {
  date: string
  value: number
}

interface Series {
  name: string
  data: DataPoint[]
  color?: string
}

interface Annotation {
  date: string
  label: string
  type?: 'event' | 'milestone' | 'alert'
}

interface TimelineChartData {
  title: string
  subtitle?: string
  series: Series[]
  annotations?: Annotation[]
  y_label?: string
  data_sources?: string[]
}

interface TimelineChartProps {
  data: TimelineChartData
  ui_id: string
  className?: string
}

export function TimelineChart({ data, ui_id, className }: TimelineChartProps) {
  const { setSelectedFile, setIsExpanded: setWorkspaceExpanded } = useWorkspace()
  const [showSources, setShowSources] = useState(false)

  const handleFileClick = (path: string) => {
    setSelectedFile(path)
    setWorkspaceExpanded(true)
  }

  // Calculate min/max for Y-axis scaling
  const allValues = data.series.flatMap(s => s.data.map(d => d.value))
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const valueRange = maxValue - minValue
  const yMin = minValue - valueRange * 0.1 // Add 10% padding
  const yMax = maxValue + valueRange * 0.1

  // Get all unique dates sorted
  const allDates = [...new Set(data.series.flatMap(s => s.data.map(d => d.date)))].sort()

  // Default colors for series
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  // Scale value to SVG coordinate (inverted for SVG)
  const scaleY = (value: number, height: number) => {
    return height - ((value - yMin) / (yMax - yMin)) * height
  }

  // Get X position for date
  const scaleX = (dateIndex: number, width: number) => {
    return (dateIndex / (allDates.length - 1)) * width
  }

  const chartHeight = 200
  const chartWidth = 600
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }

  return (
    <Card className={cn('w-full max-w-5xl mx-auto shadow-lg', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-slate-800">{data.title}</CardTitle>
        {data.subtitle && <p className="text-sm text-slate-500">{data.subtitle}</p>}
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative" style={{ height: chartHeight + padding.top + padding.bottom }}>
          <svg
            width="100%"
            height={chartHeight + padding.top + padding.bottom}
            viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight + padding.top + padding.bottom}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Y-axis */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight + padding.top}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            
            {/* X-axis */}
            <line
              x1={padding.left}
              y1={chartHeight + padding.top}
              x2={chartWidth + padding.left}
              y2={chartHeight + padding.top}
              stroke="#cbd5e1"
              strokeWidth="1"
            />

            {/* Y-axis label */}
            {data.y_label && (
              <text
                x={10}
                y={chartHeight / 2 + padding.top}
                fill="#64748b"
                fontSize="12"
                textAnchor="middle"
                transform={`rotate(-90, 10, ${chartHeight / 2 + padding.top})`}
              >
                {data.y_label}
              </text>
            )}

            {/* Draw each series */}
            {data.series.map((series, seriesIdx) => {
              const color = series.color || defaultColors[seriesIdx % defaultColors.length]
              
              // Create path for line
              const pathData = series.data
                .map((point, idx) => {
                  const dateIdx = allDates.indexOf(point.date)
                  const x = scaleX(dateIdx, chartWidth) + padding.left
                  const y = scaleY(point.value, chartHeight) + padding.top
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
                })
                .join(' ')

              return (
                <g key={`${ui_id}-series-${seriesIdx}`}>
                  {/* Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points */}
                  {series.data.map((point, idx) => {
                    const dateIdx = allDates.indexOf(point.date)
                    const x = scaleX(dateIdx, chartWidth) + padding.left
                    const y = scaleY(point.value, chartHeight) + padding.top
                    
                    return (
                      <circle
                        key={`${ui_id}-series-${seriesIdx}-point-${idx}`}
                        cx={x}
                        cy={y}
                        r="4"
                        fill={color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    )
                  })}
                </g>
              )
            })}

            {/* X-axis labels (dates) */}
            {allDates.map((date, idx) => {
              if (idx % Math.ceil(allDates.length / 6) !== 0 && idx !== allDates.length - 1) return null
              const x = scaleX(idx, chartWidth) + padding.left
              return (
                <text
                  key={`${ui_id}-date-${idx}`}
                  x={x}
                  y={chartHeight + padding.top + 20}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {date}
                </text>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {data.series.map((series, idx) => {
            const color = series.color || defaultColors[idx % defaultColors.length]
            return (
              <div key={`${ui_id}-legend-${idx}`} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-slate-700">{series.name}</span>
              </div>
            )
          })}
        </div>

        {/* Annotations */}
        {data.annotations && data.annotations.length > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Key Events
            </div>
            <ul className="space-y-1">
              {data.annotations.map((ann, idx) => (
                <li key={`${ui_id}-ann-${idx}`} className="text-sm text-slate-700">
                  <span className="font-medium">{ann.date}:</span> {ann.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.data_sources && data.data_sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <Button
              variant="link"
              onClick={() => setShowSources(!showSources)}
              className="p-0 h-auto text-xs text-slate-600"
            >
              {showSources
                ? 'Hide Data Sources'
                : `Show ${data.data_sources.length} Data Source${data.data_sources.length > 1 ? 's' : ''}`}
            </Button>
            {showSources && (
              <ul className="mt-2 text-xs text-slate-500 space-y-1">
                {data.data_sources.map((source, index) => (
                  <li key={`${ui_id}-source-${index}`} className="flex items-center">
                    <span className="mr-1">📄</span>
                    <Button
                      variant="link"
                      onClick={() => handleFileClick(source)}
                      className="p-0 h-auto text-xs text-slate-600 underline"
                    >
                      {source.replace('/workspace/', '')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

