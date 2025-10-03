# Generative UI Implementation for CLI Tools

## Overview

This implementation provides **dynamic, generative UI components** that render based on the Claude Agent's usage of different CLI tools. Each tool type gets its own specialized, beautiful UI component that streams in real-time.

## Architecture

### 1. Backend Stream Processing (`agent_service/app.py`)

**Key Features:**
- **CLI Tool Detection**: Automatically detects which CLI tool is being invoked from Bash commands
- **Metadata Extraction**: Parses JSON inputs from echo commands to extract ticker, fields, and other params
- **Structured Events**: Emits rich, structured events with `cli_tool`, `metadata`, and `tool_id` for tracking

**Flow:**
```
ToolUseBlock → _detect_cli_tool_type() → _extract_cli_metadata() → yield tool-start event
↓
Tool executes...
↓
ToolResultBlock → yield tool-result event with full context
```

**Event Format:**
```json
{
  "type": "data",
  "event": "agent.tool-start",
  "tool_id": "toolu_xyz",
  "tool": "Bash",
  "cli_tool": "mf-market-get",
  "metadata": {
    "ticker": "TSLA",
    "fields": ["prices", "fundamentals", ...],
    "description": "Fetch comprehensive TSLA market data"
  }
}
```

### 2. API Route Handler (`frontend/app/api/chat/route.ts`)

**Key Features:**
- **Tool Call Tracking**: Maintains a map of active tool calls to match starts with results
- **AI SDK Data Annotations**: Formats events as `2:[{...}]\n` for AI SDK compatibility
- **Complete Context**: Combines tool-start metadata with tool-result data for rich UI rendering

**Stream Format:**
```
Text:        0:"Agent text here"\n
Data:        2:[{"type":"data","event":"agent.tool-start",...}]\n
```

### 3. Specialized UI Components

#### MarketDataCard (`components/cards/MarketDataCard.tsx`)
- **For**: `mf-market-get` CLI tool
- **Shows**: 
  - Ticker badge
  - Fields being fetched
  - Metrics (time, size, fields count)
  - Clickable file list to open in workspace viewer
- **Design**: Blue gradient with 📊 icon

#### ValuationCard (`components/cards/ValuationCard.tsx`)
- **For**: `mf-valuation-basic-dcf` CLI tool
- **Shows**:
  - DCF value vs current price
  - Upside/downside percentage (color-coded)
  - Valuation summary
- **Design**: Purple gradient with 💰 icon

#### CalculationCard (`components/cards/CalculationCard.tsx`)
- **For**: `mf-calc-simple`, `mf-estimates-get`
- **Shows**:
  - Calculation summary
  - JSON data with syntax highlighting
- **Design**: Green gradient with 🧮 icon

#### GenericToolCard (Fallback)
- **For**: Any unrecognized tool
- **Shows**: Generic JSON payload display

### 4. Frontend Orchestration (`frontend/app/page.tsx`)

**Key Features:**
- **Tool State Management**: Tracks loading → result transitions per tool_id
- **Dynamic Routing**: Routes to specialized components based on `cli_tool` type
- **Real-time Updates**: Uses `useEffect` to rebuild tool states as data streams in
- **Progressive Rendering**: Shows loading state immediately, then updates with results

**Component Selection Logic:**
```typescript
switch (cli_tool) {
  case 'mf-market-get': return <MarketDataCard ... />
  case 'mf-valuation-basic-dcf': return <ValuationCard ... />
  case 'mf-calc-simple': return <CalculationCard ... />
  default: return <GenericToolCard ... />
}
```

## How It Works: Complete Flow

### Example: "Fetch TSLA data"

1. **Agent calls tool:**
   ```bash
   echo '{"ticker":"TSLA",...}' | /path/to/mf-market-get
   ```

2. **Backend detects and emits:**
   ```json
   {
     "event": "agent.tool-start",
     "cli_tool": "mf-market-get",
     "metadata": {"ticker": "TSLA", "fields": [...]}
   }
   ```

3. **Frontend receives data annotation:**
   - Route handler formats as: `2:[{...}]\n`
   - `useChat` hook captures in `data` array

4. **UI updates immediately:**
   - `toolStates` tracks: `{tool_xyz: {cli_tool: "mf-market-get", isLoading: true}}`
   - Renders `<MarketDataCard isLoading={true} ticker="TSLA" />`
   - Shows animated loading dots

5. **Tool completes:**
   ```json
   {
     "event": "agent.tool-result",
     "cli_tool": "mf-market-get",
     "result": {
       "ok": true,
       "paths": [...],
       "metrics": {"t_ms": 30836, "bytes": 526894}
     }
   }
   ```

6. **UI updates with results:**
   - `toolStates` updates: `{isLoading: false, result: {...}}`
   - Card shows metrics, file list, all interactive

## Benefits

### For Users
- **Visual clarity**: Each tool type has distinct, recognizable UI
- **Real-time feedback**: See tools running with loading indicators
- **Interactive results**: Click files to view in workspace, explore data
- **Professional appearance**: Gradient cards, icons, metrics

### For Developers
- **Extensible**: Add new CLI tools by:
  1. Adding detection pattern to `_detect_cli_tool_type()`
  2. Creating new card component
  3. Adding case to `renderToolCard()` switch
- **Type-safe**: TypeScript ensures props match across components
- **Debuggable**: Console logs show tool state transitions

## Adding New CLI Tools

### Step 1: Backend Detection
```python
# agent_service/app.py
def _detect_cli_tool_type(tool_name: str, tool_args: Dict[str, Any]) -> str:
    command = tool_args.get("command", "")
    if "mf-my-new-tool" in command:
        return "mf-my-new-tool"
    # ...
```

### Step 2: Create UI Component
```tsx
// components/cards/MyNewToolCard.tsx
export default function MyNewToolCard({ toolId, metadata, result, isLoading }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4">
      {/* Your custom UI */}
    </div>
  )
}
```

### Step 3: Route to Component
```tsx
// app/page.tsx
case 'mf-my-new-tool':
  return <MyNewToolCard key={idx} {...props} />
```

## Testing

To test with TSLA data:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Get market data for TSLA"}]}'
```

Or use the UI:
1. Start backend: `uvicorn agent_service.app:app --reload --port 5051`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:3000
4. Type: "Get market data for TSLA"

## Technical Details

### AI SDK Data Annotations
The Vercel AI SDK supports streaming custom metadata alongside text using **data annotations**:
- Format: `2:[{...json...}]\n` (code `2` = data annotation)
- Captured in `useChat` hook's `data` array
- Separate from message `content`

### Tool Call Tracking
We maintain a stateful map to correlate tool starts with results:
```typescript
toolCallMap.set(tool_id, {cli_tool, metadata})
// ... later ...
const info = toolCallMap.get(tool_id)
yield {event: "tool-result", ...info, result}
```

### Progressive Enhancement
- Components render immediately in loading state
- Update in-place when results arrive
- No full re-render, smooth UX

## Future Enhancements

1. **Error States**: Specialized error UI for each tool type
2. **Animations**: Stagger file list, slide-in metrics
3. **Charts**: Inline visualization for price/growth data
4. **History**: Show previous tool calls in session
5. **Tool Chaining**: Visual flow when tools call other tools
6. **Favorites**: Pin frequently used tickers/tools

## References

- **AI SDK Docs**: https://sdk.vercel.ai/docs/reference/ai-sdk-rsc
- **Claude Agent SDK**: https://docs.claude.com/en/api/agent-sdk
- **Tool Hooks**: PreToolUse, PostToolUse for extended metadata

