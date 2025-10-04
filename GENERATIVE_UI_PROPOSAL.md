# Generative UI/UX Proposal - Finance Agent Chat Interface

**Date**: October 3, 2025  
**Status**: Proposal for Review  
**Purpose**: Define comprehensive UX/UI for agent tool execution visualization

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Research Findings](#research-findings)
3. [Core Design Principles](#core-design-principles)
4. [Tool Execution Lifecycle](#tool-execution-lifecycle)
5. [Component Architecture](#component-architecture)
6. [Detailed UX Patterns](#detailed-ux-patterns)
7. [Implementation Strategy](#implementation-strategy)
8. [Technical Stack](#technical-stack)
9. [Examples & Mockups](#examples--mockups)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### The Problem

Users need **transparent visibility** into what the AI agent is doing at every moment:
- What tool is being called?
- What arguments were passed?
- Is it loading? How long will it take?
- Did it succeed or fail?
- What data was returned?
- Can I explore the results?

### The Solution

A **progressive, streaming UI** that shows:
1. **Immediate feedback** - Tool call appears instantly with arguments
2. **Loading states** - Animated indicators showing active execution
3. **Progressive results** - Data streams in as it becomes available
4. **Rich visualization** - Appropriate UI for each tool type
5. **Exploration** - Clickable paths, expandable sections, workspace integration

### Key Innovations

✨ **Stream-Native Design** - UI updates in real-time as events arrive  
✨ **Tool-Aware Components** - Each tool gets specialized visualization  
✨ **Progressive Disclosure** - Start simple, expand on demand  
✨ **Workspace Integration** - Seamless file browsing and exploration  
✨ **Status Transparency** - Always clear what's happening and why

---

## Research Findings

### From AI SDK Documentation

**Vercel AI SDK provides**:
- ✅ `useChat` hook with `parts` property for structured messages
- ✅ `isLoading` state for showing loading indicators
- ✅ Data annotations for streaming tool events
- ✅ Support for progressive UI updates

**AI SDK RSC (Experimental)**:
- ✅ `streamUI` for server-side component streaming
- ✅ Generator functions for progressive rendering
- ✅ `createStreamableUI` for granular control
- ⚠️ Experimental, recommend using AI SDK UI for production

### From shadcn-ui Patterns

**Loading States**:
- Simple `Skeleton` component using `animate-pulse`
- Composable primitives: `<Skeleton className="h-4 w-[250px]" />`
- Theme-aware with `bg-muted`
- Build custom skeletons by composing primitives

### From UX Research

**7 Essential AI Agent UX Patterns** (from Exalt Studio):
1. **Transparent Process Visualization** - Show what the agent is doing
2. **Progressive Disclosure** - Don't overwhelm with details
3. **Contextual Feedback** - Right info at right time
4. **Error Recovery** - Clear paths when things fail
5. **Trust Building** - Show sources and reasoning
6. **Controllability** - Let users pause/stop/retry
7. **Learn from Interactions** - Improve over time

**Key Insight**: Users need to **feel in control** even when the AI is working autonomously.

### From Claude Agent SDK

**Built-in Tools**:
- `Bash` - Command execution (our primary tool for CLI calls)
- `Read` - File reading
- `Write` - File writing
- `List` - Directory listing
- `Glob` - Pattern matching
- `Grep` - Text search
- `WebFetch` - Fetch web content
- `WebSearch` - Web search

**Our Custom CLI Tools** (11 tools via Bash):
- `mf-market-get` - Market data (38 data types!)
- `mf-estimates-get` - Analyst estimates
- `mf-documents-get` - SEC filings
- `mf-filing-extract` - Extract/search filings
- `mf-qa` - Document Q&A
- `mf-calc-simple` - Calculations
- `mf-valuation-basic-dcf` - DCF valuation
- `mf-doc-diff` - Document comparison
- `mf-extract-json` - JSON extraction
- `mf-json-inspect` - JSON schema preview
- `mf-report-save` - Save reports

### From CLI Tool Analysis

**Universal JSON Contract**:
```json
{
  "ok": true,
  "result": {
    "quote": "/path/to/quote.json",
    "profile": "/path/to/profile.json"
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

**Key Insight**: Every tool returns consistent structure, making UI patterns reusable.

---

## Core Design Principles

### 1. **Progressive Transparency**

Show information as it becomes available, not all at once.

```
Step 1: Tool call appears       → "🔧 Fetching market data for AAPL..."
Step 2: Execution starts        → "⏳ Calling FMP API..."
Step 3: Progress updates        → "📊 Processing 3 of 5 fields..."
Step 4: Results arrive          → "✓ Quote data loaded"
Step 5: Visualization renders   → [Interactive card with data]
```

### 2. **Contextual Clarity**

Every piece of UI should answer: "What's happening and why?"

- Tool name + icon (what)
- Arguments/parameters (with what)
- Status indicator (current state)
- Time elapsed (how long)
- Result summary (outcome)

### 3. **Graceful Degradation**

From most to least ideal:
1. ✨ Rich, tool-specific visualization (best case)
2. 📊 Generic structured data view (good fallback)
3. 📝 Formatted JSON (readable minimum)
4. ⚠️ Error message with recovery options (failure case)

### 4. **Workspace-First**

Everything saves to files. The UI should:
- Show file paths prominently
- Make them clickable to open workspace
- Preview content inline when helpful
- Support downloading/sharing

### 5. **Minimal Cognitive Load**

- Default to collapsed/compact views
- Expand on hover/click for details
- Use icons and colors for quick scanning
- Group related information
- Hide technical details unless requested

---

## Tool Execution Lifecycle

### Phase 1: Intent (0-50ms)

**What happens**: Agent decides to call a tool

**UI State**: Instant appearance of tool call card

**Show**:
- Tool icon + name
- Key arguments (ticker, fields, etc.)
- Status: "Preparing..."
- Subtle pulse animation

**Example**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ◌    │
│ Ticker: AAPL • Fields: quote, profile │
└────────────────────────────────────────┘
```

### Phase 2: Execution (50ms - 5s)

**What happens**: Tool is running, waiting for response

**UI State**: Animated loading indicators

**Show**:
- Active animation (spinning, pulsing, progress bar)
- Status message: "Fetching from FMP..."
- Elapsed time counter
- Optional: Cancel button

**Example**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ● 2.1s│
│ Ticker: AAPL • Fields: quote, profile │
│ ┌────────────────────────────────────┐ │
│ │ ⏳ Calling FMP API...              │ │
│ │ [████████░░░░░░░░] 45%             │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Phase 3: Processing (0-2s)

**What happens**: Data received, parsing/saving to workspace

**UI State**: Processing indicator

**Show**:
- Status: "Processing results..."
- If multiple items: "2 of 5 complete"
- Checkmarks for completed items

**Example**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ● 3.4s│
│ Ticker: AAPL • Fields: quote, profile │
│ ┌────────────────────────────────────┐ │
│ │ ⚡ Processing data...              │ │
│ │ ✓ quote.json saved                 │ │
│ │ ⏳ Processing profile...           │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Phase 4: Complete (permanent)

**What happens**: Tool finished successfully

**UI State**: Collapsed result card + expandable details

**Show**:
- Success indicator
- Summary metrics (time, size, count)
- Key data points
- Expand button for full view
- File path links

**Example (Collapsed)**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ✓ 4.2s│
│ AAPL • 2 fields • 4.2KB                │
│ 💹 $246.43 +0.89 ↑0.36%                │
│ 🏢 Apple Inc. • Tech • $3.8T          │
│                           [Show More ▼]│
└────────────────────────────────────────┘
```

**Example (Expanded)**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ✓ 4.2s│
│ AAPL • 2 fields • 4.2KB                │
├────────────────────────────────────────┤
│ 💹 Current Quote                       │
│ ┌────────────────────────────────────┐ │
│ │ Price: $246.43                     │ │
│ │ Change: +$0.89 (↑0.36%)           │ │
│ │ Volume: 52.3M                      │ │
│ │ Mkt Cap: $3.8T                     │ │
│ └────────────────────────────────────┘ │
│                                        │
│ 🏢 Company Profile                     │
│ ┌────────────────────────────────────┐ │
│ │ Name: Apple Inc.                   │ │
│ │ Industry: Technology Hardware      │ │
│ │ CEO: Tim Cook                      │ │
│ │ Employees: 164,000                 │ │
│ └────────────────────────────────────┘ │
│                                        │
│ 📁 Files Created                       │
│ • data/market/AAPL/quote.json         │
│ • data/market/AAPL/profile.json       │
│                           [Show Less ▲]│
└────────────────────────────────────────┘
```

### Phase 5: Error (if failed)

**What happens**: Tool execution failed

**UI State**: Error card with recovery options

**Show**:
- Error icon + type
- Error message (user-friendly)
- Technical details (collapsible)
- Retry button
- Alternative actions

**Example**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ✗ 2.1s│
│ AAPL • 2 fields                        │
├────────────────────────────────────────┤
│ ⚠️ API Request Failed                  │
│                                        │
│ The FMP API returned an error. This   │
│ might be due to rate limiting or an    │
│ invalid ticker symbol.                 │
│                                        │
│ [Retry] [Try Different Ticker] [Skip] │
│                                        │
│ Technical Details ▼                    │
│ ┌────────────────────────────────────┐ │
│ │ Error: 429 Too Many Requests       │ │
│ │ Hint: Wait 60s or upgrade API plan│ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## Component Architecture

### Hierarchical Structure

```
components/
├── agent/
│   ├── ToolExecutionFlow.tsx       # Main container for tool chain
│   ├── ToolCard.tsx                # Base tool card (all phases)
│   └── AgentMessage.tsx            # Agent text responses
│
├── tool-cards/
│   ├── base/
│   │   ├── ToolHeader.tsx          # Icon, name, status, time
│   │   ├── ToolBody.tsx            # Content area
│   │   ├── ToolFooter.tsx          # Actions, files, metadata
│   │   └── ToolSkeleton.tsx        # Loading placeholder
│   │
│   ├── phases/
│   │   ├── IntentCard.tsx          # Phase 1: Show tool call intent
│   │   ├── ExecutionCard.tsx       # Phase 2: Loading animation
│   │   ├── ProcessingCard.tsx      # Phase 3: Processing indicator
│   │   ├── ResultCard.tsx          # Phase 4: Success view
│   │   └── ErrorCard.tsx           # Phase 5: Error handling
│   │
│   └── tool-specific/
│       ├── MarketDataResult.tsx    # mf-market-get visualization
│       ├── ValuationResult.tsx     # mf-valuation-basic-dcf
│       ├── CalculationResult.tsx   # mf-calc-simple
│       ├── QAResult.tsx            # mf-qa
│       ├── EstimatesResult.tsx     # mf-estimates-get
│       ├── FilingResult.tsx        # mf-filing-extract
│       └── GenericResult.tsx       # Fallback for unknown tools
│
├── visualizations/
│   ├── Skeleton.tsx                # Pulse loading skeleton
│   ├── ProgressBar.tsx             # Linear/circular progress
│   ├── StatusBadge.tsx             # Tool status indicator
│   ├── MetricDisplay.tsx           # Time, size, count metrics
│   ├── DataTable.tsx               # Tabular data
│   ├── Sparkline.tsx               # Mini charts
│   └── FilePathLink.tsx            # Clickable workspace paths
│
└── workspace/
    ├── WorkspacePanel.tsx          # Resizable sidebar (existing)
    ├── FileTree.tsx                # File browser (existing)
    ├── FileViewer.tsx              # File content display (existing)
    └── QuickPreview.tsx            # Inline hover preview (new)
```

### State Machine for Tool Cards

```typescript
type ToolPhase = 
  | 'intent'      // Tool call received, args visible
  | 'executing'   // Tool running, loading animation
  | 'processing'  // Data received, parsing
  | 'complete'    // Success, show results
  | 'error'       // Failed, show error

type ToolState = {
  phase: ToolPhase
  toolId: string
  toolName: string          // "mf-market-get"
  displayName: string       // "Market Data"
  icon: string              // "📊"
  args: Record<string, any> // Tool arguments
  metadata: {
    ticker?: string
    fields?: string[]
    // ... tool-specific
  }
  
  // Execution state
  startTime: number
  elapsed: number
  progress?: number         // 0-100 if available
  status: string           // "Fetching from FMP..."
  
  // Result state
  result?: ToolResult
  error?: ToolError
  
  // UI state
  isExpanded: boolean
  isHovered: boolean
}
```

---

## Detailed UX Patterns

### Pattern 1: Tool Call Card

**Purpose**: Show that a tool is being called with specific arguments

**Visual Design**:
- Compact horizontal card (~60px height)
- Left: Icon + tool name
- Center: Key arguments (ticker, fields, etc.)
- Right: Status indicator + elapsed time
- Border color matches tool type
- Subtle shadow for depth

**States**:
- **Idle**: Light background, subtle border
- **Active**: Pulsing border, animated icon
- **Complete**: Green accent, checkmark
- **Error**: Red accent, X icon

**Interaction**:
- Click to expand/collapse
- Hover shows tooltip with full arguments
- Right-click for context menu (copy, retry, etc.)

**Code Structure**:
```tsx
<ToolCallCard
  tool="mf-market-get"
  args={{ ticker: "AAPL", fields: ["quote", "profile"] }}
  status="executing"
  elapsed={2100}
  onExpand={() => setExpanded(true)}
/>
```

### Pattern 2: Loading Animation

**Purpose**: Show active execution with time feedback

**Options by Tool Type**:

**Fast tools (<1s expected)**:
- Simple spinner
- "Processing..." text
- No progress bar needed

**Medium tools (1-5s expected)**:
- Indeterminate progress bar
- Status message
- Elapsed time counter

**Slow tools (>5s expected)**:
- Determinate progress bar (if possible)
- Multi-step status messages
- Elapsed time + estimated remaining
- Cancel button

**Progressive Status Messages**:
```
0.0s: "Preparing request..."
0.5s: "Calling FMP API..."
2.0s: "Receiving data..."
3.0s: "Processing fields..."
4.0s: "Saving to workspace..."
4.5s: "Complete!"
```

**Visual**:
```tsx
<ExecutionCard>
  <StatusMessage>
    {elapsed < 500 && "Preparing request..."}
    {elapsed >= 500 && elapsed < 2000 && "Calling FMP API..."}
    {elapsed >= 2000 && "Processing data..."}
  </StatusMessage>
  
  <ProgressBar 
    indeterminate={progress === undefined}
    value={progress}
  />
  
  <TimeDisplay>{formatElapsed(elapsed)}</TimeDisplay>
  
  {elapsed > 3000 && (
    <CancelButton onClick={handleCancel}>Cancel</CancelButton>
  )}
</ExecutionCard>
```

### Pattern 3: Result Visualization

**Purpose**: Show tool output in most useful format

**Strategy: Progressive Disclosure**

**Level 1: Summary (Default, Collapsed)**
- Show ONLY the most important data
- 1-3 key metrics
- No scrolling needed
- Fits in ~100-150px height

**Example - Market Data**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data             ✓ 4.2s • 4KB│
│ AAPL • 2 fields                        │
│ 💹 $246.43 +0.89 ↑0.36%                │
│ 🏢 Apple Inc.                 [More ▼] │
└────────────────────────────────────────┘
```

**Level 2: Details (Hover/Expand)**
- Show all fetched data
- Organized sections
- Still formatted, not raw
- ~300-500px height

**Example - Market Data Expanded**:
```
┌────────────────────────────────────────┐
│ 📊 Market Data             ✓ 4.2s • 4KB│
│ AAPL • 2 fields                        │
├────────────────────────────────────────┤
│ 💹 Quote                               │
│   Price: $246.43 | Change: +$0.89     │
│   High: $248.12 | Low: $245.67        │
│   Volume: 52.3M | Avg Vol: 58.1M      │
│   Mkt Cap: $3.8T | P/E: 32.4          │
│                                        │
│ 🏢 Profile                             │
│   Name: Apple Inc.                     │
│   Industry: Consumer Electronics       │
│   CEO: Tim Cook                        │
│   Employees: 164,000                   │
│   Founded: 1976 | HQ: Cupertino, CA   │
│                                        │
│ 📁 Files (2)                           │
│   • data/market/AAPL/quote.json       │
│   • data/market/AAPL/profile.json     │
│                                        │
│                            [Less ▲]    │
└────────────────────────────────────────┘
```

**Level 3: Raw Data (On Demand)**
- Show complete JSON
- Syntax highlighting
- Copy button
- Hidden by default

**Tool-Specific Visualizations**:

**mf-market-get** → Metric cards + sparklines
**mf-valuation-basic-dcf** → Scenario tabs + waterfall chart
**mf-calc-simple** → Comparison table + trend indicators
**mf-qa** → Q&A format with sources
**mf-estimates-get** → Timeline with consensus ranges
**mf-filing-extract** → Sectioned text with highlights

### Pattern 4: Workspace Integration

**Purpose**: Make file exploration seamless

**File Path Display**:
- Always show relative path from workspace root
- Use monospace font
- Icon prefix (📄 for file, 📁 for folder)
- Click to open in workspace panel
- Hover for full path tooltip

**Quick Preview (New Feature)**:
- Hover over file path for 500ms
- Show tooltip with file preview:
  - JSON: First 10 lines, formatted
  - Text: First 200 chars
  - Image: Thumbnail
- Click "Open in Workspace" to expand panel

**Workspace Panel Enhancements**:
- Auto-scroll to relevant file when clicked
- Highlight recently created files
- Show timestamp and size
- Syntax highlighting for all formats

### Pattern 5: Error Handling

**Purpose**: Turn failures into learning opportunities

**Error Card Structure**:

1. **Error Type** (prominent)
   - API Error
   - Network Error
   - Validation Error
   - Timeout Error

2. **User-Friendly Message** (clear)
   - What went wrong
   - Why it might have happened
   - What to do next

3. **Recovery Options** (actionable)
   - Retry button
   - Modify parameters
   - Skip this step
   - Get help

4. **Technical Details** (collapsible)
   - Error code
   - Stack trace (if available)
   - API response
   - Hint from tool

**Example**:
```tsx
<ErrorCard
  type="API Error"
  message="Unable to fetch market data for AAPL"
  cause="The FMP API returned a 429 error (rate limit exceeded)"
  recovery={[
    { label: "Retry in 60s", action: scheduleRetry },
    { label: "Try different ticker", action: promptNewTicker },
    { label: "Skip", action: skip }
  ]}
  technicalDetails={{
    errorCode: "429",
    hint: "Wait 60 seconds or upgrade API plan",
    response: {...}
  }}
/>
```

### Pattern 6: Multi-Tool Coordination

**Purpose**: Show relationships between sequential tool calls

**Timeline View**:
```
Step 1  [✓ Market Data]  4.2s
  ↓
Step 2  [✓ Extract JSON] 0.3s
  ↓
Step 3  [⏳ Calculation]  1.8s...
  ↓
Step 4  [○ Valuation]     Waiting...
```

**When to Show**:
- Only when agent uses 3+ tools in sequence
- Collapsible by default
- Auto-expands if step fails

**Visual Design**:
- Vertical timeline with arrows
- Each step is mini card
- Currently executing step is highlighted
- Completed steps show checkmark + time
- Future steps are grayed out

### Pattern 7: Parallel Tool Execution

**Purpose**: Show multiple tools running simultaneously

**Horizontal Grid**:
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 📊 Market Data   │ │ 📈 Estimates     │ │ 📄 Filing        │
│ ⏳ 2.1s...       │ │ ⏳ 1.8s...       │ │ ⏳ 3.4s...       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

**Behavior**:
- Cards appear side by side
- All animate simultaneously
- Complete independently
- Group under "Parallel Tasks" header

---

## Implementation Strategy

### Phase 1: Core Foundation (Week 1)

**Goal**: Get basic tool visualization working

**Tasks**:
1. Create base `ToolCard` component with phase state machine
2. Implement `ToolHeader`, `ToolBody`, `ToolFooter` primitives
3. Build `Skeleton`, `ProgressBar`, `StatusBadge` components
4. Wire up streaming from backend to ToolCard state
5. Test with single tool execution

**Success Criteria**:
- Tool call appears instantly
- Loading animation works
- Result displays (even if generic)

### Phase 2: Tool-Specific Views (Week 2)

**Goal**: Beautiful visualizations for each tool

**Tasks**:
1. Create tool result components:
   - `MarketDataResult`
   - `ValuationResult`
   - `CalculationResult`
   - `QAResult`
   - `GenericResult` (fallback)
2. Implement expand/collapse behavior
3. Add workspace file path clicking
4. Style with consistent design system

**Success Criteria**:
- Each tool type has custom visualization
- Expand/collapse works smoothly
- File paths are clickable

### Phase 3: Progressive Enhancement (Week 3)

**Goal**: Add advanced UX features

**Tasks**:
1. Implement progressive status messages during execution
2. Add hover previews for file paths
3. Build multi-tool timeline view
4. Add parallel tool execution visualization
5. Implement error recovery flows

**Success Criteria**:
- Users get real-time status updates
- Hover shows quick previews
- Multi-step flows are clear
- Errors offer recovery options

### Phase 4: Polish & Performance (Week 4)

**Goal**: Production-ready quality

**Tasks**:
1. Add animations and transitions
2. Implement keyboard navigation
3. Optimize rendering performance
4. Add accessibility features (ARIA labels, etc.)
5. Write component tests

**Success Criteria**:
- Smooth 60fps animations
- Keyboard navigation works
- Accessibility audit passes
- Test coverage >80%

---

## Technical Stack

### Frontend Framework

**Next.js 14+ with App Router**
- Server Actions for streaming
- React Server Components where beneficial
- Client components for interactivity

### AI SDK Integration

**Vercel AI SDK UI (Production)**
```tsx
import { useChat } from 'ai/react';

const { messages, data, isLoading } = useChat({
  api: '/api/chat',
  onToolCall: ({ toolCall }) => {
    // Track tool execution
    setToolState({
      phase: 'intent',
      toolName: toolCall.toolName,
      args: toolCall.args,
    });
  }
});
```

**Stream Processing**:
```tsx
// In page.tsx
useEffect(() => {
  data?.forEach((event) => {
    if (event.type === 'tool-start') {
      updateToolState(event.tool_id, { phase: 'executing' });
    }
    else if (event.type === 'tool-result') {
      updateToolState(event.tool_id, { 
        phase: 'complete',
        result: event.result 
      });
    }
  });
}, [data]);
```

### UI Components

**shadcn/ui** - Base component library
- Button, Card, Badge, Tooltip
- Skeleton for loading states
- Collapsible for expand/collapse
- Tabs for scenario switching

**Custom Components**:
- Tool-specific result cards
- Workspace integration
- Timeline visualizations

### State Management

**Zustand** - For tool state
```tsx
import create from 'zustand';

const useToolStore = create((set) => ({
  tools: {},
  updateTool: (id, updates) => 
    set((state) => ({
      tools: {
        ...state.tools,
        [id]: { ...state.tools[id], ...updates }
      }
    })),
}));
```

### Animations

**Framer Motion** - For smooth transitions
```tsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="wait">
  {phase === 'executing' && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <ExecutionCard />
    </motion.div>
  )}
</AnimatePresence>
```

### Styling

**Tailwind CSS** - Utility-first styling
- Consistent spacing system
- Theme variables for colors
- Dark mode support (future)

---

## Examples & Mockups

### Example 1: Market Data Flow

**User**: "Get Apple stock data"

**Step 1: Intent (0ms)**
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ◌    │
│ Ticker: AAPL • Fields: quote, profile │
└────────────────────────────────────────┘
```

**Step 2: Executing (2.1s)**
```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ● 2.1s│
│ Ticker: AAPL • Fields: quote, profile │
│ ┌────────────────────────────────────┐ │
│ │ ⏳ Calling FMP API...              │ │
│ │ [████████████░░░░] 70%             │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Step 3: Complete (4.2s)**
```
┌────────────────────────────────────────┐
│ 📊 Market Data             ✓ 4.2s • 4KB│
│ AAPL • 2 fields                        │
│ 💹 $246.43 +0.89 ↑0.36%                │
│ 🏢 Apple Inc. • Tech                   │
│                           [Show More ▼]│
└────────────────────────────────────────┘
```

**Agent Text**:
```
Apple Inc. (AAPL) is currently trading at $246.43, up $0.89 
(+0.36%) today. The company is in the Technology Hardware 
industry with a market cap of $3.8 trillion.

The data has been saved to your workspace:
• data/market/AAPL/quote.json
• data/market/AAPL/profile.json

Would you like me to analyze the financial metrics or 
fetch additional data?
```

### Example 2: Multi-Step Valuation

**User**: "Run DCF valuation for Apple"

**Agent Plan** (visible timeline):
```
1. [⏳ Fetching fundamentals]       2.8s...
2. [○ Extract FCF values]          Waiting...
3. [○ Calculate DCF]               Waiting...
4. [○ Compare to price]            Waiting...
```

**After Step 1 Completes**:
```
1. [✓ Fetching fundamentals]       4.2s
2. [⏳ Extract FCF values]          0.3s...
3. [○ Calculate DCF]               Waiting...
4. [○ Compare to price]            Waiting...
```

**Final Result**:
```
┌────────────────────────────────────────┐
│ 💰 DCF Valuation          ✓ 12.3s • 8KB│
│ AAPL • 3 scenarios                     │
├────────────────────────────────────────┤
│ Scenario Selector:                     │
│ [Bear] [Base] [Bull]    ← Base selected│
│                                        │
│ Fair Value: $280.50                    │
│ Current Price: $246.43                 │
│                                        │
│ Upside: +13.8%                         │
│ ┌────────────────────────────────────┐ │
│ │        ┃▓▓▓▓▓▓▓▓▓▓▓▓▓┃              │ │
│ │  $246  ┃   $280      ┃  Market says │ │
│ │ Market ┃ Fair Value  ┃  undervalued │ │
│ └────────────────────────────────────┘ │
│                                        │
│ DCF Breakdown:                         │
│ Operating FCF: $140.2B                 │
│ Terminal Value: $89.8B                 │
│ Enterprise Value: $230.0B              │
│ Per Share: $280.50                     │
│                                        │
│ 📁 Files                               │
│ • analysis/tables/dcf_AAPL.json       │
│                           [Show Less ▲]│
└────────────────────────────────────────┘
```

### Example 3: Document Q&A

**User**: "What are Apple's main risk factors?"

**Agent Plan**:
```
1. [⏳ Get latest 10-K]             3.2s...
2. [○ Extract risk factors]        Waiting...
3. [○ Analyze risks]               Waiting...
```

**After extraction**:
```
┌────────────────────────────────────────┐
│ 💬 Document Q&A            ✓ 8.4s • 2.3KB│
│ Model: Haiku • Cost: $0.0234          │
├────────────────────────────────────────┤
│ Question:                              │
│ "What are Apple's main risk factors?"  │
│                                        │
│ Answer:                                │
│ Based on the 2024 10-K filing, Apple  │
│ identifies three primary risk factors:│
│                                        │
│ 1. Supply Chain Disruptions           │
│    The company relies on complex       │
│    global supply chains. Disruptions  │
│    could materially affect product    │
│    availability and costs.            │
│                                        │
│ 2. Competitive Pressure                │
│    The smartphone and PC markets are  │
│    highly competitive. New entrants   │
│    could reduce market share.         │
│                                        │
│ 3. Regulatory Changes                  │
│    Government regulations on privacy, │
│    antitrust, and app stores could    │
│    increase costs and limit business. │
│                                        │
│ 📊 Analysis Metrics                    │
│ • Chunks Analyzed: 3                   │
│ • Input Tokens: 7,832                  │
│ • Output Tokens: 234                   │
│ • Processing Time: 4.2s                │
│                                        │
│ 📁 Sources                             │
│ • data/sec/AAPL/2024-09-28/10-K/...   │
│   sections/risk_factors.txt           │
│ • analysis/qa/risk_analysis_...json   │
│                           [Show Less ▲]│
└────────────────────────────────────────┘
```

### Example 4: Error with Recovery

**User**: "Get market data for INVALID"

```
┌────────────────────────────────────────┐
│ 📊 Market Data                    ✗ 1.2s│
│ Ticker: INVALID • Fields: quote        │
├────────────────────────────────────────┤
│ ⚠️ Ticker Not Found                    │
│                                        │
│ The ticker symbol "INVALID" was not    │
│ found in the FMP database. Please      │
│ check the spelling and try again.      │
│                                        │
│ Suggestions:                           │
│ • Try a different ticker (e.g. AAPL)  │
│ • Search for company name first        │
│ • Check if it's a valid US ticker      │
│                                        │
│ [Try Again] [Search Companies] [Skip]  │
│                                        │
│ Technical Details ▼                    │
│ ┌────────────────────────────────────┐ │
│ │ Error: 404 Not Found               │ │
│ │ Endpoint: /quote/INVALID           │ │
│ │ Hint: Verify ticker symbol exists  │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## Future Enhancements

### Version 2 Features

**1. Agent Reasoning Bubble** (like Claude.ai)
- Show agent's thought process
- "I need to fetch fundamentals first, then calculate growth rates..."
- Collapsible, appears before tool calls

**2. Tool Suggestions**
- "Based on this data, you might want to:"
- Quick action buttons for common next steps
- "Compare to peers", "Calculate metrics", etc.

**3. Workspace Snapshots**
- Save current workspace state
- Restore previous sessions
- Share workspace with others

**4. Custom Dashboards**
- Pin important tool results
- Arrange cards in custom layout
- Create reusable templates

**5. Voice Narration** (accessibility)
- Screen reader for tool execution
- Audio feedback for completion
- Voice commands for navigation

### Version 3 Features

**1. Collaborative Features**
- Share chat sessions
- Annotate results
- Team workspaces

**2. Advanced Visualizations**
- Interactive charts (D3.js)
- 3D visualizations for complex data
- Animated transitions between states

**3. AI-Powered Insights**
- Auto-detect anomalies
- Suggest follow-up questions
- Predictive analytics

**4. Mobile Optimization**
- Touch-friendly interfaces
- Mobile-specific layouts
- Offline support

---

## Success Metrics

### User Experience Metrics

**Transparency**:
- ✅ Users can always see what tool is running
- ✅ Users can see arguments passed to tools
- ✅ Users get real-time status updates
- ✅ Users see clear success/failure indicators

**Performance Perception**:
- Target: Users feel response is fast even when tool takes 5+ seconds
- Measure: Time to first visual feedback (<100ms)
- Measure: Progress updates every 500ms

**Discoverability**:
- Target: Users can find file paths easily
- Target: Users understand how to expand for more details
- Target: Users can navigate workspace without training

**Error Recovery**:
- Target: <10% of errors result in user giving up
- Target: >80% of errors offer actionable recovery
- Measure: Error recovery success rate

### Technical Metrics

**Performance**:
- Page load: <2s
- Time to interactive: <3s
- Streaming delay: <100ms
- Frame rate: 60fps during animations

**Reliability**:
- Uptime: >99.9%
- Stream errors: <0.1%
- Tool state accuracy: >99.5%

**Accessibility**:
- WCAG 2.1 AA compliance
- Keyboard navigation: 100% coverage
- Screen reader compatibility

---

## Conclusion

This proposal defines a **comprehensive, user-first approach** to visualizing AI agent tool execution. The design prioritizes:

1. **Transparency** - Users always know what's happening
2. **Progressive disclosure** - Start simple, expand on demand
3. **Beautiful design** - Modern, polished, professional
4. **Tool awareness** - Each tool gets appropriate visualization
5. **Workspace integration** - Seamless file exploration

The implementation is **phased and realistic**, with clear milestones and success criteria. The technical stack leverages proven libraries (AI SDK, shadcn-ui, Framer Motion) while allowing for custom innovation where needed.

Most importantly, this approach **learns from research**: UX patterns from leading AI interfaces, streaming patterns from Vercel AI SDK, and shadcn-ui's composable design philosophy.

---

## Next Steps

1. **Review this proposal** - Validate approach and priorities
2. **Refine based on feedback** - Adjust patterns, components, timeline
3. **Create design mockups** - High-fidelity Figma designs
4. **Begin Phase 1 implementation** - Build core foundation
5. **Iterate based on testing** - User feedback drives improvements

---

**Document Status**: Ready for Review  
**Author**: AI Assistant  
**Date**: October 3, 2025  
**Version**: 1.0

