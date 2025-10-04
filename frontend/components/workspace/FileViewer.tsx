'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useWorkspace } from '@/lib/workspace-context'
import { ChartResult } from '@/components/tool-cards/tool-specific/ChartResult'
import { isChartData, isChartFilePath, transformToChartResult } from '@/lib/chart-detector'

type FileContent = {
  ok: boolean
  path: string
  name: string
  extension: string
  mime_type: string
  size: number
  modified: number
  content: string
  is_binary?: boolean
  error?: string
}

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://127.0.0.1:5052'

function JsonViewer({ content }: { content: string }) {
  try {
    const parsed = JSON.parse(content)
    return (
      <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded overflow-auto h-full">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    )
  } catch {
    return (
      <div className="p-4 text-red-600 overflow-auto h-full">
        Invalid JSON - displaying as text:
        <pre className="mt-2 text-xs font-mono bg-slate-50 text-slate-900 p-2 rounded overflow-auto">
          {content}
        </pre>
      </div>
    )
  }
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none p-4 overflow-auto h-full">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mb-2">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children }) => (
            <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-900 text-slate-100 p-3 rounded overflow-auto text-xs font-mono my-3">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function TextViewer({ content }: { content: string }) {
  return (
    <pre className="text-xs font-mono bg-slate-50 p-4 overflow-auto whitespace-pre-wrap h-full">
      {content}
    </pre>
  )
}

function ChartViewer({ content, fileName }: { content: string; fileName: string }) {
  const [showRawJson, setShowRawJson] = useState(false)
  
  try {
    const parsed = JSON.parse(content)
    
    // Validate it's chart data
    if (!isChartData(parsed)) {
      // Fall back to JSON viewer if not valid chart data
      return <JsonViewer content={content} />
    }
    
    // Transform to ChartResult format
    const chartResult = transformToChartResult(parsed)
    
    return (
      <div className="p-4 h-full overflow-auto">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Interactive Chart View</span>
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
            📊 {parsed.type.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500">({fileName})</span>
        </div>
        
        <ChartResult 
          result={chartResult} 
          isExpanded={true}
        />
        
        {/* Option to view raw JSON */}
        <div className="mt-4">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            {showRawJson ? '▼ Hide' : '▶ Show'} Raw JSON Data
          </button>
          
          {showRawJson && (
            <div className="mt-2">
              <JsonViewer content={content} />
            </div>
          )}
        </div>
      </div>
    )
  } catch (err) {
    // Parse error - fall back to JSON viewer
    console.warn('Failed to parse chart data:', err)
    return <JsonViewer content={content} />
  }
}

export default function FileViewer() {
  const { selectedFile, setSelectedFile } = useWorkspace()
  const [fileData, setFileData] = useState<FileContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!selectedFile) {
      setFileData(null)
      return
    }

    const loadFile = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `${AGENT_URL}/workspace/file?path=${encodeURIComponent(selectedFile)}`
        )
        const data = await response.json()
        setFileData(data)
      } catch (err) {
        setFileData({
          ok: false,
          error: `Failed to load file: ${err}`,
        } as FileContent)
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [selectedFile])

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-sm">Select a file from the tree to view its contents</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-sm text-slate-500">Loading file...</p>
        </div>
      </div>
    )
  }

  if (!fileData || !fileData.ok) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="font-semibold text-red-900 mb-2">
            {fileData?.is_binary ? 'Binary File' : 'Error Loading File'}
          </div>
          <div className="text-sm text-red-700">
            {fileData?.error || fileData?.is_binary 
              ? `This file cannot be displayed as text. Size: ${((fileData?.size || 0) / 1024).toFixed(1)} KB`
              : 'An unknown error occurred'}
          </div>
          {fileData?.is_binary && (
            <button
              onClick={() => {
                // Create download for binary file
                fetch(`${AGENT_URL}/workspace/file?path=${encodeURIComponent(selectedFile)}`)
                  .then(r => r.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = fileData.name
                    a.click()
                    URL.revokeObjectURL(url)
                  })
              }}
              className="mt-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download File
            </button>
          )}
        </div>
      </div>
    )
  }

  const downloadFile = () => {
    const blob = new Blob([fileData.content], { type: fileData.mime_type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileData.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-3 bg-white flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate" title={fileData.name}>
            {fileData.name}
          </h3>
          <p className="text-xs text-slate-500">
            {(fileData.size / 1024).toFixed(1)} KB • {fileData.extension}
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={downloadFile}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="Download file"
          >
            ⬇ Download
          </button>
          <button
            onClick={() => setSelectedFile(null)}
            className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
            title="Close viewer"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {/* Chart data detection - check FIRST before regular JSON */}
        {fileData.extension === '.json' && 
         isChartFilePath(fileData.path) && 
         <ChartViewer content={fileData.content} fileName={fileData.name} />}
        
        {/* Regular JSON files (non-chart) */}
        {fileData.extension === '.json' && 
         !isChartFilePath(fileData.path) && 
         <JsonViewer content={fileData.content} />}
        
        {/* Markdown files */}
        {fileData.extension === '.md' && <MarkdownViewer content={fileData.content} />}
        
        {/* Plain text files */}
        {!['.json', '.md'].includes(fileData.extension) && (
          <TextViewer content={fileData.content} />
        )}
      </div>
    </div>
  )
}

