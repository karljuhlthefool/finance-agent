'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/workspace-context'
import { 
  LightbulbIcon, 
  AlertTriangleIcon, 
  TrendingUpIcon, 
  SearchIcon,
  CheckCircle2Icon 
} from 'lucide-react'

interface Point {
  text: string
  emphasis?: 'high' | 'medium' | 'low'
  icon?: 'check' | 'warning' | 'info'
}

interface InsightCardData {
  title: string
  type: 'analysis' | 'recommendation' | 'warning' | 'opportunity' | 'finding'
  summary?: string
  points: Point[]
  conclusion?: string
  data_sources?: string[]
}

interface InsightCardProps {
  data: InsightCardData
  ui_id: string
  className?: string
}

export function InsightCard({ data, ui_id, className }: InsightCardProps) {
  const { setSelectedFile, setIsExpanded: setWorkspaceExpanded } = useWorkspace()
  const [showSources, setShowSources] = useState(false)

  const handleFileClick = (path: string) => {
    setSelectedFile(path)
    setWorkspaceExpanded(true)
  }

  const getTypeConfig = () => {
    switch (data.type) {
      case 'recommendation':
        return {
          icon: <CheckCircle2Icon className="h-5 w-5" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800'
        }
      case 'warning':
        return {
          icon: <AlertTriangleIcon className="h-5 w-5" />,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          titleColor: 'text-amber-800'
        }
      case 'opportunity':
        return {
          icon: <TrendingUpIcon className="h-5 w-5" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800'
        }
      case 'finding':
        return {
          icon: <SearchIcon className="h-5 w-5" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-600',
          titleColor: 'text-purple-800'
        }
      default: // analysis
        return {
          icon: <LightbulbIcon className="h-5 w-5" />,
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          iconColor: 'text-slate-600',
          titleColor: 'text-slate-800'
        }
    }
  }

  const typeConfig = getTypeConfig()

  return (
    <Card className={cn('w-full max-w-4xl mx-auto shadow-lg border-2', typeConfig.borderColor, className)}>
      <CardHeader className={cn('pb-3', typeConfig.bgColor)}>
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', typeConfig.bgColor, typeConfig.iconColor)}>
            {typeConfig.icon}
          </div>
          <div className="flex-1">
            <CardTitle className={cn('text-xl font-bold', typeConfig.titleColor)}>
              {data.title}
            </CardTitle>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">
              {data.type}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {data.summary && (
          <p className="text-base text-slate-700 mb-4 leading-relaxed">
            {data.summary}
          </p>
        )}
        
        {data.points && data.points.length > 0 && (
          <ul className="space-y-3">
            {data.points.map((point, idx) => (
              <li
                key={`${ui_id}-point-${idx}`}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg',
                  point.emphasis === 'high' ? 'bg-amber-50 border border-amber-200' :
                  point.emphasis === 'medium' ? 'bg-blue-50 border border-blue-100' :
                  'bg-slate-50'
                )}
              >
                <span className="text-slate-400 text-sm font-medium mt-0.5 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-sm text-slate-700 leading-relaxed flex-1">
                  {point.text}
                </span>
              </li>
            ))}
          </ul>
        )}

        {data.conclusion && (
          <div className={cn('mt-4 p-4 rounded-lg border', typeConfig.bgColor, typeConfig.borderColor)}>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {data.conclusion}
            </p>
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

