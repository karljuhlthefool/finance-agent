'use client'

import React from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import { useResizable } from '@/lib/use-resizable'
import FileTree from './FileTree'
import FileViewer from './FileViewer'

export default function WorkspacePanel() {
  const { isExpanded, setIsExpanded, selectedFile, tree, refreshTree, width, setWidth } = useWorkspace()
  const { width: resizableWidth, isResizing, startResize } = useResizable(
    width, 
    300, 
    800,
    () => setIsExpanded(false) // Collapse when dragged to edge
  )
  
  const [isDragging, setIsDragging] = React.useState(false)
  
  // Update context width when resizing
  if (resizableWidth !== width && !isResizing) {
    setWidth(resizableWidth)
  }
  
  // Track if user is dragging or just clicking
  const handleResizeStart = (e: React.MouseEvent) => {
    setIsDragging(false)
    startResize(e)
  }
  
  const handleResizeMove = () => {
    setIsDragging(true)
  }
  
  // Handle click vs drag
  const handleResizeClick = () => {
    if (!isDragging) {
      setIsExpanded(false)
    }
    setIsDragging(false)
  }
  
  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      return () => window.removeEventListener('mousemove', handleResizeMove)
    }
  }, [isResizing])

  if (!isExpanded) {
    return (
      <div 
        className="h-screen w-12 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors flex flex-col items-center pt-4 gap-3 border-l border-slate-300 shadow-sm"
        onClick={() => setIsExpanded(true)}
        title="Open workspace"
      >
        {/* Folder icon at top */}
        <div className="text-xl">📁</div>
        
        {/* File count badge */}
        {tree.length > 0 && (
          <div className="bg-slate-600 text-white text-xs w-6 h-6 rounded-full font-semibold flex items-center justify-center">
            {tree.length}
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className="h-screen bg-white border-l border-slate-200 shadow-xl flex flex-col relative flex-shrink-0"
      style={{ width: `${resizableWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-50 ${
          isResizing ? 'bg-blue-500' : 'bg-transparent'
        }`}
        onMouseDown={handleResizeStart}
        onMouseUp={handleResizeClick}
        title="Click to collapse, drag to resize"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-slate-400 hover:bg-blue-500 rounded-r transition-colors" />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📁</span>
          <h2 className="text-xs font-semibold text-slate-900">Workspace</h2>
          {tree.length > 0 && (
            <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
              {tree.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refreshTree}
            className="text-slate-500 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200 transition-colors"
            title="Refresh workspace"
          >
            <svg 
              className="w-3 h-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-slate-500 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200 transition-colors"
            title="Close workspace panel"
          >
            <svg 
              className="w-3 h-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Split view: Tree or Viewer */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <FileViewer />
        ) : (
          <FileTree />
        )}
      </div>

      {/* Footer with breadcrumb when file is selected */}
      {selectedFile && (
        <div className="border-t border-slate-200 p-2 bg-slate-50 flex-shrink-0">
          <div className="text-xs text-slate-500 truncate" title={selectedFile}>
            📂 {selectedFile}
          </div>
        </div>
      )}
    </div>
  )
}

