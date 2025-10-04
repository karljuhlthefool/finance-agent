'use client'

import { ToolHeader } from '../base/ToolHeader'
import { ToolBody } from '../base/ToolBody'
import { ToolFooter } from '../base/ToolFooter'
import { cn } from '@/lib/utils'
import { useToolStore } from '@/lib/tool-store'
import { MarketDataResult } from '../tool-specific/MarketDataResult'
import { GenericResult } from '../tool-specific/GenericResult'
import { ChartResult } from '../tool-specific/ChartResult'
import { MetricsGrid } from '@/components/visualizations/MetricsGrid'
import { useWorkspace } from '@/lib/workspace-context'

interface ResultCardProps {
  toolId: string
  cliTool?: string
  toolName?: string
  metadata?: Record<string, any>
  args?: Record<string, any>
  description?: string
  elapsed: number
  result?: {
    ok: boolean
    result?: any
    paths?: string[]
    metrics?: any
    error?: string
  }
  isExpanded: boolean
  className?: string
}

export function ResultCard({
  toolId,
  cliTool,
  toolName,
  metadata,
  args,
  description,
  elapsed,
  result,
  isExpanded,
  className
}: ResultCardProps) {
  const { setSelectedFile, setIsExpanded: setWorkspaceExpanded } = useWorkspace()
  
  // For CLI tools, check the 'ok' field. For other tools, accept any result.
  const isCLITool = !!cliTool
  if (isCLITool && !result?.ok) {
    return null // Error handled by ErrorCard
  }
  
  // For non-CLI tools, if there's no result at all, don't render
  if (!isCLITool && !result) {
    return null
  }
  
  // Route to tool-specific result component
  const renderToolResult = () => {
    // Check for UI component format (visual components like MetricsGrid)
    if (result?.format === 'ui_component' && result?.result?.component) {
      const componentType = result.result.component
      const renderData = result.result.render_data
      const uiId = result.result.ui_id

      switch (componentType) {
        case 'metrics_grid':
          return (
            <MetricsGrid
              data={renderData}
              ui_id={uiId}
            />
          )

        default:
          // Unknown UI component, fall through to generic
          break
      }
    }
    
    // Check for chart format (regular chart data)
    if (result?.format === 'chart' || cliTool === 'mf-chart-data') {
      return (
        <ChartResult
          result={result.result}
          isExpanded={isExpanded}
        />
      )
    }
    
    switch (cliTool) {
      case 'mf-market-get':
        return (
          <MarketDataResult
            result={result.result}
            metadata={metadata}
            isExpanded={isExpanded}
          />
        )
      
      // For now, use GenericResult for all other tools
      default:
        return (
          <GenericResult
            result={result.result}
            isExpanded={isExpanded}
          />
        )
    }
  }
  
  // Show output files summary when collapsed
  // Collect all files to display
  const outputFiles = result.paths || []
  
  // For Read/Write tools, also include the file_path argument
  const filePathArg = args?.file_path || args?.path || metadata?.file_path || metadata?.path
  const allFiles = filePathArg 
    ? [filePathArg, ...outputFiles.filter(f => f !== filePathArg)] // Dedupe
    : outputFiles
  
  const fileCount = allFiles.length
  
  // Extract just the filename from a path
  const getFileName = (path: string) => {
    const parts = path.split('/')
    return parts[parts.length - 1]
  }
  
  // Get relative path for workspace
  const getWorkspacePath = (path: string) => {
    // Remove absolute workspace prefix if present
    const workspacePrefix = '/Users/karl/work/claude_finance_py/runtime/workspace/'
    if (path.startsWith(workspacePrefix)) {
      return path.slice(workspacePrefix.length)
    }
    return path
  }
  
  // Handle file click - open in workspace panel
  const handleFileClick = (path: string) => {
    const relativePath = getWorkspacePath(path)
    setSelectedFile(relativePath)
    setWorkspaceExpanded(true)
  }
  
  return (
    <div 
      className={cn(
        'group rounded-md bg-white',
        'ring-1 ring-slate-200/60',
        'hover:ring-slate-300/80 hover:shadow-sm',
        'transition-all duration-150',
        className
      )}
    >
      {/* Header */}
      <div className="px-2.5 py-1.5 hover:bg-slate-50/50 transition-colors duration-150 rounded-t-md">
        <ToolHeader 
          cliTool={cliTool}
          toolName={toolName}
          status="complete"
          elapsed={elapsed}
          metadata={metadata}
          args={args}
          description={description}
        />
      </div>
        
      {/* Result body */}
      <div className="px-2.5 pb-2">
        {renderToolResult()}
      </div>
      
      {/* Output files - compact badges */}
      {fileCount > 0 && (
        <div className="px-2.5 pb-1.5 flex flex-wrap items-center gap-1">
          {allFiles.map((path, idx) => (
            <button
              key={idx}
              onClick={() => handleFileClick(path)}
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5',
                'text-[10px] font-medium',
                'text-blue-600 hover:text-blue-700',
                'bg-blue-50/50 hover:bg-blue-50',
                'rounded border border-blue-200/50 hover:border-blue-300',
                'transition-all duration-150',
                'hover:shadow-xs'
              )}
            >
              <span className="text-[10px]">📄</span>
              <span className="font-mono">{getFileName(path)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

