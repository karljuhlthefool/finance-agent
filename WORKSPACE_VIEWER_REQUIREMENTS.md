# Workspace Viewer Requirements & Implementation Plan

## Executive Summary

Add a real-time workspace/file system viewer to the frontend that mirrors the agent's workspace as it operates, allowing users to browse and view files in a formatted, interactive manner.

---

## 1. Business Requirements

### 1.1 Core Features

**Workspace Browser Pane**
- Collapsible/expandable sidebar or panel showing the agent's workspace file tree
- Real-time updates as agent creates/modifies files
- Visual hierarchy matching the actual workspace structure at `/runtime/workspace/`

**File Viewer**
- Click any file to view its contents in a formatted display
- Support multiple file types with appropriate rendering:
  - JSON: Pretty-printed with syntax highlighting and collapsible nodes
  - Markdown: Rendered HTML view
  - Text/logs: Syntax-highlighted code view
  - CSV/tabular: Table view
  - Images: Inline display (if applicable)

**User Experience**
- Non-intrusive: doesn't block chat interaction
- Responsive: updates during agent execution
- Accessible: keyboard navigation, clear visual states
- Performant: handles 100+ files without lag

### 1.2 User Stories

1. **As a user**, I want to see what files the agent is creating/modifying in real-time so I can understand its workflow
2. **As a user**, I want to click on analysis results (like `dcf_AAPL.json`) to inspect the full data structure
3. **As a user**, I want to collapse/expand the workspace panel so it doesn't take up too much screen real estate
4. **As a user**, I want to see file metadata (size, last modified, type) to understand the workspace state
5. **As a user**, I want to download files from the workspace for offline analysis

---

## 2. Technical Architecture

### 2.1 Current System Analysis

**Backend (Python/FastAPI)**
- Agent runs in `/runtime/workspace/` (configurable via `WORKSPACE_ABS_PATH`)
- Agent creates files in structured paths:
  - `/data/market/{TICKER}/` - Market data (JSON)
  - `/data/sec/{TICKER}/{DATE}/{FORM}/` - SEC filings (TXT, JSON)
  - `/analysis/calculations/` - Calculations (JSON)
  - `/analysis/tables/` - Valuation tables (JSON)
  - `/reports/analysis/` - Final reports (MD)
  - `/logs/` - Tool usage logs (JSONL)
  - `/outputs/answers/` - QA outputs (JSON, MD)

**Frontend (Next.js/React)**
- Uses AI SDK's `useChat` hook for streaming
- Receives NDJSON stream from `/query` endpoint
- Data annotations flow via AI SDK protocol: `2:[{type:'data',event:'...',...}]\n`
- Current components: `ReportCard`, `LogsCard`, `GenericToolCard`

**Communication Protocol**
- Backend streams events via NDJSON
- Event format: `{type: 'data', event: 'agent.tool-start|agent.tool-result|agent.text|...', ...}`
- Tool results include `paths[]` arrays with absolute file paths

### 2.2 Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │  Chat Pane   │  │      Workspace Pane (Collapsible)    │ │
│  │              │  │  ┌────────────────────────────────┐  │ │
│  │  Messages    │  │  │   File Tree Component          │  │ │
│  │  Tool Cards  │  │  │   - /data/market/AAPL/...      │  │ │
│  │  Input       │  │  │   - /analysis/calculations/... │  │ │
│  │              │  │  │   - /reports/...               │  │ │
│  └──────────────┘  │  └────────────────────────────────┘  │ │
│                     │                                       │ │
│                     │  ┌────────────────────────────────┐  │ │
│                     │  │   File Viewer Modal/Panel      │  │ │
│                     │  │   - JSON viewer                │  │ │
│                     │  │   - Markdown renderer          │  │ │
│                     │  │   - Code viewer                │  │ │
│                     │  │   - Download button            │  │ │
│                     │  └────────────────────────────────┘  │ │
│                     └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/SSE
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /query POST          - Chat streaming (existing)            │
│  /workspace/tree GET  - Get workspace file tree              │
│  /workspace/file GET  - Get file contents (with query param) │
│  /workspace/watch SSE - Real-time file changes (optional)    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                 File System (/runtime/workspace/)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Plan

### Phase 1: Backend API Endpoints

**Priority: High | Effort: Medium | Risk: Low**

#### 3.1.1 Add Workspace Tree Endpoint

**File:** `agent_service/app.py`

```python
from pathlib import Path
from typing import List, Dict, Any
import os

def _scan_workspace_tree(root: Path, relative_to: Path) -> List[Dict[str, Any]]:
    """Recursively scan workspace directory and return tree structure."""
    items = []
    
    try:
        for item in sorted(root.iterdir()):
            # Skip hidden files and __pycache__
            if item.name.startswith('.') or item.name == '__pycache__':
                continue
            
            relative_path = str(item.relative_to(relative_to))
            stat = item.stat()
            
            node = {
                'name': item.name,
                'path': relative_path,
                'type': 'directory' if item.is_dir() else 'file',
                'size': stat.st_size if item.is_file() else None,
                'modified': stat.st_mtime,
            }
            
            if item.is_dir():
                node['children'] = _scan_workspace_tree(item, relative_to)
            else:
                # Add file extension for type detection
                node['extension'] = item.suffix.lower()
            
            items.append(node)
    
    except Exception as e:
        log("error", f"Error scanning {root}: {str(e)}")
    
    return items

@app.get("/workspace/tree")
async def workspace_tree() -> Dict[str, Any]:
    """Return workspace file tree structure."""
    workspace_path = Path(agent_options().cwd)
    
    tree = _scan_workspace_tree(workspace_path, workspace_path)
    
    return {
        "ok": True,
        "workspace": str(workspace_path),
        "tree": tree,
        "timestamp": datetime.now().isoformat(),
    }
```

#### 3.1.2 Add File Content Endpoint

```python
@app.get("/workspace/file")
async def workspace_file(path: str) -> Dict[str, Any]:
    """Return file contents with metadata."""
    workspace_path = Path(agent_options().cwd)
    
    # Security: ensure path is within workspace
    file_path = (workspace_path / path).resolve()
    if not str(file_path).startswith(str(workspace_path)):
        raise HTTPException(status_code=403, detail="Access denied: path outside workspace")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not file_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")
    
    try:
        stat = file_path.stat()
        
        # Detect file type
        extension = file_path.suffix.lower()
        mime_type = "text/plain"
        
        if extension == ".json":
            mime_type = "application/json"
        elif extension == ".md":
            mime_type = "text/markdown"
        elif extension in [".txt", ".log", ".jsonl"]:
            mime_type = "text/plain"
        elif extension in [".py", ".ts", ".js"]:
            mime_type = "text/x-code"
        
        # Read content (with size limit for safety)
        max_size = 10 * 1024 * 1024  # 10MB
        if stat.st_size > max_size:
            raise HTTPException(status_code=413, detail="File too large (>10MB)")
        
        content = file_path.read_text(encoding='utf-8', errors='replace')
        
        return {
            "ok": True,
            "path": str(file_path.relative_to(workspace_path)),
            "name": file_path.name,
            "extension": extension,
            "mime_type": mime_type,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "content": content,
        }
    
    except UnicodeDecodeError:
        # Handle binary files
        return {
            "ok": False,
            "error": "Binary file cannot be displayed as text",
            "path": str(file_path.relative_to(workspace_path)),
            "name": file_path.name,
            "size": stat.st_size,
            "is_binary": True,
        }
    except Exception as e:
        log("error", f"Error reading file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### 3.1.3 Optional: Real-time Watch Endpoint (SSE)

**Note:** This is optional and can be added in Phase 2. For MVP, polling `/workspace/tree` every 2-3 seconds during active agent sessions is sufficient.

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import asyncio

# Global event queue for file system changes
fs_change_queue: asyncio.Queue = asyncio.Queue()

class WorkspaceChangeHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        asyncio.create_task(fs_change_queue.put({
            "type": event.event_type,
            "path": event.src_path,
            "is_directory": event.is_directory,
        }))

@app.on_event("startup")
async def start_workspace_watcher():
    workspace_path = Path(agent_options().cwd)
    observer = Observer()
    observer.schedule(WorkspaceChangeHandler(), str(workspace_path), recursive=True)
    observer.start()

@app.get("/workspace/watch")
async def workspace_watch() -> StreamingResponse:
    """Stream file system changes via Server-Sent Events."""
    async def event_generator():
        while True:
            try:
                change = await asyncio.wait_for(fs_change_queue.get(), timeout=30)
                yield f"data: {json.dumps(change)}\n\n"
            except asyncio.TimeoutError:
                # Send keepalive
                yield f": keepalive\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

**Dependencies to add:** `watchdog` for file system watching (optional)

---

### Phase 2: Frontend Components

**Priority: High | Effort: High | Risk: Medium**

#### 3.2.1 Workspace Context & State Management

**File:** `frontend/lib/workspace-context.tsx`

```typescript
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified: number
  extension?: string
  children?: FileNode[]
}

type WorkspaceContextType = {
  tree: FileNode[]
  isLoading: boolean
  error: string | null
  refreshTree: () => Promise<void>
  selectedFile: string | null
  setSelectedFile: (path: string | null) => void
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const refreshTree = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:5051/workspace/tree')
      const data = await response.json()
      
      if (data.ok) {
        setTree(data.tree || [])
      } else {
        setError('Failed to load workspace tree')
      }
    } catch (err) {
      setError(`Error: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    refreshTree()
  }, [])

  // Polling during active sessions (could be replaced with SSE)
  useEffect(() => {
    const interval = setInterval(refreshTree, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <WorkspaceContext.Provider
      value={{
        tree,
        isLoading,
        error,
        refreshTree,
        selectedFile,
        setSelectedFile,
        isExpanded,
        setIsExpanded,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
```

#### 3.2.2 File Tree Component

**File:** `frontend/components/workspace/FileTree.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useWorkspace } from '@/lib/workspace-context'

type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified: number
  extension?: string
  children?: FileNode[]
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFileIcon(node: FileNode): string {
  if (node.type === 'directory') return '📁'
  
  switch (node.extension) {
    case '.json': return '📊'
    case '.md': return '📝'
    case '.txt': return '📄'
    case '.log': return '📋'
    case '.jsonl': return '📜'
    case '.py': return '🐍'
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
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-100 rounded ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <span className="text-slate-400 text-xs">
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        <span className="text-sm">{getFileIcon(node)}</span>
        <span className="text-sm text-slate-700 flex-1 truncate">{node.name}</span>
        {node.size && (
          <span className="text-xs text-slate-400">{formatSize(node.size)}</span>
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
      <div className="p-4 text-sm text-red-600">
        <p>{error}</p>
        <button
          onClick={refreshTree}
          className="mt-2 text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading && tree.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500">
        Loading workspace...
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500">
        No files in workspace yet
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} />
      ))}
    </div>
  )
}
```

#### 3.2.3 File Viewer Component

**File:** `frontend/components/workspace/FileViewer.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useWorkspace } from '@/lib/workspace-context'

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

function JsonViewer({ content }: { content: string }) {
  try {
    const parsed = JSON.parse(content)
    return (
      <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded overflow-auto">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    )
  } catch {
    return <div className="text-red-600">Invalid JSON</div>
  }
}

function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none p-4">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

function TextViewer({ content }: { content: string }) {
  return (
    <pre className="text-xs font-mono bg-slate-50 p-4 rounded overflow-auto whitespace-pre-wrap">
      {content}
    </pre>
  )
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
          `http://localhost:5051/workspace/file?path=${encodeURIComponent(selectedFile)}`
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
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>Select a file to view</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!fileData || !fileData.ok) {
    return (
      <div className="p-4 text-red-600">
        {fileData?.error || fileData?.is_binary 
          ? 'Binary file cannot be displayed'
          : 'Error loading file'}
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
      <div className="flex items-center justify-between border-b border-slate-200 p-3 bg-white">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">
            {fileData.name}
          </h3>
          <p className="text-xs text-slate-500">
            {(fileData.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadFile}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download
          </button>
          <button
            onClick={() => setSelectedFile(null)}
            className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {fileData.extension === '.json' && <JsonViewer content={fileData.content} />}
        {fileData.extension === '.md' && <MarkdownViewer content={fileData.content} />}
        {!['.json', '.md'].includes(fileData.extension) && (
          <TextViewer content={fileData.content} />
        )}
      </div>
    </div>
  )
}
```

#### 3.2.4 Workspace Panel Component

**File:** `frontend/components/workspace/WorkspacePanel.tsx`

```typescript
'use client'

import { useWorkspace } from '@/lib/workspace-context'
import FileTree from './FileTree'
import FileViewer from './FileViewer'

export default function WorkspacePanel() {
  const { isExpanded, setIsExpanded, selectedFile } = useWorkspace()

  if (!isExpanded) {
    return (
      <div className="fixed right-0 top-24 z-10">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-slate-900 text-white px-3 py-2 rounded-l-lg shadow-lg hover:bg-slate-800"
        >
          <span className="text-sm">📁 Workspace</span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">Workspace</h2>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-slate-500 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      {/* Split view: Tree + Viewer */}
      {selectedFile ? (
        <FileViewer />
      ) : (
        <div className="flex-1 overflow-auto">
          <FileTree />
        </div>
      )}
    </div>
  )
}
```

#### 3.2.5 Update Main Layout

**File:** `frontend/app/layout.tsx`

```typescript
import { WorkspaceProvider } from '@/lib/workspace-context'
import WorkspacePanel from '@/components/workspace/WorkspacePanel'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          {children}
          <WorkspacePanel />
        </WorkspaceProvider>
      </body>
    </html>
  )
}
```

---

### Phase 3: Enhanced Integration

**Priority: Medium | Effort: Medium | Risk: Low**

#### 3.3.1 Click-to-Open from Tool Cards

Update existing tool cards to make file paths clickable:

**File:** `frontend/components/cards/GenericToolCard.tsx`

```typescript
import { useWorkspace } from '@/lib/workspace-context'

export default function GenericToolCard({ tool, payload }: Props) {
  const { setSelectedFile, setIsExpanded } = useWorkspace()
  
  const openFile = (path: string) => {
    // Extract relative path from absolute path
    const relativePath = path.split('/runtime/workspace/')[1]
    if (relativePath) {
      setSelectedFile(relativePath)
      setIsExpanded(true)
    }
  }
  
  // Render paths[] as clickable links
  if (payload.paths && Array.isArray(payload.paths)) {
    return (
      <div>
        <h4>Files created:</h4>
        {payload.paths.map((path: string) => (
          <button
            key={path}
            onClick={() => openFile(path)}
            className="text-blue-600 hover:underline text-sm"
          >
            {path.split('/').pop()}
          </button>
        ))}
      </div>
    )
  }
  
  // ... rest of component
}
```

#### 3.3.2 Stream File Events from Agent

Enhance the backend to emit file creation events:

**File:** `agent_service/app.py`

```python
async def _convert_message_to_events(message: Any) -> AsyncIterator[Dict[str, Any]]:
    # ... existing code ...
    
    # When tool result contains paths, emit file event
    if isinstance(message, UserMessage):
        for block in content:
            if isinstance(block, ToolResultBlock):
                result_data = parse_result(block)
                
                # Extract paths from tool results
                if isinstance(result_data, dict) and 'paths' in result_data:
                    yield {
                        "type": "data",
                        "event": "agent.files-created",
                        "paths": result_data['paths'],
                        "tool": "unknown",  # Try to track tool name
                    }
```

Then handle this event in the frontend to trigger workspace refresh:

```typescript
// In useChat hook
const { messages, data } = useChat({
  api: '/api/chat',
  onFinish: () => {
    // Refresh workspace tree after agent completes
    refreshTree()
  }
})

// Or listen to data stream for immediate updates
useEffect(() => {
  const fileEvents = data?.filter((d: any) => d.event === 'agent.files-created')
  if (fileEvents?.length > 0) {
    refreshTree()
  }
}, [data])
```

---

## 4. Technology Stack & Dependencies

### Backend (Python)
- **FastAPI** (existing) - REST API endpoints
- **Pathlib** (stdlib) - File system operations
- **Watchdog** (optional) - File system watching for real-time updates
  ```bash
  pip install watchdog
  ```

### Frontend (TypeScript/React)
- **Next.js 14** (existing) - React framework
- **React Context API** (stdlib) - State management for workspace
- **react-markdown** (existing) - Markdown rendering
- **Tailwind CSS** (existing) - Styling
- Optional enhancements:
  - `react-json-view` - Enhanced JSON viewer with collapsible nodes
  - `prismjs` or `highlight.js` - Syntax highlighting for code files
  - `react-virtualized` - Virtual scrolling for large file trees

```bash
cd frontend
npm install react-json-view prismjs
```

---

## 5. Testing Strategy

### Unit Tests
- Backend: Test file tree scanning, path security validation
- Frontend: Test FileTree component rendering, FileViewer rendering

### Integration Tests
- Test workspace API endpoints with mock file system
- Test file content endpoint with various file types
- Test security: ensure paths outside workspace are blocked

### E2E Tests
- User clicks file in tree → file viewer opens
- User closes workspace panel → panel collapses
- Agent creates file → workspace refreshes → file appears in tree
- User downloads file → file is saved locally

---

## 6. Security Considerations

### Path Traversal Prevention
- **Backend validation:** All file paths must resolve within workspace
- Use `Path.resolve()` and check `startswith(workspace_path)`
- Never allow `..` in paths

### File Size Limits
- Max 10MB per file for display
- Binary files: show metadata only, offer download

### CORS Configuration
- Already configured for `localhost:3000` in existing setup
- Ensure new endpoints respect same CORS rules

### Content Sanitization
- JSON: Parse and re-stringify to prevent injection
- Markdown: Use react-markdown with safe mode
- Text: Escape HTML entities if displaying in HTML context

---

## 7. Performance Optimization

### Backend
- Cache workspace tree for 1-2 seconds (reduce disk I/O)
- Lazy load file contents (only when requested)
- Set max directory depth (e.g., 10 levels) to prevent infinite recursion

### Frontend
- Virtual scrolling for trees with 100+ nodes
- Debounce workspace refresh during rapid file changes
- Lazy load file tree children (collapse by default beyond depth 2)
- Use `React.memo` for FileTreeNode components

### Network
- Compress large JSON responses with gzip
- Use HTTP/2 for parallel requests
- Consider WebSocket/SSE for real-time updates (Phase 3)

---

## 8. Future Enhancements (Post-MVP)

### Advanced Features
1. **Search workspace** - Full-text search across all files
2. **File history** - Show file modification timeline
3. **Diff viewer** - Compare file versions
4. **Edit in place** - Allow users to edit JSON/text files directly
5. **Export workspace** - Download entire workspace as ZIP
6. **Workspace snapshots** - Save/restore workspace state
7. **Multi-file viewer** - Open multiple files in tabs

### Monitoring & Analytics
- Track which files users view most
- Monitor workspace size growth
- Alert on large files (>50MB)

---

## 9. Implementation Timeline

### Week 1: Backend Foundation
- Day 1-2: Add `/workspace/tree` endpoint
- Day 3-4: Add `/workspace/file` endpoint with security
- Day 5: Testing & security hardening

### Week 2: Frontend Core
- Day 1-2: Build WorkspaceContext and FileTree component
- Day 3-4: Build FileViewer component
- Day 5: Build WorkspacePanel with collapse/expand

### Week 3: Integration & Polish
- Day 1-2: Integrate with existing chat UI
- Day 3: Add click-to-open from tool cards
- Day 4: Real-time refresh on agent activity
- Day 5: Testing, bug fixes, UX polish

---

## 10. Success Metrics

### User Experience
- **Time to insight:** 50% reduction in time to find analysis results
- **Engagement:** 80% of users interact with workspace viewer
- **File discovery:** Users view average of 3+ files per session

### Technical
- **Load time:** Workspace tree loads in <500ms
- **Refresh rate:** Updates visible within 3 seconds of file creation
- **Error rate:** <1% failed file loads
- **Performance:** No lag with 200+ files in workspace

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Large workspace causes UI lag | High | Medium | Implement virtual scrolling, lazy loading |
| Security vulnerability (path traversal) | Critical | Low | Strict path validation, security testing |
| Real-time updates miss files | Medium | Medium | Fallback to polling, add manual refresh button |
| Binary files crash viewer | Medium | Low | Detect binary files, show metadata only |
| Backend memory usage with watchdog | Medium | Low | Make file watching optional, use polling |

---

## 12. Comparison with Existing Solutions

### Claude Code / Cursor IDE
- **Similarity:** File tree browser, click-to-view files
- **Difference:** We're building a read-only web viewer, not a full IDE
- **Learning:** Focus on read-only viewing with great formatting

### VS Code Remote
- **Similarity:** Remote file system viewing
- **Difference:** Agent workspace is ephemeral, task-focused
- **Learning:** Emphasize file relationships (which tool created what)

### GitHub Web UI
- **Similarity:** Tree navigation, syntax highlighting
- **Difference:** No version control, real-time updates
- **Learning:** Simple, clean UI without Git complexity

---

## 13. Open Questions

1. **Should we allow users to delete files from workspace via UI?**
   - Recommendation: No for MVP (safety), consider for Phase 2 with confirmation dialog

2. **How long should we keep workspace files after session ends?**
   - Recommendation: Persist indefinitely, add manual cleanup tool

3. **Should file viewer be a modal or split pane?**
   - Recommendation: Split pane (better for comparing files side-by-side)

4. **Do we need real-time SSE updates or is polling sufficient?**
   - Recommendation: Start with polling (simpler), add SSE if performance issues

5. **Should we support inline editing of files?**
   - Recommendation: Not for MVP (adds complexity), consider later

---

## 14. Conclusion

This implementation plan provides a comprehensive, production-ready solution for adding a workspace viewer to the Claude Finance Agent frontend. The phased approach allows for incremental delivery while maintaining quality and security standards.

**Key Strengths:**
- ✅ Aligns with existing architecture (AI SDK streaming, FastAPI backend)
- ✅ Secure by design (path validation, size limits)
- ✅ Performant (lazy loading, caching, virtual scrolling)
- ✅ Extensible (clear path to advanced features)

**Next Steps:**
1. Review and approve this plan
2. Set up GitHub issues/tickets for each phase
3. Begin Phase 1 backend implementation
4. Schedule weekly progress reviews

**Estimated Total Effort:** 15-20 developer days (3 weeks at 1 developer)

---

## Appendix A: API Specifications

### GET /workspace/tree

**Response:**
```json
{
  "ok": true,
  "workspace": "/absolute/path/to/workspace",
  "timestamp": "2025-10-02T14:30:00",
  "tree": [
    {
      "name": "data",
      "path": "data",
      "type": "directory",
      "modified": 1696248000,
      "children": [
        {
          "name": "market",
          "path": "data/market",
          "type": "directory",
          "modified": 1696248000,
          "children": [...]
        }
      ]
    }
  ]
}
```

### GET /workspace/file?path={relative_path}

**Response (success):**
```json
{
  "ok": true,
  "path": "data/market/AAPL/profile.json",
  "name": "profile.json",
  "extension": ".json",
  "mime_type": "application/json",
  "size": 1024,
  "modified": 1696248000,
  "content": "{ ... }"
}
```

**Response (error):**
```json
{
  "ok": false,
  "error": "File not found",
  "path": "data/market/AAPL/missing.json"
}
```

---

## Appendix B: Component Hierarchy

```
App Layout (with WorkspaceProvider)
├── page.tsx (Chat Interface)
│   ├── Messages
│   ├── Tool Cards (with workspace links)
│   └── Input
└── WorkspacePanel
    ├── Header (collapse/expand button)
    ├── FileTree (when no file selected)
    │   └── TreeNode (recursive)
    │       ├── Directory icon + name
    │       └── File icon + name + size
    └── FileViewer (when file selected)
        ├── Header (name, size, download, close)
        └── Content
            ├── JsonViewer (for .json)
            ├── MarkdownViewer (for .md)
            └── TextViewer (for .txt, .log, etc.)
```

---

**Document Version:** 1.0  
**Last Updated:** October 2, 2025  
**Author:** AI Assistant  
**Status:** Ready for Review

