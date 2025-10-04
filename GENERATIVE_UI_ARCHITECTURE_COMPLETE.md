# Generative UI Architecture - Complete Documentation

## Overview

This document captures the complete architecture of the generative UI system built for the Claude Finance Agent. The system enables real-time streaming of tool executions from the Claude Agent SDK backend to a Next.js frontend with specialized, type-aware UI components.

**Created**: 2025-10-03
**Status**: Working but needs redesign
**Purpose**: Archive current implementation before rebuilding

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Event Flow](#event-flow)
5. [Component Catalog](#component-catalog)
6. [CLI Tools Integration](#cli-tools-integration)
7. [Data Flow Patterns](#data-flow-patterns)
8. [What Works Well](#what-works-well)
9. [What Needs Improvement](#what-needs-improvement)
10. [Key Files Reference](#key-files-reference)

---

## System Architecture

### High-Level Flow

```
User Query
    ↓
Next.js Frontend (page.tsx)
    ↓
API Route (/api/chat/route.ts)
    ↓
FastAPI Backend (agent_service/app.py)
    ↓
Claude Agent SDK (src/agent.py)
    ↓
CLI Tools (bin/mf-*)
    ↓
Data Providers (FMP, SEC, CapIQ)
    ↓
Stream Events Back
    ↓
Frontend Cards Render
```

### Key Design Decisions

1. **NDJSON Streaming**: Backend streams newline-delimited JSON events
2. **Tool Detection**: Parse CLI commands from Bash tool calls to identify tool types
3. **Metadata Extraction**: Extract JSON metadata from echo commands for context
4. **Dual Card Pattern**: Show tool call card (intent) + result card (data)
5. **Workspace Integration**: File paths become clickable to open in workspace viewer

---

## Backend Architecture

### 1. FastAPI Server (`agent_service/app.py`)

**Purpose**: Bridge between Claude Agent SDK and Next.js frontend

**Key Responsibilities**:
- Stream agent messages as NDJSON events
- Parse tool calls from Bash commands to identify CLI tools
- Extract metadata from echo commands (ticker, fields, etc.)
- Track tool lifecycle (start → result/error)
- Serve workspace file tree and file contents

**Event Types Emitted**:

```typescript
// Text responses
{ type: "data", event: "agent.text", text: string }

// Tool started
{ 
  type: "data", 
  event: "agent.tool-start",
  tool_id: string,
  tool: string,        // "Bash"
  cli_tool: string,    // "mf-market-get"
  metadata: object,    // { ticker, fields, etc. }
  args: object         // Raw bash command
}

// Tool completed
{
  type: "data",
  event: "agent.tool-result",
  tool_id: string,
  cli_tool: string,
  metadata: object,
  result: object       // Parsed JSON result
}

// Tool failed
{
  type: "data",
  event: "agent.tool-error",
  tool_id: string,
  cli_tool: string,
  error: string
}

// Agent done
{
  type: "data",
  event: "agent.completed",
  runtime_ms: number,
  summary: string
}
```

**Tool Detection Logic** (`app.py:209-232`):

```python
# Detect CLI tool from Bash command
cli_tools = [
    "mf-market-get", "mf-estimates-get", "mf-documents-get",
    "mf-filing-extract", "mf-qa", "mf-calc-simple",
    "mf-valuation-basic-dcf", "mf-report-save",
    "mf-extract-json", "mf-json-inspect", "mf-doc-diff",
]
for tool in cli_tools:
    if tool in command:
        cli_tool = tool
        break

# Extract JSON metadata from echo pattern
import re
match = re.search(r"echo\s+'(\{[^']+\})'", command)
if match:
    metadata = json.loads(match.group(1))
```

**Workspace Endpoints**:
- `GET /workspace/tree` - Return file tree structure
- `GET /workspace/file?path=...` - Read file contents
- `GET /logs/stream` - Stream server logs (SSE)

### 2. Agent Configuration (`agent_service/settings.py`)

**Purpose**: Configure Claude Agent SDK options

**Key Settings**:
- Model: `claude-3-5-haiku-20241022` (fast, cheap)
- Working directory: `runtime/workspace/`
- Allowed tools: Bash, Read, Write, List, Glob, Grep
- Permission mode: `bypassPermissions` (auto-approve)
- Max turns: 12

**System Prompt Integration**:
- Loads from `src/prompts/agent_system.py`
- Injects runtime paths (workspace, bin/)
- Contains comprehensive tool documentation

### 3. Agent System Prompt (`src/prompts/agent_system.py`)

**Size**: 530 lines
**Purpose**: Comprehensive guide for agent behavior

**Key Sections**:
1. Role & objectives
2. Operating environment (paths, tools)
3. Tool catalog (11 CLI tools, 38+ data types)
4. Decision rules (when to use what)
5. Canonical workflows
6. Cost optimization strategies
7. **Generative UI section** (lines 93-128)

**Critical Guidance**:
```markdown
## Generative UI - What Renders in the Browser

When you use these tools, beautiful compact cards automatically render:

mf-market-get → Three ultra-compact cards
mf-valuation-basic-dcf → Valuation card with scenarios
mf-calc-simple → Calculation card with trends

The UI handles ALL visualization automatically. You DON'T need to:
  ✗ Format JSON output for display
  ✗ Read files with `cat` after tools succeed
  ✗ Repeat information that's already in the cards

What you SHOULD do:
  ✓ Provide analysis and insights in natural text
  ✓ Let the cards handle the data visualization
```

---

## Frontend Architecture

### 1. API Route (`frontend/app/api/chat/route.ts`)

**Purpose**: Transform backend NDJSON stream to AI SDK format

**Key Logic**:

```typescript
// Parse NDJSON from backend
const lines = buffer.split('\n')
for (const line of lines) {
  const event = JSON.parse(line)
  
  // Text content → stream as text chunks
  if (event.event === 'agent.text') {
    controller.enqueue(`0:${JSON.stringify(event.text)}\n`)
  }
  
  // Tool events → stream as data annotations
  if (event.event === 'agent.tool-start') {
    controller.enqueue(`2:[${JSON.stringify(event)}]\n`)
  }
}
```

**AI SDK Format**:
- `0:` prefix = text chunk
- `2:` prefix = data annotation (for tool events)

**Tool Tracking**:
- Maintains `toolCallMap` to match results with starts
- Enriches result events with original tool info

### 2. Main Page (`frontend/app/page.tsx`)

**Purpose**: Chat interface with real-time tool visualization

**Key State**:

```typescript
const { messages, input, append, isLoading, data } = useChat({
  api: '/api/chat'
})

// Derived state
const [toolStates, setToolStates] = useState<Record<string, any>>({})
const [toolChain, setToolChain] = useState<any[]>([])
const [sessionHistory, setSessionHistory] = useState<any[]>([])
const [agentThinking, setAgentThinking] = useState<any>(null)
```

**Tool State Management** (lines 63-157):

```typescript
useEffect(() => {
  const states: Record<string, any> = {}
  
  data?.forEach((item: any) => {
    if (item.event === 'agent.tool-start') {
      const toolKey = `${item.cli_tool}_${item.metadata?.ticker || 'unknown'}`
      states[item.tool_id] = {
        toolId: item.tool_id,
        cli_tool: item.cli_tool,
        metadata: item.metadata,
        isLoading: true,
        status: 'active',
        toolKey: toolKey
      }
    }
    else if (item.event === 'agent.tool-result') {
      states[item.tool_id] = {
        ...states[item.tool_id],
        result: item.result,
        isLoading: false,
        status: 'complete'
      }
    }
  })
  
  setToolStates(states)
}, [data])
```

**Card Routing** (lines 159-276):

```typescript
const renderToolCard = (toolState: any) => {
  const { cli_tool, result, isLoading } = toolState
  
  // Always show tool call card first
  const toolCallCard = <ToolCallCard {...toolState} />
  
  // If still loading, only show call card
  if (isLoading && !result) {
    return toolCallCard
  }
  
  // Route to specialized card based on CLI tool
  switch (cli_tool) {
    case 'mf-market-get':
      return <><toolCallCard /><MarketDataCards {...toolState} /></>
    case 'mf-valuation-basic-dcf':
      return <><toolCallCard /><ValuationCard {...toolState} /></>
    case 'mf-calc-simple':
      return <><toolCallCard /><CalculationCard {...toolState} /></>
    // ... etc
  }
}
```

### 3. Workspace Integration

**Context Provider** (`frontend/lib/workspace-context.tsx`):

```typescript
const WorkspaceContext = {
  tree: FileNode[],              // File tree
  isExpanded: boolean,           // Panel state
  selectedFile: string | null,   // Current file
  readFile: (path) => Promise<string>,  // Fetch file
  refreshTree: () => Promise<void>
}
```

**Features**:
- Auto-refresh tree every 5 seconds when expanded
- Lazy load tree only when panel opened
- Security: validate paths stay within workspace
- Clickable file paths throughout UI

**WorkspacePanel** (`frontend/components/workspace/WorkspacePanel.tsx`):
- Resizable panel (300-800px)
- Click edge to collapse, drag to resize
- Split view: tree browser or file viewer
- Support for JSON, markdown, text, code files

---

## Event Flow

### Complete Tool Execution Flow

```
1. User sends message
   └→ Frontend: append({ role: 'user', content })

2. Frontend calls /api/chat
   └→ API route fetches http://localhost:5052/query
   
3. Backend receives prompt
   └→ Calls claude_query(prompt, options)
   
4. Agent decides to use tool
   └→ AssistantMessage with ToolUseBlock
   └→ Backend emits: agent.tool-start
      {
        tool_id: "toolu_123",
        tool: "Bash",
        cli_tool: "mf-market-get",
        metadata: { ticker: "AAPL", fields: ["quote"] }
      }

5. API route receives tool-start
   └→ Tracks in toolCallMap
   └→ Forwards to frontend as data annotation
   
6. Frontend useEffect processes tool-start
   └→ Creates toolState entry
      {
        toolId: "toolu_123",
        cli_tool: "mf-market-get",
        metadata: { ticker: "AAPL" },
        isLoading: true,
        status: 'active'
      }

7. Frontend renders ToolCallCard
   └→ Shows: "📊 Market Data | Ticker: AAPL | ●"
   └→ Card is colored based on tool type
   
8. Tool executes (Bash runs CLI command)
   └→ CLI tool calls data provider
   └→ Saves files to workspace
   └→ Returns JSON: { ok: true, result: {...}, paths: [...] }

9. Agent receives tool result
   └→ UserMessage with ToolResultBlock
   └→ Backend emits: agent.tool-result
      {
        tool_id: "toolu_123",
        cli_tool: "mf-market-get",
        result: { ok: true, result: {...}, paths: [...] }
      }

10. API route enriches result
    └→ Looks up toolCallMap["toolu_123"]
    └→ Adds metadata from tool-start
    └→ Forwards enriched event to frontend

11. Frontend useEffect updates toolState
    └→ Sets result, isLoading: false, status: 'complete'

12. Frontend re-renders with result card
    └→ renderToolCard sees result is ready
    └→ Routes to MarketDataCards component
    └→ Shows both ToolCallCard + MarketDataCards

13. MarketDataCards loads actual data
    └→ Uses readFile() to fetch JSON from workspace
    └→ Parses and renders specialized cards
    └→ Shows: Summary + Profile + Quote cards

14. Agent provides final analysis
    └→ Backend emits: agent.text
    └→ Frontend shows as message.content
    └→ File paths in text become clickable buttons

15. User clicks file path
    └→ Opens workspace panel
    └→ Shows file contents in viewer
```

---

## Component Catalog

### Core Components

#### 1. ToolCallCard (`components/cards/ToolCallCard.tsx`)

**Purpose**: Show tool invocation intent while executing

**Props**:
```typescript
{
  toolName: string,      // "Bash"
  cliTool?: string,      // "mf-market-get"
  args?: object,         // Raw command
  metadata?: object,     // { ticker, fields, etc. }
  isExecuting?: boolean  // Animated dot
}
```

**Design**:
- Compact inline card (~40px height)
- Color-coded by tool type (blue/green/purple/etc.)
- Shows icon + name + key params
- Animated pulse when executing

**Tool Mapping**:
```typescript
const TOOL_INFO = {
  'mf-market-get': { name: 'Market Data', icon: '📊', color: 'blue' },
  'mf-valuation-basic-dcf': { name: 'DCF Valuation', icon: '💰', color: 'green' },
  'mf-calc-simple': { name: 'Calculation', icon: '🧮', color: 'purple' },
  // ... etc
}
```

#### 2. MarketDataCards (`components/cards/MarketDataCards.tsx`)

**Purpose**: Display multi-field market data results

**Strategy**: 
- Load actual JSON files from workspace using `readFile()`
- Parse data and render specialized sub-cards
- Ultra-compact design (3 cards in ~120px total)

**Sub-Components**:
- `CompactSummaryCard` - Tool execution summary (ticker, count, time, size)
- `CompactProfileCard` - Company info (if profile fetched)
- `CompactQuoteCard` - Current price (if quote fetched)
- `CompactDataCard` - Generic metric display

**Data Loading Pattern**:
```typescript
useEffect(() => {
  if (!result?.ok || !result.result) return
  
  const loadData = async () => {
    for (const [field, filePath] of Object.entries(result.result)) {
      const content = await readFile(filePath)
      const parsed = JSON.parse(content)
      data[field] = Array.isArray(parsed) ? parsed[0] : parsed
    }
    setLoadedData(data)
  }
  
  loadData()
}, [result])
```

#### 3. ValuationCard (`components/cards/ValuationCard.tsx`)

**Purpose**: Display DCF valuation scenarios

**Features**:
- Scenario selector (Bear/Base/Bull tabs)
- Fair value vs. current price comparison
- Upside/downside percentage with color coding
- Waterfall chart for valuation breakdown
- InsightBubble for warnings/observations

**Data Structure**:
```typescript
result: {
  scenarios: {
    base: { per_share: number, npv: number },
    bull: { per_share: number, npv: number },
    bear: { per_share: number, npv: number }
  },
  valuation: {
    dcf_value: number,
    current_price: number,
    upside_pct: number
  }
}
```

#### 4. CalculationCard (`components/cards/CalculationCard.tsx`)

**Purpose**: Display calculation results with trends

**Features**:
- Growth metrics over time
- Sparklines for visual trends
- Badge indicators (up/down/neutral)
- Supports multiple calculation types (delta, growth, etc.)

**Use Cases**:
- YoY/QoQ growth rates
- Revenue/income/EBIT trends
- Percentage changes

#### 5. QACard (`components/cards/QACard.tsx`)

**Purpose**: Display document Q&A results

**Features**:
- Model badge (Haiku/Sonnet)
- Structured output support (JSON with output_schema)
- Unstructured output support (text/markdown)
- Collapsible full content
- Token usage metrics
- Cost display

**Two Display Modes**:
1. **Structured**: Key-value pairs preview, expandable JSON
2. **Unstructured**: Truncated text preview, "Show more" button

#### 6. EstimatesCard (`components/cards/EstimatesCard.tsx`)

**Purpose**: Display analyst estimates from CapIQ

**Features**:
- Metric icon and name (revenue, EPS, EBITDA, etc.)
- Horizon display (5Y forward, etc.)
- Source badge (CapIQ)
- Placeholder for future visualizations

#### 7. FilingExtractCard (`components/cards/FilingExtractCard.tsx`)

**Purpose**: Display SEC filing extraction results

**Features** (assumed, file not read but referenced):
- Section display
- Keyword search results
- Regex match results
- File path references

#### 8. GenericToolCard (`components/cards/GenericToolCard.tsx`)

**Purpose**: Fallback for unknown tool results

**Features**:
- Collapsible header
- Ok/error badge
- Metrics display (time, size)
- Clickable file paths
- Raw JSON viewer (expandable)

**File Path Handling**:
```typescript
const openFile = (path: string) => {
  const workspacePart = path.split('/runtime/workspace/')[1]
  if (workspacePart) {
    setSelectedFile(workspacePart)
    setIsExpanded(true)
  }
}
```

### Supporting Components

#### Agent Components

**AgentThinkingBubble** (`components/agent/AgentThinkingBubble.tsx`):
- Animated dots
- Optional plan steps
- Shows before tools execute

**InsightBubble** (`components/agent/InsightBubble.tsx`):
- Color-coded types: observation, warning, action, success
- Icon + message
- Optional dismissible

**ToolChainFlow** (`components/agent/ToolChainFlow.tsx`):
- Pipeline visualization (disabled in current UI)
- Shows tool sequence
- Status indicators per tool

**SessionTimeline** (`components/agent/SessionTimeline.tsx`):
- Historical tool executions
- Rerun functionality
- Time + status display

**ClickablePaths** (`components/agent/ClickablePaths.tsx`):
- Detects file paths in text
- Makes them clickable buttons
- Opens in workspace viewer

#### UI Primitives

**Badge** (`components/ui/Badge.tsx`):
- Variants: default, success, warning, error
- Small colored pills

**Tooltip** (`components/ui/Tooltip.tsx`):
- Hover information
- Wraps any element

**ProgressIndicator** (`components/ui/ProgressIndicator.tsx`):
- Loading states
- Progress bars

**Tabs** (`components/ui/Tabs.tsx`):
- Tab navigation
- Content switching

#### Chart Components

**Sparkline** (`components/charts/Sparkline.tsx`):
- Mini line charts
- Trend visualization
- Color-coded (up/down)

**MiniLineChart** (`components/charts/MiniLineChart.tsx`):
- Compact line charts
- Axis labels

**Gauge** (`components/charts/Gauge.tsx`):
- Circular progress
- Value display

**Waterfall** (`components/charts/Waterfall.tsx`):
- Stacked bar visualization
- Positive/negative/total items

---

## CLI Tools Integration

### Tool Inventory

Located in `bin/`:

1. **mf-market-get** - FMP market data (38 data types)
2. **mf-estimates-get** - CapIQ analyst estimates
3. **mf-documents-get** - SEC filings
4. **mf-filing-extract** - Extract sections/search filings
5. **mf-qa** - LLM-powered document Q&A
6. **mf-calc-simple** - Deterministic calculations
7. **mf-valuation-basic-dcf** - DCF valuation
8. **mf-doc-diff** - Document comparison
9. **mf-extract-json** - JSON path extraction
10. **mf-json-inspect** - JSON schema preview
11. **mf-report-save** - Save final reports

### Tool Contract

**All tools follow same pattern**:

Input (stdin):
```json
{
  "ticker": "AAPL",
  "fields": ["quote", "profile"],
  "format": "concise"
}
```

Output (stdout, one line):
```json
{
  "ok": true,
  "result": {
    "quote": "/absolute/path/to/quote.json",
    "profile": "/absolute/path/to/profile.json"
  },
  "paths": ["/path1", "/path2"],
  "provenance": [{"source": "FMP", "timestamp": "..."}],
  "metrics": {
    "bytes": 12345,
    "t_ms": 1234,
    "fields_fetched": 2
  },
  "format": "concise"
}
```

### Agent Usage Pattern

**Agent is instructed to**:

1. **Use single quotes for JSON** (avoid escaping):
   ```bash
   echo '{"ticker":"AAPL","fields":["quote"]}' | /path/to/mf-market-get
   ```

2. **Never read result files** (UI loads them):
   ```bash
   # WRONG:
   echo '{"ticker":"AAPL"}' | mf-market-get
   cat /path/to/quote.json  # ← Don't do this!
   
   # RIGHT:
   echo '{"ticker":"AAPL"}' | mf-market-get
   # Provide analysis - cards show the data
   ```

3. **Reference file paths in responses** (become clickable):
   ```
   Fetched Apple quote data. See data/market/AAPL/quote.json 
   for details. Current price is $246.43.
   ```

### Data Providers

**Connected via CLI tools**:

- **FMP** (Financial Modeling Prep): 38 data types, real-time market data
- **SEC EDGAR**: Filing documents (10-K, 10-Q, 8-K)
- **S&P CapIQ**: Consensus analyst estimates

**Workspace Structure**:
```
runtime/workspace/
├── data/
│   ├── market/
│   │   └── AAPL/
│   │       ├── quote.json
│   │       ├── profile.json
│   │       └── fundamentals_quarterly.json
│   └── sec/
│       └── AAPL/
│           └── 2024-09-28/
│               └── 10-K/
│                   ├── clean.txt
│                   └── sections/
│                       └── risk_factors.txt
├── analysis/
│   ├── calculations/
│   ├── diffs/
│   └── tables/
└── reports/
    ├── analysis/
    └── valuation/
```

---

## Data Flow Patterns

### Pattern 1: Market Data Fetch

```
1. User: "Get Apple stock data"

2. Agent decides to use mf-market-get
   Command: echo '{"ticker":"AAPL","fields":["quote","profile"]}' | mf-market-get

3. Backend emits tool-start
   { cli_tool: "mf-market-get", metadata: { ticker: "AAPL", fields: [...] } }

4. Frontend shows ToolCallCard
   "📊 Market Data | Ticker: AAPL | ●"

5. CLI executes
   - Calls FMP API
   - Saves quote.json and profile.json to workspace
   - Returns: { ok: true, result: { quote: "/path/...", profile: "/path/..." } }

6. Backend emits tool-result
   { cli_tool: "mf-market-get", result: { ok: true, ... } }

7. Frontend updates toolState
   isLoading: false, result: {...}

8. Frontend renders MarketDataCards
   - Fetches /workspace/file?path=data/market/AAPL/quote.json
   - Fetches /workspace/file?path=data/market/AAPL/profile.json
   - Renders CompactSummaryCard + CompactProfileCard + CompactQuoteCard

9. Agent provides text analysis
   "Apple is trading at $246.43, up 0.36% today. See data/market/AAPL/quote.json"

10. User clicks "data/market/AAPL/quote.json"
    - Opens workspace panel
    - Shows JSON in viewer
```

### Pattern 2: Document Q&A

```
1. User: "What are Apple's main risk factors?"

2. Agent workflow:
   a. Fetch filing: mf-documents-get
   b. Extract section: mf-filing-extract mode=extract_sections
   c. Analyze with QA: mf-qa

3. For step (c), Backend emits tool-start
   { cli_tool: "mf-qa", metadata: { instruction: "...", model: "haiku" } }

4. Frontend shows ToolCallCard
   "💬 Q&A | Question: What are Apple's... | ●"

5. CLI executes
   - Reads section file
   - Calls Claude API with instruction
   - Returns structured or unstructured answer
   - Saves result to workspace

6. Backend emits tool-result
   { cli_tool: "mf-qa", result: { ok: true, result: {...}, metrics: {...} } }

7. Frontend renders QACard
   - Shows model badge (Haiku)
   - Displays answer (structured or text)
   - Shows token usage + cost
   - File paths clickable

8. Agent summarizes
   "Top 3 risks: 1) Supply chain... 2) Competition... 3) Regulation..."
```

### Pattern 3: Valuation Analysis

```
1. User: "Value Apple using DCF"

2. Agent workflow:
   a. Fetch fundamentals: mf-market-get fields=["fundamentals","key_metrics"]
   b. Extract FCF values: mf-extract-json
   c. Run DCF: mf-valuation-basic-dcf

3. For step (c), Backend emits tool-start
   { cli_tool: "mf-valuation-basic-dcf", metadata: { ticker: "AAPL" } }

4. Frontend shows ToolCallCard
   "💰 DCF Valuation | Ticker: AAPL | ●"

5. CLI executes
   - Calculates 3 scenarios (bear/base/bull)
   - Computes NPV, per-share values
   - Returns: { scenarios: {...}, valuation: {...} }

6. Backend emits tool-result

7. Frontend renders ValuationCard
   - Scenario tabs (Bear/Base/Bull)
   - Fair value display
   - Current price comparison
   - Upside % calculation
   - Waterfall chart
   - Insight bubble if large deviation

8. Agent interprets
   "Fair value is $280 (base case), suggesting 14% upside from current $246"
```

---

## What Works Well

### ✅ Strengths

1. **Real-time Streaming**
   - Tool events stream as they happen
   - No blocking or waiting for complete responses
   - Users see progress immediately

2. **Tool Detection Logic**
   - Successfully parses CLI tool names from Bash commands
   - Extracts JSON metadata from echo patterns
   - Routes to correct card components

3. **Dual Card Pattern**
   - ToolCallCard shows intent/loading state
   - Result card shows actual data
   - Clear separation of concerns

4. **Workspace Integration**
   - File paths become clickable throughout UI
   - Live file browser with auto-refresh
   - Secure path validation

5. **Specialized Cards**
   - Type-aware visualization
   - MarketDataCards intelligently loads multiple files
   - ValuationCard has scenario switching
   - QACard supports structured + unstructured output

6. **CLI Tool Architecture**
   - Universal JSON contract
   - All tools return same structure
   - Metrics and provenance tracking
   - Cost visibility

7. **Agent System Prompt**
   - Comprehensive tool documentation
   - Clear guidance on generative UI
   - Prevents wasteful patterns (no cat after tools)
   - Cost optimization strategies

8. **Compact Design**
   - Cards are information-dense
   - MarketDataCards: 3 cards in ~120px
   - Minimal scrolling needed

---

## What Needs Improvement

### ❌ Pain Points

1. **Component Organization**
   - 20+ card components, hard to navigate
   - No clear component hierarchy
   - Duplicate patterns (CompactXCard vs XCard)
   - No component library structure

2. **State Management**
   - toolStates dict is complex
   - toolKey logic is fragile
   - No centralized state management
   - Hard to debug state updates

3. **Data Loading**
   - Each card component loads its own data
   - No caching or deduplication
   - Multiple fetch calls for same files
   - No error handling for failed fetches

4. **Type Safety**
   - Weak TypeScript types
   - `any` used extensively
   - No shared type definitions
   - Props not fully typed

5. **Card Discovery**
   - Hard-coded switch statement in page.tsx
   - No registry pattern
   - Adding new tools requires multiple file edits
   - No plugin architecture

6. **Tool Progress**
   - No intermediate progress updates
   - Can't show "Fetching from FMP..." → "Parsing data..." → "Saving files..."
   - ToolChainFlow disabled because not useful
   - No way to show parallel tool execution

7. **Error States**
   - Generic error handling
   - No retry logic
   - Errors not always visible
   - No error recovery UX

8. **Testing**
   - No component tests
   - No integration tests
   - Hard to test event streaming
   - Manual testing only

9. **Performance**
   - Large useEffect deps can cause re-renders
   - No memoization
   - readFile calls not debounced
   - No virtual scrolling for long lists

10. **Accessibility**
    - No ARIA labels
    - Keyboard navigation incomplete
    - Screen reader support missing
    - Color contrast not verified

11. **Documentation**
    - Component props not documented
    - No Storybook or component showcase
    - Event formats not typed
    - Integration patterns unclear

12. **Metadata Extraction**
    - Regex-based parsing is brittle
    - Depends on specific echo format
    - Fails if agent changes command structure
    - No fallback if parsing fails

---

## Key Files Reference

### Backend

| File | LOC | Purpose |
|------|-----|---------|
| `agent_service/app.py` | 486 | FastAPI server, event streaming |
| `agent_service/settings.py` | 56 | Agent SDK configuration |
| `agent_service/hooks.py` | ? | Agent lifecycle hooks |
| `src/agent.py` | 264 | CLI agent runner |
| `src/prompts/agent_system.py` | 530 | System prompt (comprehensive) |

### Frontend - Core

| File | LOC | Purpose |
|------|-----|---------|
| `frontend/app/page.tsx` | 465 | Main chat interface |
| `frontend/app/api/chat/route.ts` | 161 | API route, stream transformer |
| `frontend/lib/workspace-context.tsx` | 122 | Workspace state management |

### Frontend - Cards (20 components)

| Component | LOC | Purpose |
|-----------|-----|---------|
| `ToolCallCard.tsx` | 84 | Tool invocation display |
| `GenericToolCard.tsx` | 103 | Fallback for unknown tools |
| `MarketDataCards.tsx` | 130 | Multi-field market data |
| `ValuationCard.tsx` | 204 | DCF valuation scenarios |
| `CalculationCard.tsx` | 176 | Calculation results + trends |
| `QACard.tsx` | 222 | Document Q&A results |
| `EstimatesCard.tsx` | 200 | Analyst estimates |
| `FilingExtractCard.tsx` | ? | Filing extraction results |
| `CompactSummaryCard.tsx` | 42 | Tool execution summary |
| `CompactProfileCard.tsx` | ? | Company profile |
| `CompactQuoteCard.tsx` | ? | Stock quote |
| `CompactDataCard.tsx` | ? | Generic metric |
| `ProfileCard.tsx` | ? | Full profile display |
| `QuoteCard.tsx` | ? | Full quote display |
| `SummaryCard.tsx` | ? | Full summary |
| `FundamentalsCard.tsx` | ? | Fundamentals display |
| `MetricsCard.tsx` | ? | Metrics display |
| `PriceHistoryCard.tsx` | ? | Price history |
| `ReportCard.tsx` | ? | Report display |
| `LogsCard.tsx` | ? | Log display |

### Frontend - Agent Components

| Component | LOC | Purpose |
|-----------|-----|---------|
| `AgentThinkingBubble.tsx` | 50 | Thinking indicator |
| `InsightBubble.tsx` | 74 | Contextual insights |
| `ToolChainFlow.tsx` | 148 | Tool pipeline (disabled) |
| `SessionTimeline.tsx` | ? | Historical tool runs |
| `ClickablePaths.tsx` | ? | Make paths clickable |

### Frontend - UI Primitives

| Component | LOC | Purpose |
|-----------|-----|---------|
| `Badge.tsx` | 18 | Status badges |
| `Tooltip.tsx` | ? | Hover tooltips |
| `ProgressIndicator.tsx` | ? | Loading states |
| `Tabs.tsx` | ? | Tab navigation |

### Frontend - Charts

| Component | LOC | Purpose |
|-----------|-----|---------|
| `Sparkline.tsx` | 90 | Mini line charts |
| `MiniLineChart.tsx` | ? | Compact line charts |
| `Gauge.tsx` | ? | Circular progress |
| `Waterfall.tsx` | ? | Waterfall charts |

### Frontend - Workspace

| Component | LOC | Purpose |
|-----------|-----|---------|
| `WorkspacePanel.tsx` | 160 | Resizable file browser |
| `FileTree.tsx` | ? | Tree view |
| `FileViewer.tsx` | ? | File content viewer |

### CLI Tools (11 tools)

| Tool | Purpose |
|------|---------|
| `mf-market-get` | FMP market data (38 types) |
| `mf-estimates-get` | CapIQ estimates |
| `mf-documents-get` | SEC filings |
| `mf-filing-extract` | Extract/search filings |
| `mf-qa` | LLM document Q&A |
| `mf-calc-simple` | Calculations |
| `mf-valuation-basic-dcf` | DCF valuation |
| `mf-doc-diff` | Document comparison |
| `mf-extract-json` | JSON extraction |
| `mf-json-inspect` | JSON schema preview |
| `mf-report-save` | Save reports |

---

## Recommendations for Rebuild

### Priority 1: Component Architecture

1. **Component Library Structure**
   ```
   components/
   ├── cards/
   │   ├── base/
   │   │   ├── Card.tsx          # Base card component
   │   │   ├── CardHeader.tsx
   │   │   ├── CardContent.tsx
   │   │   └── CardFooter.tsx
   │   ├── tool-call/
   │   │   └── ToolCallCard.tsx
   │   └── results/
   │       ├── MarketDataCard/
   │       │   ├── index.tsx
   │       │   ├── Summary.tsx
   │       │   ├── Profile.tsx
   │       │   └── Quote.tsx
   │       ├── ValuationCard/
   │       └── QACard/
   ├── agent/
   │   ├── ThinkingIndicator.tsx
   │   ├── InsightBubble.tsx
   │   └── ToolProgress.tsx
   └── ui/
       ├── Badge.tsx
       ├── Spinner.tsx
       └── index.ts
   ```

2. **Card Registry Pattern**
   ```typescript
   // cards/registry.ts
   export const CARD_REGISTRY: Record<string, ComponentType<ToolCardProps>> = {
     'mf-market-get': MarketDataCard,
     'mf-valuation-basic-dcf': ValuationCard,
     'mf-qa': QACard,
     // ...
   }
   
   // In page.tsx
   const CardComponent = CARD_REGISTRY[cli_tool] || GenericCard
   return <CardComponent {...toolState} />
   ```

3. **Shared Type Definitions**
   ```typescript
   // types/events.ts
   export type ToolStartEvent = {
     type: 'data'
     event: 'agent.tool-start'
     tool_id: string
     tool: string
     cli_tool: string
     metadata: Record<string, unknown>
     args: Record<string, unknown>
   }
   
   export type ToolResultEvent = {
     type: 'data'
     event: 'agent.tool-result'
     tool_id: string
     cli_tool: string
     result: ToolResult
   }
   
   export type ToolResult = {
     ok: boolean
     result?: unknown
     paths?: string[]
     metrics?: Metrics
     error?: string
   }
   ```

### Priority 2: State Management

1. **Centralized Tool State**
   ```typescript
   // hooks/useToolState.ts
   export function useToolState() {
     const [tools, dispatch] = useReducer(toolReducer, {})
     
     // Subscribe to data stream
     useEffect(() => {
       data?.forEach(event => {
         if (event.event === 'agent.tool-start') {
           dispatch({ type: 'TOOL_START', payload: event })
         }
         else if (event.event === 'agent.tool-result') {
           dispatch({ type: 'TOOL_RESULT', payload: event })
         }
       })
     }, [data])
     
     return { tools, dispatch }
   }
   ```

2. **Tool State Machine**
   ```typescript
   type ToolState = 
     | { status: 'idle' }
     | { status: 'starting', metadata: object }
     | { status: 'executing', progress?: number }
     | { status: 'loading_data', files: string[] }
     | { status: 'complete', result: object, data: object }
     | { status: 'error', error: string }
   ```

### Priority 3: Data Loading

1. **Workspace Data Hook**
   ```typescript
   // hooks/useWorkspaceData.ts
   export function useWorkspaceData(paths: string[]) {
     const { readFile } = useWorkspace()
     const [data, setData] = useState<Record<string, unknown>>({})
     const [loading, setLoading] = useState(true)
     const [error, setError] = useState<Error | null>(null)
     
     useEffect(() => {
       loadData()
     }, [paths])
     
     return { data, loading, error, refetch }
   }
   ```

2. **Caching Layer**
   ```typescript
   // lib/workspace-cache.ts
   const fileCache = new Map<string, { data: string, timestamp: number }>()
   
   export async function readFileCached(path: string, maxAge = 60000) {
     const cached = fileCache.get(path)
     if (cached && Date.now() - cached.timestamp < maxAge) {
       return cached.data
     }
     
     const data = await fetchFile(path)
     fileCache.set(path, { data, timestamp: Date.now() })
     return data
   }
   ```

### Priority 4: Progressive Enhancement

1. **Tool Progress Updates**
   - Backend emits intermediate events:
     ```json
     {
       "event": "agent.tool-progress",
       "tool_id": "...",
       "stage": "fetching_data",
       "message": "Calling FMP API...",
       "progress": 0.33
     }
     ```

2. **Streaming Data Updates**
   - For large datasets, stream rows as they're processed
   - Show partial results immediately
   - Update card as more data arrives

3. **Parallel Tool Execution**
   - Show multiple tools executing simultaneously
   - Visual indicator when tools run in parallel
   - Aggregate completion status

### Priority 5: Developer Experience

1. **Component Storybook**
   - Isolate and test each card
   - Document props and variants
   - Visual regression testing

2. **Event Simulator**
   - Mock event stream for testing
   - Replay recorded sessions
   - Test edge cases

3. **Type Generation**
   - Generate TypeScript types from backend events
   - Ensure frontend/backend contract
   - Catch breaking changes

---

## Appendix: Event Stream Examples

### Example 1: Market Data Tool

```json
// Tool start
{
  "type": "data",
  "event": "agent.tool-start",
  "tool_id": "toolu_abc123",
  "tool": "Bash",
  "cli_tool": "mf-market-get",
  "metadata": {
    "ticker": "AAPL",
    "fields": ["quote", "profile"],
    "format": "concise"
  },
  "args": {
    "command": "echo '{\"ticker\":\"AAPL\",\"fields\":[\"quote\",\"profile\"]}' | /path/to/mf-market-get"
  }
}

// Tool result
{
  "type": "data",
  "event": "agent.tool-result",
  "tool_id": "toolu_abc123",
  "cli_tool": "mf-market-get",
  "result": {
    "ok": true,
    "result": {
      "quote": "/workspace/data/market/AAPL/quote.json",
      "profile": "/workspace/data/market/AAPL/profile.json"
    },
    "paths": [
      "/workspace/data/market/AAPL/quote.json",
      "/workspace/data/market/AAPL/profile.json",
      "/workspace/data/market/AAPL/_metadata.json"
    ],
    "provenance": [
      {
        "source": "FMP",
        "endpoint": "quote",
        "timestamp": "2025-10-03T10:30:15Z"
      }
    ],
    "metrics": {
      "bytes": 4837,
      "t_ms": 1234,
      "fields_fetched": 2
    },
    "format": "concise"
  }
}

// Agent text
{
  "type": "data",
  "event": "agent.text",
  "text": "Apple Inc. (AAPL) is currently trading at $246.43, up $0.89 (+0.36%) today. The company has a market cap of $3.8T. See data/market/AAPL/quote.json for detailed quote data."
}
```

### Example 2: Document Q&A Tool

```json
// Tool start
{
  "type": "data",
  "event": "agent.tool-start",
  "tool_id": "toolu_def456",
  "tool": "Bash",
  "cli_tool": "mf-qa",
  "metadata": {
    "instruction": "Extract the top 3 material risk factors and their potential impact",
    "model": "claude-3-5-haiku-latest",
    "document_paths": ["/workspace/data/sec/AAPL/2024-09-28/10-K/sections/risk_factors.txt"],
    "output_schema": {
      "risks": [
        {
          "name": "string",
          "impact": "string",
          "severity": "high|medium|low"
        }
      ]
    }
  },
  "args": {
    "command": "echo '{...}' | /path/to/mf-qa"
  }
}

// Tool result
{
  "type": "data",
  "event": "agent.tool-result",
  "tool_id": "toolu_def456",
  "cli_tool": "mf-qa",
  "result": {
    "ok": true,
    "result": {
      "risks": [
        {
          "name": "Supply Chain Disruptions",
          "impact": "Could materially affect product availability and manufacturing costs",
          "severity": "high"
        },
        {
          "name": "Competitive Pressure",
          "impact": "May reduce market share and pricing power",
          "severity": "high"
        },
        {
          "name": "Regulatory Changes",
          "impact": "Could increase compliance costs and limit business practices",
          "severity": "medium"
        }
      ]
    },
    "paths": [
      "/workspace/analysis/qa/risk_analysis_20251003_103045.json"
    ],
    "metrics": {
      "chunks": 3,
      "t_ms": 4567,
      "bytes": 28450,
      "input_tokens": 7832,
      "output_tokens": 234,
      "cost_usd": 0.0234
    }
  }
}
```

---

## Conclusion

This documentation captures the complete architecture of the generative UI system as of October 3, 2025. The system successfully demonstrates:

✅ Real-time streaming of tool executions
✅ Type-aware, specialized UI components
✅ Workspace integration with clickable file paths
✅ Cost-optimized CLI tool architecture
✅ Comprehensive agent system prompt

However, it needs improvement in:

❌ Component organization and reusability
❌ State management complexity
❌ Data loading efficiency
❌ Type safety and testing
❌ Error handling and recovery

The recommendations above provide a clear path forward for a cleaner, more maintainable rebuild while preserving the core functionality that works well.

---

**Document Status**: Complete - Ready for rebuild planning
**Last Updated**: 2025-10-03
**Total Components Documented**: 50+
**Total Event Types**: 6
**Total CLI Tools**: 11

