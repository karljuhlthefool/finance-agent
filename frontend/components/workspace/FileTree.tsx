'use client'

import { useState } from 'react'
import { useWorkspace, type FileNode } from '@/lib/workspace-context'
import { isChartFilePath } from '@/lib/chart-detector'

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFileIcon(node: FileNode): string {
  if (node.type === 'directory') return '📁'
  
  // Special handling for chart files - show chart icon
  if (node.extension === '.json' && isChartFilePath(node.path)) {
    return '📊'
  }
  
  switch (node.extension) {
    case '.json': return '📋' // Regular JSON gets different icon
    case '.md': return '📝'
    case '.txt': return '📄'
    case '.log': return '📋'
    case '.jsonl': return '📜'
    case '.py': return '🐍'
    case '.ts': case '.tsx': return '🔷'
    case '.js': case '.jsx': return '📜'
    default: return '📄'
  }
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2) // Auto-expand first 2 levels
  const { selectedFile, setSelectedFile } = useWorkspace()
  
  const isSelected = selectedFile === node.path
  const hasChildren = node.children && node.children.length > 0

  const handleClick = () => {
    if (node.type === 'directory') {
      setIsOpen(!isOpen)
    } else {
      setSelectedFile(node.path)
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-1.5 py-1 cursor-pointer hover:bg-slate-100 rounded transition-colors ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <span className="text-slate-400 text-[10px] w-2">
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        {node.type === 'file' && <span className="w-2"></span>}
        <span className="text-xs">{getFileIcon(node)}</span>
        <span className="text-xs text-slate-700 flex-1 truncate" title={node.name}>
          {node.name}
        </span>
        {node.size !== undefined && node.size !== null && (
          <span className="text-[10px] text-slate-400">{formatSize(node.size)}</span>
        )}
      </div>
      
      {node.type === 'directory' && isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTree() {
  const { tree, isLoading, error, refreshTree } = useWorkspace()

  if (error) {
    return (
      <div className="p-4 text-sm">
        <p className="text-red-600 mb-2">{error}</p>
        <button
          onClick={refreshTree}
          className="text-blue-600 hover:underline text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading && tree.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div>
        Loading workspace...
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500">
        <p>No files in workspace yet.</p>
        <p className="text-xs mt-2 text-slate-400">
          Files will appear here as the agent works.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto overflow-x-hidden p-2 h-full">
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} />
      ))}
    </div>
  )
}

