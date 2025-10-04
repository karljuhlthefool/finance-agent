'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace-context'

interface Entity {
  name: string
  subtitle?: string
  highlight?: boolean
}

interface RowValue {
  value?: string
  trend?: 'up' | 'down' | 'neutral'
  status?: 'good' | 'warning' | 'bad'
}

interface Row {
  label: string
  values: (string | RowValue)[]
}

interface ComparisonTableData {
  title: string
  subtitle?: string
  entities: Entity[]
  rows: Row[]
  data_sources?: string[]
}

interface ComparisonTableProps {
  data: ComparisonTableData
  ui_id: string
  className?: string
}

export function ComparisonTable({ data, ui_id, className }: ComparisonTableProps) {
  const { setSelectedFile, setIsExpanded: setWorkspaceExpanded } = useWorkspace()
  const [showSources, setShowSources] = useState(false)

  const getStatusColor = (status?: 'good' | 'warning' | 'bad') => {
    switch (status) {
      case 'good':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'bad':
        return 'text-red-600'
      default:
        return 'text-slate-700'
    }
  }

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↑</span>
      case 'down':
        return <span className="text-red-500">↓</span>
      case 'neutral':
        return <span className="text-slate-400">→</span>
      default:
        return null
    }
  }

  const renderValue = (val: string | RowValue) => {
    if (typeof val === 'string') {
      return <span>{val}</span>
    }
    return (
      <span className={cn('flex items-center gap-1', getStatusColor(val.status))}>
        <span>{val.value}</span>
        {getTrendIcon(val.trend)}
      </span>
    )
  }

  const handleFileClick = (path: string) => {
    setSelectedFile(path)
    setWorkspaceExpanded(true)
  }

  return (
    <Card className={cn('w-full max-w-5xl mx-auto shadow-lg', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-slate-800">{data.title}</CardTitle>
        {data.subtitle && <p className="text-sm text-slate-500">{data.subtitle}</p>}
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Metric
                </th>
                {data.entities.map((entity, idx) => (
                  <th
                    key={`${ui_id}-entity-${idx}`}
                    className={cn(
                      'text-center py-3 px-4 text-sm font-semibold',
                      entity.highlight
                        ? 'bg-blue-50 text-blue-900 border-l-2 border-r-2 border-blue-300'
                        : 'text-slate-700'
                    )}
                  >
                    <div className="font-bold">{entity.name}</div>
                    {entity.subtitle && (
                      <div className="text-xs font-normal text-slate-500 mt-0.5">
                        {entity.subtitle}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIdx) => (
                <tr
                  key={`${ui_id}-row-${rowIdx}`}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-slate-700">
                    {row.label}
                  </td>
                  {row.values.map((value, valIdx) => {
                    const entity = data.entities[valIdx]
                    return (
                      <td
                        key={`${ui_id}-val-${rowIdx}-${valIdx}`}
                        className={cn(
                          'text-center py-3 px-4 text-sm',
                          entity?.highlight && 'bg-blue-50/30'
                        )}
                      >
                        {renderValue(value)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

